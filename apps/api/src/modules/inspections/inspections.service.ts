import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DamageStatus, InspectionStage, Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma.service';
import type { Actor } from '../identity/auth.types';
import { inspectionAreas, type VehicleConditionChecklist } from '../../../../../packages/config/src/inspection';

const inspectionSelect = {
  id: true, vehicleId: true, rentalId: true, maintenanceWorkOrderId: true, stage: true, checklist: true, notes: true,
  odometerKm: true, fuelPercent: true, completedAt: true, createdAt: true,
  vehicle: { select: { make: true, model: true, registrationNumber: true } },
  evidence: { select: { id: true, caption: true, fileAsset: { select: { id: true, mimeType: true, sizeBytes: true } } } },
} satisfies Prisma.VehicleInspectionSelect;

const damageSelect = {
  id: true, vehicleId: true, rentalId: true, inspectionId: true, title: true, description: true,
  status: true, estimatedMinor: true, finalMinor: true, resolutionNotes: true, resolvedAt: true, createdAt: true,
  vehicle: { select: { make: true, model: true, registrationNumber: true } },
} satisfies Prisma.DamageCaseSelect;

@Injectable()
export class InspectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: Actor, filter: { vehicleId?: string; rentalId?: string }) {
    const businessId = this.businessId(actor);
    return this.prisma.vehicleInspection.findMany({ where: { businessId, ...(filter.vehicleId ? { vehicleId: filter.vehicleId } : {}), ...(filter.rentalId ? { rentalId: filter.rentalId } : {}) }, select: inspectionSelect, orderBy: { completedAt: 'desc' }, take: 100 });
  }

  async createInspection(actor: Actor, input: { vehicleId: string; rentalId?: string; stage: InspectionStage; checklist: VehicleConditionChecklist; odometerKm: number; fuelPercent: number; notes?: string; evidenceAssetIds?: string[] }) {
    const businessId = this.businessId(actor);
    if (input.evidenceAssetIds && (input.evidenceAssetIds.length > 10 || new Set(input.evidenceAssetIds).size !== input.evidenceAssetIds.length)) throw new BadRequestException('Attach at most 10 different evidence files.');
    if (Object.keys(input.checklist).length !== inspectionAreas.length || inspectionAreas.some(({ key }) => !['OK', 'ISSUE'].includes(input.checklist[key]))) throw new BadRequestException('Complete every vehicle condition checklist item.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Vehicle" WHERE "id" = ${input.vehicleId} AND "businessId" = ${businessId} AND "archivedAt" IS NULL FOR UPDATE`);
      const vehicle = await tx.vehicle.findFirst({ where: { id: input.vehicleId, businessId, archivedAt: null }, select: { id: true, odometerKm: true, condition: true } });
      if (!vehicle) throw new NotFoundException('Vehicle was not found.');
      if (input.odometerKm < vehicle.odometerKm) throw new BadRequestException('Inspection mileage cannot be lower than the last recorded vehicle mileage.');
      if (input.stage === 'MAINTENANCE_RELEASE' && input.rentalId) throw new BadRequestException('A service release inspection does not belong to a rental.');
      let maintenanceWorkOrderId: string | undefined;
      if (input.stage === 'MAINTENANCE_RELEASE') {
        const workOrder = await tx.maintenanceWorkOrder.findFirst({ where: { businessId, vehicleId: vehicle.id, blocksAvailability: true, startedAt: { not: null }, status: { in: ['COMPLETED', 'CANCELLED'] } }, orderBy: { updatedAt: 'desc' }, select: { id: true } });
        if (!workOrder) throw new ConflictException('Complete blocking maintenance before recording a release inspection.');
        if (!['PREPARATION', 'DAMAGED'].includes(vehicle.condition)) throw new ConflictException('This vehicle is not awaiting release after service.');
        if (await tx.maintenanceWorkOrder.count({ where: { businessId, vehicleId: vehicle.id, status: 'IN_PROGRESS', blocksAvailability: true } })) throw new ConflictException('Complete all blocking service before releasing this vehicle.');
        if (await tx.damageCase.count({ where: { businessId, vehicleId: vehicle.id, status: { in: ['OPEN', 'QUOTED'] } } })) throw new ConflictException('Resolve open damage cases before the service release inspection.');
        maintenanceWorkOrderId = workOrder.id;
      }
      if (input.rentalId) {
        const rental = await tx.rental.findFirst({ where: { id: input.rentalId, businessId, vehicleId: vehicle.id }, select: { id: true, status: true } });
        if (!rental) throw new NotFoundException('Rental was not found for this vehicle.');
        const requiredStatus = input.stage === 'PRE_HANDOVER' ? 'BOOKED' : 'ACTIVE';
        if (rental.status !== requiredStatus) throw new ConflictException(input.stage === 'PRE_HANDOVER' ? 'A pre-handover inspection is only available for a booked rental.' : 'A return inspection is only available for an active rental.');
      }
      const assetIds = input.evidenceAssetIds ?? [];
      if (assetIds.length) {
        const ownedAssets = await tx.fileAsset.findMany({ where: { id: { in: assetIds }, businessId }, select: { id: true } });
        if (ownedAssets.length !== assetIds.length) throw new NotFoundException('One or more evidence files were not found in this business.');
      }
      const inspection = await tx.vehicleInspection.create({ data: { businessId, vehicleId: vehicle.id, rentalId: input.rentalId, maintenanceWorkOrderId, stage: input.stage, checklist: input.checklist as Prisma.InputJsonValue, odometerKm: input.odometerKm, fuelPercent: input.fuelPercent, notes: input.notes?.trim() || null, createdById: actor.userId, evidence: { create: assetIds.map((fileAssetId) => ({ fileAssetId })) } }, select: inspectionSelect });
      const issues = inspectionAreas.filter(({ key }) => input.checklist[key] === 'ISSUE').map(({ key }) => key);
      for (const issue of issues) {
        const damage = await tx.damageCase.create({ data: { businessId, vehicleId: vehicle.id, rentalId: input.rentalId, inspectionId: inspection.id, title: `${issue.charAt(0).toUpperCase()}${issue.slice(1)} needs review`, description: input.notes?.trim() || `The ${issue} condition was marked for review during the ${input.stage === 'PRE_HANDOVER' ? 'pre-handover' : input.stage === 'RETURN' ? 'return' : 'service release'} inspection.`, reportedById: actor.userId }, select: { id: true } });
        await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'DAMAGE_CASE_CREATED', entityType: 'DamageCase', entityId: damage.id, metadata: { vehicleId: vehicle.id, rentalId: input.rentalId ?? null, inspectionId: inspection.id, area: issue } } });
      }
      await tx.vehicle.update({ where: { id: vehicle.id }, data: { odometerKm: input.odometerKm, ...(issues.length ? { condition: 'DAMAGED' } : input.stage === 'MAINTENANCE_RELEASE' ? { condition: 'READY' } : {}) } });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: input.stage === 'MAINTENANCE_RELEASE' ? 'MAINTENANCE_RELEASE_INSPECTED' : 'VEHICLE_INSPECTION_COMPLETED', entityType: 'VehicleInspection', entityId: inspection.id, metadata: { vehicleId: vehicle.id, rentalId: input.rentalId ?? null, maintenanceWorkOrderId: maintenanceWorkOrderId ?? null, stage: input.stage, evidenceCount: assetIds.length, issueCount: issues.length, released: input.stage === 'MAINTENANCE_RELEASE' && issues.length === 0, checklist: input.checklist } } });
      return inspection;
    });
  }

  listDamage(actor: Actor, status?: DamageStatus) {
    const businessId = this.businessId(actor);
    return this.prisma.damageCase.findMany({ where: { businessId, ...(status ? { status } : {}) }, select: damageSelect, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async createDamage(actor: Actor, input: { vehicleId: string; rentalId?: string; inspectionId?: string; title: string; description: string; estimatedMinor?: number }) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findFirst({ where: { id: input.vehicleId, businessId, archivedAt: null }, select: { id: true } });
      if (!vehicle) throw new NotFoundException('Vehicle was not found.');
      if (input.rentalId) {
        const rental = await tx.rental.findFirst({ where: { id: input.rentalId, businessId, vehicleId: vehicle.id }, select: { id: true } });
        if (!rental) throw new NotFoundException('Rental was not found for this vehicle.');
      }
      if (input.inspectionId) {
        const inspection = await tx.vehicleInspection.findFirst({ where: { id: input.inspectionId, businessId, vehicleId: vehicle.id }, select: { id: true } });
        if (!inspection) throw new NotFoundException('Inspection was not found for this vehicle.');
      }
      const damage = await tx.damageCase.create({ data: { businessId, vehicleId: vehicle.id, rentalId: input.rentalId, inspectionId: input.inspectionId, title: input.title.trim(), description: input.description.trim(), estimatedMinor: input.estimatedMinor, reportedById: actor.userId }, select: damageSelect });
      await tx.vehicle.update({ where: { id: vehicle.id }, data: { condition: 'DAMAGED' } });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'DAMAGE_CASE_CREATED', entityType: 'DamageCase', entityId: damage.id, metadata: { vehicleId: vehicle.id, rentalId: input.rentalId ?? null, estimatedMinor: input.estimatedMinor ?? null } } });
      return damage;
    });
  }

  async updateDamage(actor: Actor, id: string, input: { status: DamageStatus; estimatedMinor?: number; finalMinor?: number; resolutionNotes?: string }) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.damageCase.findFirst({ where: { id, businessId }, select: { id: true, status: true } });
      if (!existing) throw new NotFoundException('Damage case was not found.');
      if (existing.status === 'RESOLVED' || existing.status === 'WAIVED') throw new ConflictException('A resolved damage case cannot be changed. Create a follow-up case if further work is needed.');
      if ((input.status === 'RESOLVED' || input.status === 'WAIVED') && !input.resolutionNotes?.trim()) throw new BadRequestException('Add a short note explaining how this damage case was resolved.');
      const updated = await tx.damageCase.update({ where: { id }, data: { status: input.status, ...(input.estimatedMinor === undefined ? {} : { estimatedMinor: input.estimatedMinor }), ...(input.finalMinor === undefined ? {} : { finalMinor: input.finalMinor }), ...(input.resolutionNotes === undefined ? {} : { resolutionNotes: input.resolutionNotes.trim() }), ...(input.status === 'RESOLVED' || input.status === 'WAIVED' ? { resolvedAt: new Date() } : {}) }, select: damageSelect });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'DAMAGE_CASE_UPDATED', entityType: 'DamageCase', entityId: id, metadata: { from: existing.status, to: input.status, estimatedMinor: input.estimatedMinor ?? null, finalMinor: input.finalMinor ?? null, resolutionNotes: input.resolutionNotes?.trim() ?? null } } });
      return updated;
    });
  }

  private businessId(actor: Actor) {
    if (!actor.businessId) throw new ConflictException('Choose an active business workspace.');
    return actor.businessId;
  }
}
