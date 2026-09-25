import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type RentalStatus } from '@prisma/client';
import type { Actor } from '../identity/auth.types';
import { PrismaService } from '../../infra/prisma.service';

const detailSelect = {
  id: true, status: true, startAt: true, expectedReturnAt: true, actualReturnAt: true,
  dailyRateMinor: true, estimatedTotalMinor: true, depositMinor: true, currency: true,
  customerName: true, customerPhone: true, customerEmail: true, startOdometerKm: true,
  endOdometerKm: true, startFuelPercent: true, endFuelPercent: true, checkedOutAt: true,
  checkedInAt: true, notes: true, checkoutNotes: true, returnNotes: true, createdAt: true, updatedAt: true,
  reservation: { select: { id: true, status: true } },
  customer: { select: { id: true, verification: true } },
  vehicle: { select: { id: true, make: true, model: true, registrationNumber: true, odometerKm: true, condition: true } },
  pickupLocation: { select: { id: true, name: true } },
  dropoffLocation: { select: { id: true, name: true } },
  actualReturnLocation: { select: { id: true, name: true } },
} satisfies Prisma.RentalSelect;
const activeStatuses: RentalStatus[] = ['BOOKED', 'ACTIVE'];

@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) {}

  list(actor: Actor, status?: RentalStatus) {
    const businessId = this.businessId(actor);
    return this.prisma.rental.findMany({ where: { businessId, ...(status ? { status } : {}) }, select: detailSelect, orderBy: [{ expectedReturnAt: 'asc' }, { createdAt: 'desc' }], take: 100 });
  }

  returnLocations(actor: Actor) {
    const businessId = this.businessId(actor);
    return this.prisma.location.findMany({ where: { businessId, archivedAt: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  }

  async get(actor: Actor, id: string) {
    const rental = await this.prisma.rental.findFirst({ where: { id, businessId: this.businessId(actor) }, select: detailSelect });
    if (!rental) throw new NotFoundException('Rental was not found.');
    return rental;
  }

  async checkout(actor: Actor, id: string, input: { odometerKm: number; fuelPercent: number; notes?: string }) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; status: RentalStatus; businessId: string; vehicleId: string; reservationId: string; customerId: string; depositMinor: number; startAt: Date; expectedReturnAt: Date; odometerKm: number; condition: string; archivedAt: Date | null }>>(Prisma.sql`SELECT r."id", r."status", r."businessId", r."vehicleId", r."reservationId", r."customerId", r."depositMinor", r."startAt", r."expectedReturnAt", v."odometerKm", v."condition", v."archivedAt" FROM "Rental" r JOIN "Vehicle" v ON v."id" = r."vehicleId" AND v."businessId" = r."businessId" WHERE r."id" = ${id} AND r."businessId" = ${businessId} FOR UPDATE OF r, v`);
      const rental = locked[0];
      if (!rental) throw new NotFoundException('Rental was not found.');
      if (rental.status !== 'BOOKED') throw new ConflictException('Only a booked rental can be checked out.');
      if (rental.archivedAt || rental.condition !== 'READY') throw new ConflictException('This vehicle is not ready for handover. Review its condition before checkout.');
      if (input.odometerKm < rental.odometerKm) throw new BadRequestException('Handover mileage cannot be lower than the vehicle’s last recorded mileage.');
      const [reservationConflict, rentalConflict] = await Promise.all([
        tx.reservation.findFirst({ where: { businessId, vehicleId: rental.vehicleId, id: { not: rental.reservationId }, status: { in: ['PENDING', 'CONFIRMED', 'READY_FOR_PICKUP'] }, startAt: { lt: rental.expectedReturnAt }, endAt: { gt: rental.startAt } }, select: { id: true } }),
        tx.rental.findFirst({ where: { businessId, vehicleId: rental.vehicleId, id: { not: id }, status: { in: activeStatuses }, startAt: { lt: rental.expectedReturnAt }, expectedReturnAt: { gt: rental.startAt } }, select: { id: true } }),
      ]);
      if (reservationConflict || rentalConflict) throw new ConflictException('Another booking or rental overlaps the handover period. Review the vehicle schedule first.');
      const customer = await tx.customer.findFirst({ where: { id: rental.customerId, businessId }, select: { verification: true } });
      if (customer?.verification !== 'VERIFIED') throw new ConflictException('Verify the renter before handing over the vehicle.');
      if (rental.depositMinor > 0) {
        const deposit = await tx.depositLedgerEntry.groupBy({ by: ['type'], where: { businessId, reservationId: rental.reservationId }, _sum: { amountMinor: true } });
        const collected = deposit.find((entry) => entry.type === 'COLLECTED')?._sum.amountMinor ?? 0;
        const refunded = deposit.find((entry) => entry.type === 'REFUNDED')?._sum.amountMinor ?? 0;
        const retained = deposit.find((entry) => entry.type === 'RETAINED')?._sum.amountMinor ?? 0;
        if (collected - refunded - retained < rental.depositMinor) throw new ConflictException('Collect the full required security deposit before handover.');
      }
      await tx.rental.update({ where: { id }, data: { status: 'ACTIVE', startOdometerKm: input.odometerKm, startFuelPercent: input.fuelPercent, checkedOutAt: new Date(), checkoutNotes: input.notes?.trim() || undefined } });
      await tx.vehicle.update({ where: { id: rental.vehicleId }, data: { odometerKm: input.odometerKm } });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'RENTAL_CHECKED_OUT', entityType: 'Rental', entityId: id, metadata: { odometerKm: input.odometerKm, fuelPercent: input.fuelPercent } } });
      return tx.rental.findFirstOrThrow({ where: { id, businessId }, select: detailSelect });
    });
  }

  async checkin(actor: Actor, id: string, input: { odometerKm: number; fuelPercent: number; returnLocationId: string; notes?: string }) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; status: RentalStatus; businessId: string; vehicleId: string; startOdometerKm: number | null }>>(Prisma.sql`SELECT r."id", r."status", r."businessId", r."vehicleId", r."startOdometerKm" FROM "Rental" r JOIN "Vehicle" v ON v."id" = r."vehicleId" AND v."businessId" = r."businessId" WHERE r."id" = ${id} AND r."businessId" = ${businessId} FOR UPDATE OF r, v`);
      const rental = locked[0];
      if (!rental) throw new NotFoundException('Rental was not found.');
      if (rental.status !== 'ACTIVE') throw new ConflictException('Only an active rental can be returned.');
      if (rental.startOdometerKm !== null && input.odometerKm < rental.startOdometerKm) throw new BadRequestException('Return mileage cannot be lower than handover mileage.');
      const location = await tx.location.findFirst({ where: { id: input.returnLocationId, businessId, archivedAt: null }, select: { id: true } });
      if (!location) throw new NotFoundException('Return location was not found.');
      const now = new Date();
      await tx.rental.update({ where: { id }, data: { status: 'RETURNED', actualReturnAt: now, checkedInAt: now, endOdometerKm: input.odometerKm, endFuelPercent: input.fuelPercent, actualReturnLocationId: location.id, returnNotes: input.notes?.trim() || undefined } });
      await tx.vehicle.update({ where: { id: rental.vehicleId }, data: { odometerKm: input.odometerKm, locationId: location.id, condition: 'PREPARATION' } });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'RENTAL_RETURNED', entityType: 'Rental', entityId: id, metadata: { odometerKm: input.odometerKm, fuelPercent: input.fuelPercent, returnLocationId: location.id } } });
      return tx.rental.findFirstOrThrow({ where: { id, businessId }, select: detailSelect });
    });
  }

  async extend(actor: Actor, id: string, newExpectedReturnAtInput: string, reason: string) {
    const businessId = this.businessId(actor);
    const newExpectedReturnAt = new Date(newExpectedReturnAtInput);
    if (!Number.isFinite(newExpectedReturnAt.getTime())) throw new BadRequestException('Choose a valid new return date and time.');
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; status: RentalStatus; businessId: string; vehicleId: string; reservationId: string; startAt: Date; expectedReturnAt: Date; dailyRateMinor: number }>>(Prisma.sql`SELECT r."id", r."status", r."businessId", r."vehicleId", r."reservationId", r."startAt", r."expectedReturnAt", r."dailyRateMinor" FROM "Rental" r JOIN "Vehicle" v ON v."id" = r."vehicleId" AND v."businessId" = r."businessId" WHERE r."id" = ${id} AND r."businessId" = ${businessId} FOR UPDATE OF r, v`);
      const rental = locked[0];
      if (!rental) throw new NotFoundException('Rental was not found.');
      if (!['BOOKED', 'ACTIVE'].includes(rental.status)) throw new ConflictException('This rental can no longer be extended.');
      if (newExpectedReturnAt <= rental.expectedReturnAt) throw new BadRequestException('The new return time must be later than the current return time.');
      if (newExpectedReturnAt.getTime() - rental.startAt.getTime() > 366 * 86400000) throw new BadRequestException('A rental cannot be longer than 366 days.');
      const reservationConflict = await tx.reservation.findFirst({ where: { businessId, vehicleId: rental.vehicleId, id: { not: rental.reservationId }, status: { in: ['PENDING', 'CONFIRMED', 'READY_FOR_PICKUP'] }, startAt: { lt: newExpectedReturnAt }, endAt: { gt: rental.expectedReturnAt } }, select: { id: true } });
      const rentalConflict = await tx.rental.findFirst({ where: { businessId, vehicleId: rental.vehicleId, id: { not: id }, status: { in: [...activeStatuses] }, startAt: { lt: newExpectedReturnAt }, expectedReturnAt: { gt: rental.expectedReturnAt } }, select: { id: true } });
      if (reservationConflict || rentalConflict) throw new ConflictException('Another booking or rental needs this vehicle before the new return time. Choose a different time or vehicle.');
      const billableDays = Math.max(1, Math.ceil((newExpectedReturnAt.getTime() - rental.startAt.getTime()) / 86400000));
      const total = billableDays * rental.dailyRateMinor;
      if (!Number.isSafeInteger(total) || total > 2_147_483_647) throw new BadRequestException('The rental total exceeds the supported amount. Review the rate or rental length.');
      await tx.rental.update({ where: { id }, data: { expectedReturnAt: newExpectedReturnAt, estimatedTotalMinor: total } });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'RENTAL_EXTENDED', entityType: 'Rental', entityId: id, metadata: { oldExpectedReturnAt: rental.expectedReturnAt.toISOString(), newExpectedReturnAt: newExpectedReturnAt.toISOString(), reason: reason.trim() } } });
      return tx.rental.findFirstOrThrow({ where: { id, businessId }, select: detailSelect });
    });
  }

  private businessId(actor: Actor) {
    if (!actor.businessId) throw new ConflictException('Choose an active business workspace.');
    return actor.businessId;
  }
}
