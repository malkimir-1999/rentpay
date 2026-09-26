import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma.service';
import type { Actor } from '../identity/auth.types';
import { businessDayBounds } from './business-day';

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async today(actor: Actor) {
    if (!actor.businessId) throw new ConflictException('Choose an active business workspace.');
    const businessId = actor.businessId;
    const settings = await this.prisma.businessSettings.findUnique({ where: { businessId }, select: { timezone: true } });
    const timezone = settings?.timezone ?? 'Asia/Karachi';
    const now = new Date();
    const { start, end } = businessDayBounds(timezone, now);
    const [pickups, returns, overdue, bookingRequests, readyForPickup, availableVehicles, preparingVehicles, unresolvedDamage] = await Promise.all([
      this.prisma.rental.count({ where: { businessId, status: 'BOOKED', startAt: { gte: start, lt: end } } }),
      this.prisma.rental.count({ where: { businessId, status: 'ACTIVE', expectedReturnAt: { gte: start, lt: end } } }),
      this.prisma.rental.count({ where: { businessId, status: 'ACTIVE', expectedReturnAt: { lt: now } } }),
      this.prisma.reservation.count({ where: { businessId, status: 'PENDING' } }),
      this.prisma.reservation.count({ where: { businessId, status: 'READY_FOR_PICKUP' } }),
      this.prisma.vehicle.count({ where: { businessId, condition: 'READY', archivedAt: null } }),
      this.prisma.vehicle.count({ where: { businessId, condition: 'PREPARATION', archivedAt: null } }),
      actor.permissions.includes('inspection.manage') ? this.prisma.damageCase.count({ where: { businessId, status: { in: ['OPEN', 'QUOTED'] } } }) : Promise.resolve(null),
    ]);
    return { timezone, dayStartAt: start, dayEndsAt: end, pickups, returns, overdue, bookingRequests, readyForPickup, availableVehicles, preparingVehicles, unresolvedDamage };
  }
}
