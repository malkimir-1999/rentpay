import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type ReservationStatus } from '@prisma/client';
import type { Actor } from '../identity/auth.types';
import { PrismaService } from '../../infra/prisma.service';

const blockingStatuses: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'CONVERTED_TO_RENTAL'];
const blockingRentalStatuses = ['BOOKED', 'ACTIVE'] as const;
const reservationSelect = {
  id: true, status: true, source: true, startAt: true, endAt: true, dailyRateMinor: true,
  estimatedTotalMinor: true, depositMinor: true, currency: true, customerName: true,
  customerPhone: true, customerEmail: true, notes: true, statusReason: true,
  createdAt: true, updatedAt: true,
  customer: { select: { id: true, fullName: true, phone: true, email: true, verification: true } },
  vehicle: { select: { id: true, make: true, model: true, registrationNumber: true, locationId: true } },
  pickupLocation: { select: { id: true, name: true } },
  dropoffLocation: { select: { id: true, name: true } },
} satisfies Prisma.ReservationSelect;

export type CreateReservationInput = { customerId: string; vehicleId: string; pickupLocationId: string; dropoffLocationId?: string; startAt: string; endAt: string; notes?: string };

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async availability(actor: Actor, startAtInput: string, endAtInput: string, locationId?: string) {
    const businessId = this.businessId(actor);
    const { startAt, endAt, days } = validateWindow(startAtInput, endAtInput);
    if (locationId) await this.requireActiveLocation(this.prisma, businessId, locationId);
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        businessId, archivedAt: null, condition: 'READY',
        ...(locationId ? { OR: [{ locationId }, { locationId: null }] } : {}),
        reservations: { none: { businessId, status: { in: blockingStatuses }, startAt: { lt: endAt }, endAt: { gt: startAt } } },
        rentals: { none: { businessId, status: { in: [...blockingRentalStatuses] }, startAt: { lt: endAt }, expectedReturnAt: { gt: startAt } } },
      },
      select: { id: true, make: true, model: true, variant: true, year: true, registrationNumber: true, category: true, seats: true, locationId: true, dailyRateMinor: true, depositMinor: true, currency: true },
      orderBy: [{ make: 'asc' }, { model: 'asc' }], take: 200,
    });
    return { startAt, endAt, billableDays: days, vehicles };
  }

  list(actor: Actor, status?: ReservationStatus) {
    return this.prisma.reservation.findMany({
      where: { businessId: this.businessId(actor), ...(status ? { status } : {}) },
      select: reservationSelect, orderBy: [{ startAt: 'asc' }, { createdAt: 'desc' }], take: 100,
    });
  }

  async get(actor: Actor, id: string) {
    const reservation = await this.prisma.reservation.findFirst({ where: { id, businessId: this.businessId(actor) }, select: reservationSelect });
    if (!reservation) throw new NotFoundException('Reservation was not found.');
    return reservation;
  }

  async create(actor: Actor, input: CreateReservationInput) {
    const businessId = this.businessId(actor);
    const { startAt, endAt, days } = validateWindow(input.startAt, input.endAt);
    return this.prisma.$transaction(async (tx) => {
      await this.lockVehicle(tx, businessId, input.vehicleId);
      const [customer, vehicle, pickup] = await Promise.all([
        tx.customer.findFirst({ where: { id: input.customerId, businessId, archivedAt: null }, select: { id: true, fullName: true, phone: true, email: true, status: true } }),
        tx.vehicle.findFirst({ where: { id: input.vehicleId, businessId, archivedAt: null }, select: { id: true, make: true, model: true, locationId: true, condition: true, dailyRateMinor: true, depositMinor: true, currency: true } }),
        this.requireActiveLocation(tx, businessId, input.pickupLocationId),
      ]);
      if (!customer) throw new NotFoundException('Customer was not found.');
      if (!vehicle) throw new NotFoundException('Vehicle was not found.');
      if (customer.status !== 'ACTIVE') throw new ConflictException('This customer is restricted. Review the customer record before making a reservation.');
      if (vehicle.condition !== 'READY') throw new ConflictException('This vehicle is not ready for a reservation.');
      if (vehicle.locationId && vehicle.locationId !== pickup.id) throw new ConflictException('Choose the vehicle’s current pickup location.');
      if (input.dropoffLocationId) await this.requireActiveLocation(tx, businessId, input.dropoffLocationId);
      const conflict = await tx.reservation.findFirst({ where: { businessId, vehicleId: vehicle.id, status: { in: blockingStatuses }, startAt: { lt: endAt }, endAt: { gt: startAt } }, select: { id: true } });
      if (conflict) throw new ConflictException('This vehicle is already reserved for some or all of those dates. Choose another vehicle or time.');
      const activeRental = await tx.rental.findFirst({ where: { businessId, vehicleId: vehicle.id, status: { in: [...blockingRentalStatuses] }, startAt: { lt: endAt }, expectedReturnAt: { gt: startAt } }, select: { id: true } });
      if (activeRental) throw new ConflictException('This vehicle is already assigned to a rental for some or all of those dates. Choose another vehicle or time.');
      const total = days * vehicle.dailyRateMinor;
      if (!Number.isSafeInteger(total) || total > 2_147_483_647) throw new BadRequestException('The estimated total exceeds the supported amount. Review the rate or reservation length.');
      const reservation = await tx.reservation.create({
        data: {
          businessId, customerId: customer.id, vehicleId: vehicle.id,
          pickupLocationId: pickup.id, dropoffLocationId: input.dropoffLocationId,
          startAt, endAt, dailyRateMinor: vehicle.dailyRateMinor, estimatedTotalMinor: total,
          depositMinor: vehicle.depositMinor, currency: vehicle.currency,
          customerName: customer.fullName, customerPhone: customer.phone, customerEmail: customer.email,
          notes: input.notes?.trim() || undefined,
        }, select: reservationSelect,
      });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'RESERVATION_CREATED', entityType: 'Reservation', entityId: reservation.id, metadata: { vehicleId: vehicle.id, customerId: customer.id, startAt: startAt.toISOString(), endAt: endAt.toISOString(), estimatedTotalMinor: total } } });
      return reservation;
    });
  }

  async transition(actor: Actor, id: string, nextStatus: ReservationStatus, reason?: string) {
    if (nextStatus === 'CONVERTED_TO_RENTAL') throw new BadRequestException('Convert a ready reservation using the rental handover action.');
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id" FROM "Reservation" WHERE "id" = ${id} AND "businessId" = ${businessId} FOR UPDATE`);
      if (!locked.length) throw new NotFoundException('Reservation was not found.');
      const reservation = await tx.reservation.findFirstOrThrow({ where: { id, businessId }, select: { id: true, status: true, vehicleId: true, startAt: true, endAt: true, customer: { select: { verification: true } } } });
      if (!allowedTransitions[reservation.status].includes(nextStatus)) throw new ConflictException(`A reservation cannot move from ${reservation.status} to ${nextStatus}.`);
      if (['CANCELLED', 'DECLINED', 'NO_SHOW', 'EXPIRED'].includes(nextStatus) && !reason?.trim()) throw new BadRequestException('Add a short reason so your team understands this change.');
      if (nextStatus === 'CONFIRMED' && reservation.customer.verification !== 'VERIFIED') throw new ConflictException('Verify the customer’s identity before confirming this reservation.');
      if (nextStatus === 'CONFIRMED' || nextStatus === 'READY_FOR_PICKUP') {
        await this.lockVehicle(tx, businessId, reservation.vehicleId);
        const conflict = await tx.reservation.findFirst({ where: { businessId, vehicleId: reservation.vehicleId, id: { not: id }, status: { in: blockingStatuses }, startAt: { lt: reservation.endAt }, endAt: { gt: reservation.startAt } }, select: { id: true } });
        if (conflict) throw new ConflictException('Another reservation now overlaps these dates. Review the vehicle schedule before confirming.');
        const activeRental = await tx.rental.findFirst({ where: { businessId, vehicleId: reservation.vehicleId, status: { in: [...blockingRentalStatuses] }, startAt: { lt: reservation.endAt }, expectedReturnAt: { gt: reservation.startAt } }, select: { id: true } });
        if (activeRental) throw new ConflictException('An active or booked rental overlaps these dates. Review the vehicle schedule before confirming.');
      }
      const updated = await tx.reservation.update({ where: { id }, data: { status: nextStatus, statusReason: reason?.trim() || null }, select: reservationSelect });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'RESERVATION_STATUS_CHANGED', entityType: 'Reservation', entityId: id, metadata: { from: reservation.status, to: nextStatus, reason: reason?.trim() || null } } });
      return updated;
    });
  }

  async convertToRental(actor: Actor, id: string) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; businessId: string }>>(Prisma.sql`SELECT "id", "businessId" FROM "Reservation" WHERE "id" = ${id} AND "businessId" = ${businessId} FOR UPDATE`);
      if (!locked.length) throw new NotFoundException('Reservation was not found.');
      const reservation = await tx.reservation.findFirstOrThrow({ where: { id, businessId }, select: { id: true, status: true, businessId: true, customerId: true, vehicleId: true, pickupLocationId: true, dropoffLocationId: true, startAt: true, endAt: true, dailyRateMinor: true, estimatedTotalMinor: true, depositMinor: true, currency: true, customerName: true, customerPhone: true, customerEmail: true, customer: { select: { verification: true } } } });
      if (reservation.status !== 'READY_FOR_PICKUP') throw new ConflictException('Only a reservation marked ready for pickup can start a rental.');
      if (reservation.customer.verification !== 'VERIFIED') throw new ConflictException('Verify the customer before preparing the rental handover.');
      await this.lockVehicle(tx, businessId, reservation.vehicleId);
      const vehicle = await tx.vehicle.findFirst({ where: { id: reservation.vehicleId, businessId, archivedAt: null }, select: { condition: true } });
      if (vehicle?.condition !== 'READY') throw new ConflictException('This vehicle is no longer ready for handover.');
      const activeRental = await tx.rental.findFirst({ where: { businessId, vehicleId: reservation.vehicleId, status: { in: [...blockingRentalStatuses] }, startAt: { lt: reservation.endAt }, expectedReturnAt: { gt: reservation.startAt } }, select: { id: true } });
      if (activeRental) throw new ConflictException('Another rental overlaps this reservation. Review the vehicle schedule before continuing.');
      const rental = await tx.rental.create({ data: { businessId, reservationId: id, customerId: reservation.customerId, vehicleId: reservation.vehicleId, pickupLocationId: reservation.pickupLocationId, dropoffLocationId: reservation.dropoffLocationId, startAt: reservation.startAt, expectedReturnAt: reservation.endAt, dailyRateMinor: reservation.dailyRateMinor, estimatedTotalMinor: reservation.estimatedTotalMinor, depositMinor: reservation.depositMinor, currency: reservation.currency, customerName: reservation.customerName, customerPhone: reservation.customerPhone, customerEmail: reservation.customerEmail } });
      await tx.reservation.update({ where: { id }, data: { status: 'CONVERTED_TO_RENTAL' } });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'RESERVATION_CONVERTED_TO_RENTAL', entityType: 'Rental', entityId: rental.id, metadata: { reservationId: id, vehicleId: rental.vehicleId, customerId: rental.customerId } } });
      return rental;
    });
  }

  private async lockVehicle(tx: Prisma.TransactionClient, businessId: string, vehicleId: string) {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id" FROM "Vehicle" WHERE "id" = ${vehicleId} AND "businessId" = ${businessId} AND "archivedAt" IS NULL FOR UPDATE`);
    if (!locked.length) throw new NotFoundException('Vehicle was not found.');
  }

  private async requireActiveLocation(client: Prisma.TransactionClient | PrismaService, businessId: string, locationId: string) {
    const location = await client.location.findFirst({ where: { id: locationId, businessId, archivedAt: null }, select: { id: true } });
    if (!location) throw new NotFoundException('Pickup location was not found.');
    return location;
  }

  private businessId(actor: Actor) {
    if (!actor.businessId) throw new ConflictException('Choose an active business workspace.');
    return actor.businessId;
  }
}

const allowedTransitions: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ['CONFIRMED', 'DECLINED', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['READY_FOR_PICKUP', 'CANCELLED', 'NO_SHOW'],
  READY_FOR_PICKUP: ['CONVERTED_TO_RENTAL', 'CANCELLED', 'NO_SHOW'],
  CONVERTED_TO_RENTAL: [], CANCELLED: [], DECLINED: [], NO_SHOW: [], EXPIRED: [],
};

function validateWindow(startInput: string, endInput: string) {
  const startAt = new Date(startInput);
  const endAt = new Date(endInput);
  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) throw new BadRequestException('Choose a valid return date and time after pickup.');
  const billableDays = Math.max(1, Math.ceil((endAt.getTime() - startAt.getTime()) / 86400000));
  if (billableDays > 366) throw new BadRequestException('Reservations can be up to 366 days.');
  return { startAt, endAt, days: billableDays };
}
