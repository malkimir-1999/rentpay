import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type VehicleCondition } from '@prisma/client';
import type { Actor } from '../identity/auth.types';
import { PrismaService } from '../../infra/prisma.service';

const vehicleFields = {
  id: true,
  make: true,
  model: true,
  variant: true,
  year: true,
  registrationNumber: true,
  vin: true,
  color: true,
  category: true,
  transmission: true,
  fuelType: true,
  seats: true,
  odometerKm: true,
  condition: true,
  notes: true,
  dailyRateMinor: true,
  weeklyRateMinor: true,
  monthlyRateMinor: true,
  depositMinor: true,
  currency: true,
  locationId: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VehicleSelect;

export type CreateVehicleInput = {
  make: string;
  model: string;
  variant?: string;
  year?: number;
  registrationNumber: string;
  vin?: string;
  color?: string;
  category?: string;
  transmission?: string;
  fuelType?: string;
  seats?: number;
  odometerKm?: number;
  condition?: VehicleCondition;
  notes?: string;
  dailyRateMinor: number;
  weeklyRateMinor?: number;
  monthlyRateMinor?: number;
  depositMinor?: number;
  locationId?: string;
};

export type UpdateVehicleInput = Partial<CreateVehicleInput>;

@Injectable()
export class FleetService {
  constructor(private readonly prisma: PrismaService) {}

  async options(actor: Actor) {
    const businessId = this.businessId(actor);
    const [locations, settings] = await Promise.all([
      this.prisma.location.findMany({ where: { businessId, archivedAt: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      this.prisma.businessSettings.findUniqueOrThrow({ where: { businessId }, select: { currency: true } }),
    ]);
    return { locations, currency: settings.currency };
  }

  async list(actor: Actor, query: { search?: string; condition?: VehicleCondition; locationId?: string }) {
    const businessId = this.businessId(actor);
    const search = query.search?.trim();
    return this.prisma.vehicle.findMany({
      where: {
        businessId,
        archivedAt: null,
        ...(query.condition ? { condition: query.condition } : {}),
        ...(query.locationId ? { locationId: query.locationId } : {}),
        ...(search ? { OR: [
          { make: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
          { variant: { contains: search, mode: 'insensitive' } },
          { registrationNumber: { contains: search, mode: 'insensitive' } },
        ] } : {}),
      },
      select: { ...vehicleFields, location: { select: { id: true, name: true } } },
      orderBy: [{ make: 'asc' }, { model: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async get(actor: Actor, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, businessId: this.businessId(actor), archivedAt: null },
      select: { ...vehicleFields, location: { select: { id: true, name: true } } },
    });
    if (!vehicle) throw new NotFoundException('Vehicle was not found.');
    return vehicle;
  }

  async create(actor: Actor, input: CreateVehicleInput) {
    const businessId = this.businessId(actor);
    const registrationNumber = input.registrationNumber.trim().toUpperCase();
    const vin = input.vin?.trim().toUpperCase() || undefined;
    const currency = await this.prisma.businessSettings.findUniqueOrThrow({ where: { businessId }, select: { currency: true } });
    return this.prisma.$transaction(async (tx) => {
      await this.lockActiveLocation(tx, businessId, input.locationId);
      const vehicle = await tx.vehicle.create({
        data: { ...this.clean(input), registrationNumber, vin, businessId, currency: currency.currency },
        select: vehicleFields,
      });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'VEHICLE_CREATED', entityType: 'Vehicle', entityId: vehicle.id } });
      return vehicle;
    });
  }

  async update(actor: Actor, id: string, input: UpdateVehicleInput) {
    const businessId = this.businessId(actor);
    const data = this.clean(input);
    if (input.registrationNumber !== undefined) data.registrationNumber = input.registrationNumber.trim().toUpperCase();
    if (input.vin !== undefined) data.vin = input.vin.trim().toUpperCase() || null;

    return this.prisma.$transaction(async (tx) => {
      if (input.locationId !== undefined) await this.lockActiveLocation(tx, businessId, input.locationId);
      const result = await tx.vehicle.updateMany({ where: { id, businessId, archivedAt: null }, data });
      if (!result.count) throw new NotFoundException('Vehicle was not found.');
      const vehicle = await tx.vehicle.findFirstOrThrow({ where: { id, businessId }, select: vehicleFields });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'VEHICLE_UPDATED', entityType: 'Vehicle', entityId: id, metadata: { changedFields: Object.keys(data) } } });
      return vehicle;
    });
  }

  async archive(actor: Actor, id: string) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.vehicle.updateMany({ where: { id, businessId, archivedAt: null }, data: { archivedAt: new Date() } });
      if (!result.count) throw new NotFoundException('Vehicle was not found.');
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'VEHICLE_ARCHIVED', entityType: 'Vehicle', entityId: id } });
      return { id, archived: true };
    });
  }

  private businessId(actor: Actor) {
    if (!actor.businessId) throw new ConflictException('Choose an active business workspace.');
    return actor.businessId;
  }

  private async lockActiveLocation(tx: Prisma.TransactionClient, businessId: string, locationId?: string | null) {
    if (!locationId) return;
    const locations = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "Location"
      WHERE "id" = ${locationId} AND "businessId" = ${businessId} AND "archivedAt" IS NULL
      FOR UPDATE
    `);
    if (!locations.length) throw new NotFoundException('Choose an active location in your business.');
  }

  private clean(input: UpdateVehicleInput): Prisma.VehicleUncheckedCreateInput {
    return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as unknown as Prisma.VehicleUncheckedCreateInput;
  }
}
