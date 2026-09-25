import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type DepositEntryType, type RentalPaymentEntryType, type RentalPaymentMethod } from '@prisma/client';
import type { Actor } from '../identity/auth.types';
import { PrismaService } from '../../infra/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getReservationLedger(actor: Actor, reservationId: string) {
    const businessId = this.businessId(actor);
    const reservation = await this.prisma.reservation.findFirst({ where: { id: reservationId, businessId }, select: { id: true, currency: true } });
    if (!reservation) throw new NotFoundException('Reservation was not found.');
    const [payments, deposits, paymentTotal, depositGroups] = await Promise.all([
      this.prisma.rentalPaymentEntry.findMany({ where: { businessId, reservationId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.depositLedgerEntry.findMany({ where: { businessId, reservationId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.rentalPaymentEntry.groupBy({ by: ['type'], where: { businessId, reservationId }, _sum: { amountMinor: true } }),
      this.prisma.depositLedgerEntry.groupBy({ by: ['type'], where: { businessId, reservationId }, _sum: { amountMinor: true } }),
    ]);
    const amountFor = (type: DepositEntryType) => depositGroups.find((entry) => entry.type === type)?._sum.amountMinor ?? 0;
    const paymentAmountFor = (type: RentalPaymentEntryType) => paymentTotal.find((entry) => entry.type === type)?._sum.amountMinor ?? 0;
    const paymentTotalMinor = paymentAmountFor('RECEIVED') - paymentAmountFor('REFUNDED');
    const depositHeldMinor = amountFor('COLLECTED') - amountFor('REFUNDED') - amountFor('RETAINED');
    return { currency: reservation.currency, payments, deposits, paymentTotalMinor, depositHeldMinor };
  }

  async recordPayment(actor: Actor, reservationId: string, input: { type: RentalPaymentEntryType; amountMinor: number; method: RentalPaymentMethod; reference?: string; note?: string }) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; currency: string; status: string }>>(Prisma.sql`SELECT "id", "currency", "status" FROM "Reservation" WHERE "id" = ${reservationId} AND "businessId" = ${businessId} FOR UPDATE`);
      const reservation = locked[0];
      if (!reservation) throw new NotFoundException('Reservation was not found.');
      if (['CANCELLED', 'DECLINED', 'NO_SHOW', 'EXPIRED'].includes(reservation.status)) throw new ConflictException('A payment cannot be recorded against a closed reservation.');
      if (input.type === 'REFUNDED') {
        const totals = await tx.rentalPaymentEntry.groupBy({ by: ['type'], where: { businessId, reservationId }, _sum: { amountMinor: true } });
        const received = totals.find((item) => item.type === 'RECEIVED')?._sum.amountMinor ?? 0;
        const refunded = totals.find((item) => item.type === 'REFUNDED')?._sum.amountMinor ?? 0;
        if (input.amountMinor > received - refunded) throw new ConflictException('A refund cannot be greater than the payment balance received.');
      }
      const entry = await tx.rentalPaymentEntry.create({ data: { businessId, reservationId, type: input.type, amountMinor: input.amountMinor, currency: reservation.currency, method: input.method, reference: clean(input.reference), note: clean(input.note), recordedById: actor.userId } });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: input.type === 'REFUNDED' ? 'RENTAL_PAYMENT_REFUNDED' : 'RENTAL_PAYMENT_RECORDED', entityType: 'Reservation', entityId: reservationId, metadata: { entryId: entry.id, amountMinor: entry.amountMinor, currency: entry.currency, method: entry.method } } });
      return entry;
    });
  }

  async recordDeposit(actor: Actor, reservationId: string, input: { type: DepositEntryType; amountMinor: number; reason: string }) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; depositMinor: number; currency: string; status: string }>>(Prisma.sql`SELECT "id", "depositMinor", "currency", "status" FROM "Reservation" WHERE "id" = ${reservationId} AND "businessId" = ${businessId} FOR UPDATE`);
      const reservation = locked[0];
      if (!reservation) throw new NotFoundException('Reservation was not found.');
      if (['CANCELLED', 'DECLINED', 'NO_SHOW', 'EXPIRED'].includes(reservation.status)) throw new ConflictException('A deposit cannot be changed for a closed reservation.');
      const grouped = await tx.depositLedgerEntry.groupBy({ by: ['type'], where: { businessId, reservationId }, _sum: { amountMinor: true } });
      const amountFor = (type: DepositEntryType) => grouped.find((entry) => entry.type === type)?._sum.amountMinor ?? 0;
      const held = amountFor('COLLECTED') - amountFor('REFUNDED') - amountFor('RETAINED');
      if (input.type === 'COLLECTED' && held + input.amountMinor > reservation.depositMinor) throw new BadRequestException('The collected deposit cannot exceed the reservation security deposit.');
      if (input.type !== 'COLLECTED' && input.amountMinor > held) throw new ConflictException('This amount is greater than the deposit currently held.');
      const entry = await tx.depositLedgerEntry.create({ data: { businessId, reservationId, type: input.type, amountMinor: input.amountMinor, currency: reservation.currency, reason: input.reason.trim(), recordedById: actor.userId } });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: `DEPOSIT_${input.type}`, entityType: 'Reservation', entityId: reservationId, metadata: { entryId: entry.id, amountMinor: entry.amountMinor, currency: entry.currency } } });
      return entry;
    });
  }

  private businessId(actor: Actor) {
    if (!actor.businessId) throw new ConflictException('Choose an active business workspace.');
    return actor.businessId;
  }
}

function clean(value?: string) { return value?.trim() || undefined; }
