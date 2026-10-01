import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma.service';
import { Prisma } from '@prisma/client';
import type { Actor } from '../identity/auth.types';
import { businessDayBounds } from './business-day';

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async today(actor: Actor) {
    if (!actor.businessId) throw new ConflictException('Choose an active business workspace.');
    const businessId = actor.businessId;
    const settings = await this.prisma.businessSettings.findUnique({ where: { businessId }, select: { timezone: true, currency: true } });
    const timezone = settings?.timezone ?? 'Asia/Karachi';
    const now = new Date();
    const { start, end } = businessDayBounds(timezone, now);
    const [pickups, returns, overdue, bookingRequests, readyForPickup, availableVehicles, preparingVehicles, unresolvedDamage, maintenanceDue, maintenanceInProgress, pendingPayments, unreadNotifications] = await Promise.all([
      this.prisma.rental.count({ where: { businessId, status: 'BOOKED', startAt: { gte: start, lt: end } } }),
      this.prisma.rental.count({ where: { businessId, status: 'ACTIVE', expectedReturnAt: { gte: start, lt: end } } }),
      this.prisma.rental.count({ where: { businessId, status: 'ACTIVE', expectedReturnAt: { lt: now } } }),
      this.prisma.reservation.count({ where: { businessId, status: 'PENDING' } }),
      this.prisma.reservation.count({ where: { businessId, status: 'READY_FOR_PICKUP' } }),
      this.prisma.vehicle.count({ where: { businessId, condition: 'READY', archivedAt: null } }),
      this.prisma.vehicle.count({ where: { businessId, condition: 'PREPARATION', archivedAt: null } }),
      actor.permissions.includes('inspection.manage') ? this.prisma.damageCase.count({ where: { businessId, status: { in: ['OPEN', 'QUOTED'] } } }) : Promise.resolve(null),
      actor.permissions.includes('maintenance.view') ? this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`SELECT COUNT(*) AS count FROM "MaintenanceWorkOrder" m JOIN "Vehicle" v ON v."id" = m."vehicleId" AND v."businessId" = m."businessId" WHERE m."businessId" = ${businessId} AND m."status" = 'PLANNED' AND (m."dueAt" <= ${new Date(now.getTime() + 7 * 86400000)} OR m."dueOdometerKm" <= v."odometerKm")`).then((rows) => Number(rows[0]?.count ?? 0)) : Promise.resolve(null),
      actor.permissions.includes('maintenance.view') ? this.prisma.maintenanceWorkOrder.count({ where: { businessId, status: 'IN_PROGRESS' } }) : Promise.resolve(null),
      actor.permissions.includes('payment.view') ? this.prisma.$queryRaw<Array<{ count: bigint; amountMinor: bigint }>>(Prisma.sql`SELECT COUNT(*) AS count, COALESCE(SUM(GREATEST(COALESCE(rental."estimatedTotalMinor", r."estimatedTotalMinor") - COALESCE(paid."netPaid", 0), 0)), 0) AS "amountMinor" FROM "Reservation" r LEFT JOIN "Rental" rental ON rental."businessId" = r."businessId" AND rental."reservationId" = r."id" LEFT JOIN "RentalSettlement" settlement ON settlement."businessId" = rental."businessId" AND settlement."rentalId" = rental."id" LEFT JOIN LATERAL (SELECT SUM(CASE WHEN entry."type" = 'RECEIVED' THEN entry."amountMinor" ELSE -entry."amountMinor" END) AS "netPaid" FROM "RentalPaymentEntry" entry WHERE entry."businessId" = r."businessId" AND entry."reservationId" = r."id") paid ON TRUE WHERE r."businessId" = ${businessId} AND r."status" IN ('CONFIRMED', 'READY_FOR_PICKUP', 'CONVERTED_TO_RENTAL') AND settlement."id" IS NULL AND COALESCE(rental."estimatedTotalMinor", r."estimatedTotalMinor") > COALESCE(paid."netPaid", 0)`) .then((rows) => ({ count: Number(rows[0]?.count ?? 0), amountMinor: Number(rows[0]?.amountMinor ?? 0) })) : Promise.resolve(null),
      this.prisma.notification.count({ where: { businessId, recipientUserId: actor.userId, readAt: null } }),
    ]);
    return { timezone, currency: settings?.currency ?? 'PKR', dayStartAt: start, dayEndsAt: end, pickups, returns, overdue, bookingRequests, readyForPickup, availableVehicles, preparingVehicles, unresolvedDamage, maintenanceDue, maintenanceInProgress, pendingPaymentCount: pendingPayments?.count ?? null, pendingPaymentMinor: pendingPayments?.amountMinor ?? null, unreadNotifications };
  }
}
