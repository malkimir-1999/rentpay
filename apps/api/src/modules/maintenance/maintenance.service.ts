import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma.service';
import type { Actor } from '../identity/auth.types';
import { blockingMaintenance } from './maintenance-window';

export type WorkOrderInput = {
  vehicleId: string; title: string; description?: string; dueAt?: string; dueOdometerKm?: number;
  scheduledStartAt?: string; expectedEndAt?: string; blocksAvailability: boolean;
  vendorName?: string; estimatedCostMinor?: number;
};
export type WorkOrderUpdate = Partial<Omit<WorkOrderInput, 'vehicleId'>>;

const workOrderSelect = {
  id: true, vehicleId: true, title: true, description: true, status: true, dueAt: true,
  dueOdometerKm: true, scheduledStartAt: true, expectedEndAt: true, blocksAvailability: true,
  vendorName: true, estimatedCostMinor: true, actualCostMinor: true, currency: true,
  completionNotes: true, startedAt: true, completedAt: true, createdAt: true, updatedAt: true,
  vehicle: { select: { id: true, make: true, model: true, registrationNumber: true, odometerKm: true, condition: true } },
} satisfies Prisma.MaintenanceWorkOrderSelect;

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  list(actor: Actor, status?: MaintenanceStatus) {
    return this.prisma.maintenanceWorkOrder.findMany({ where: { businessId: this.businessId(actor), ...(status ? { status } : {}) }, select: workOrderSelect, orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }], take: 200 });
  }

  async get(actor: Actor, id: string) {
    const order = await this.prisma.maintenanceWorkOrder.findFirst({ where: { id, businessId: this.businessId(actor) }, select: workOrderSelect });
    if (!order) throw new NotFoundException('Maintenance work order was not found.');
    return order;
  }

  async create(actor: Actor, input: WorkOrderInput) {
    const businessId = this.businessId(actor);
    const dates = this.window(input.scheduledStartAt, input.expectedEndAt);
    return this.prisma.$transaction(async (tx) => {
      await this.lockVehicle(tx, businessId, input.vehicleId);
      if (input.blocksAvailability && dates.start && dates.end) await this.assertScheduleFree(tx, businessId, input.vehicleId, dates.start, dates.end);
      const settings = await tx.businessSettings.findUniqueOrThrow({ where: { businessId }, select: { currency: true } });
      const order = await tx.maintenanceWorkOrder.create({ data: { businessId, vehicleId: input.vehicleId, title: input.title.trim(), description: clean(input.description), dueAt: this.date(input.dueAt), dueOdometerKm: input.dueOdometerKm, scheduledStartAt: dates.start, expectedEndAt: dates.end, blocksAvailability: input.blocksAvailability, vendorName: clean(input.vendorName), estimatedCostMinor: input.estimatedCostMinor, currency: settings.currency, createdById: actor.userId }, select: workOrderSelect });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'MAINTENANCE_WORK_ORDER_CREATED', entityType: 'MaintenanceWorkOrder', entityId: order.id, metadata: { vehicleId: input.vehicleId, scheduledStartAt: dates.start?.toISOString() ?? null, expectedEndAt: dates.end?.toISOString() ?? null, blocksAvailability: input.blocksAvailability } } });
      return order;
    });
  }

  async update(actor: Actor, id: string, input: WorkOrderUpdate) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      let existing = await tx.maintenanceWorkOrder.findFirst({ where: { id, businessId }, select: { vehicleId: true, status: true, scheduledStartAt: true, expectedEndAt: true, blocksAvailability: true } });
      if (!existing) throw new NotFoundException('Maintenance work order was not found.');
      await this.lockVehicle(tx, businessId, existing.vehicleId);
      existing = await tx.maintenanceWorkOrder.findFirstOrThrow({ where: { id, businessId }, select: { vehicleId: true, status: true, scheduledStartAt: true, expectedEndAt: true, blocksAvailability: true } });
      if (existing.status !== 'PLANNED') throw new ConflictException('Only a planned work order can be edited.');
      const startInput = input.scheduledStartAt === undefined ? existing.scheduledStartAt?.toISOString() : input.scheduledStartAt;
      const endInput = input.expectedEndAt === undefined ? existing.expectedEndAt?.toISOString() : input.expectedEndAt;
      const dates = this.window(startInput, endInput);
      const blocksAvailability = input.blocksAvailability ?? existing.blocksAvailability;
      if (blocksAvailability && dates.start && dates.end) await this.assertScheduleFree(tx, businessId, existing.vehicleId, dates.start, dates.end, id);
      const order = await tx.maintenanceWorkOrder.update({ where: { id }, data: { ...(input.title === undefined ? {} : { title: input.title.trim() }), ...(input.description === undefined ? {} : { description: clean(input.description) }), ...(input.dueAt === undefined ? {} : { dueAt: this.date(input.dueAt) }), ...(input.dueOdometerKm === undefined ? {} : { dueOdometerKm: input.dueOdometerKm }), scheduledStartAt: dates.start, expectedEndAt: dates.end, blocksAvailability, ...(input.vendorName === undefined ? {} : { vendorName: clean(input.vendorName) }), ...(input.estimatedCostMinor === undefined ? {} : { estimatedCostMinor: input.estimatedCostMinor }) }, select: workOrderSelect });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'MAINTENANCE_WORK_ORDER_UPDATED', entityType: 'MaintenanceWorkOrder', entityId: id, metadata: { changedFields: Object.keys(input) } } });
      return order;
    });
  }

  async start(actor: Actor, id: string) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      let existing = await tx.maintenanceWorkOrder.findFirst({ where: { id, businessId }, select: { vehicleId: true, status: true, blocksAvailability: true, expectedEndAt: true } });
      if (!existing) throw new NotFoundException('Maintenance work order was not found.');
      await this.lockVehicle(tx, businessId, existing.vehicleId);
      existing = await tx.maintenanceWorkOrder.findFirstOrThrow({ where: { id, businessId }, select: { vehicleId: true, status: true, blocksAvailability: true, expectedEndAt: true } });
      if (existing.status !== 'PLANNED') throw new ConflictException('Only a planned work order can start.');
      const now = new Date();
      if (existing.blocksAvailability) {
        if (!existing.expectedEndAt || existing.expectedEndAt <= now) throw new BadRequestException('Set a future expected completion time before starting blocking maintenance.');
        await this.assertScheduleFree(tx, businessId, existing.vehicleId, now, existing.expectedEndAt, id);
      }
      const order = await tx.maintenanceWorkOrder.update({ where: { id }, data: { status: 'IN_PROGRESS', startedAt: now }, select: workOrderSelect });
      if (existing.blocksAvailability) await tx.vehicle.update({ where: { id: existing.vehicleId }, data: { condition: 'MAINTENANCE' } });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'MAINTENANCE_STARTED', entityType: 'MaintenanceWorkOrder', entityId: id, metadata: { vehicleId: existing.vehicleId, blocksAvailability: existing.blocksAvailability } } });
      return order;
    });
  }

  async complete(actor: Actor, id: string, input: { completionNotes: string; actualCostMinor?: number }) {
    return this.finish(actor, id, 'COMPLETED', input.completionNotes, input.actualCostMinor);
  }

  async cancel(actor: Actor, id: string, reason: string) {
    return this.finish(actor, id, 'CANCELLED', reason);
  }

  private async finish(actor: Actor, id: string, status: 'COMPLETED' | 'CANCELLED', note: string, actualCostMinor?: number) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      let existing = await tx.maintenanceWorkOrder.findFirst({ where: { id, businessId }, select: { vehicleId: true, status: true, blocksAvailability: true } });
      if (!existing) throw new NotFoundException('Maintenance work order was not found.');
      await this.lockVehicle(tx, businessId, existing.vehicleId);
      existing = await tx.maintenanceWorkOrder.findFirstOrThrow({ where: { id, businessId }, select: { vehicleId: true, status: true, blocksAvailability: true } });
      if (!['PLANNED', 'IN_PROGRESS'].includes(existing.status)) throw new ConflictException('This work order is already complete or cancelled.');
      if (status === 'COMPLETED' && existing.status !== 'IN_PROGRESS') throw new ConflictException('Start this work order before marking it complete.');
      const now = new Date();
      const order = await tx.maintenanceWorkOrder.update({ where: { id }, data: { status, completionNotes: note.trim(), ...(actualCostMinor === undefined ? {} : { actualCostMinor }), ...(status === 'COMPLETED' ? { completedAt: now } : {}) }, select: workOrderSelect });
      if (existing.status === 'IN_PROGRESS' && existing.blocksAvailability) {
        const remaining = await tx.maintenanceWorkOrder.count({ where: { businessId, vehicleId: existing.vehicleId, status: 'IN_PROGRESS', blocksAvailability: true } });
        if (!remaining) {
          const damage = await tx.damageCase.count({ where: { businessId, vehicleId: existing.vehicleId, status: { in: ['OPEN', 'QUOTED'] } } });
          await tx.vehicle.update({ where: { id: existing.vehicleId }, data: { condition: damage ? 'DAMAGED' : 'PREPARATION' } });
        }
      }
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: status === 'COMPLETED' ? 'MAINTENANCE_COMPLETED' : 'MAINTENANCE_CANCELLED', entityType: 'MaintenanceWorkOrder', entityId: id, metadata: { vehicleId: existing.vehicleId, actualCostMinor: actualCostMinor ?? null, note: note.trim() } } });
      return order;
    });
  }

  private async assertScheduleFree(tx: Prisma.TransactionClient, businessId: string, vehicleId: string, startAt: Date, endAt: Date, excludeId?: string) {
    const [reservation, rental, maintenance] = await Promise.all([
      tx.reservation.findFirst({ where: { businessId, vehicleId, status: { in: ['PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'CONVERTED_TO_RENTAL'] }, startAt: { lt: endAt }, endAt: { gt: startAt } }, select: { id: true } }),
      tx.rental.findFirst({ where: { businessId, vehicleId, status: { in: ['BOOKED', 'ACTIVE'] }, startAt: { lt: endAt }, expectedReturnAt: { gt: startAt } }, select: { id: true } }),
      tx.maintenanceWorkOrder.findFirst({ where: { vehicleId, ...(excludeId ? { id: { not: excludeId } } : {}), ...blockingMaintenance(businessId, startAt, endAt) }, select: { id: true } }),
    ]);
    if (reservation || rental || maintenance) throw new ConflictException('A booking, rental or blocking service already needs this vehicle during the proposed maintenance window.');
  }

  private async lockVehicle(tx: Prisma.TransactionClient, businessId: string, vehicleId: string) {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id" FROM "Vehicle" WHERE "id" = ${vehicleId} AND "businessId" = ${businessId} AND "archivedAt" IS NULL FOR UPDATE`);
    if (!locked.length) throw new NotFoundException('Vehicle was not found.');
  }

  private window(startInput?: string | null, endInput?: string | null) {
    if (Boolean(startInput) !== Boolean(endInput)) throw new BadRequestException('Set both a service start and expected completion time.');
    const start = this.date(startInput);
    const end = this.date(endInput);
    if (start && end && (end <= start || end.getTime() - start.getTime() > 366 * 86400000)) throw new BadRequestException('Choose a service window of up to 366 days with completion after the start.');
    return { start, end };
  }

  private date(input?: string | null) {
    if (!input) return null;
    const date = new Date(input);
    if (!Number.isFinite(date.getTime())) throw new BadRequestException('Choose a valid service date and time.');
    return date;
  }

  private businessId(actor: Actor) {
    if (!actor.businessId) throw new ConflictException('Choose an active business workspace.');
    return actor.businessId;
  }
}

function clean(value?: string) { return value?.trim() || null; }
