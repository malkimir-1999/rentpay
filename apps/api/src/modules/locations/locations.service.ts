import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Actor } from '../identity/auth.types';
import { PrismaService } from '../../infra/prisma.service';

const locationSelect = {
  id: true,
  name: true,
  timezone: true,
  address: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { vehicles: { where: { archivedAt: null } } } },
} satisfies Prisma.LocationSelect;

export type LocationInput = { name: string; timezone: string; address?: string; phone?: string };

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(actor: Actor) {
    return this.prisma.location.findMany({
      where: { businessId: this.businessId(actor), archivedAt: null },
      select: locationSelect,
      orderBy: { name: 'asc' },
    });
  }

  async get(actor: Actor, id: string) {
    const location = await this.prisma.location.findFirst({ where: { id, businessId: this.businessId(actor), archivedAt: null }, select: locationSelect });
    if (!location) throw new NotFoundException('Location was not found.');
    return location;
  }

  async create(actor: Actor, input: LocationInput) {
    const businessId = this.businessId(actor);
    const name = input.name.trim();
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.location.findUnique({ where: { businessId_name: { businessId, name } }, select: { id: true, archivedAt: true } });
        if (existing && !existing.archivedAt) throw new ConflictException('A location with this name already exists.');
        const location = existing
          ? await tx.location.update({ where: { id: existing.id }, data: { ...input, name, archivedAt: null }, select: locationSelect })
          : await tx.location.create({ data: { ...input, name, businessId }, select: locationSelect });
        await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: existing ? 'LOCATION_RESTORED' : 'LOCATION_CREATED', entityType: 'Location', entityId: location.id } });
        return location;
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (isUniqueConstraintError(error)) throw new ConflictException('A location with this name already exists.');
      throw error;
    }
  }

  async update(actor: Actor, id: string, input: Partial<LocationInput>) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      await lockActiveLocation(tx, businessId, id);
      const result = await tx.location.updateMany({
        where: { id, businessId, archivedAt: null },
        data: { ...input, ...(input.name === undefined ? {} : { name: input.name.trim() }) },
      });
      if (!result.count) throw new NotFoundException('Location was not found.');
      const location = await tx.location.findFirstOrThrow({ where: { id, businessId, archivedAt: null }, select: locationSelect });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'LOCATION_UPDATED', entityType: 'Location', entityId: id, metadata: { changedFields: Object.keys(input) } } });
      return location;
    }).catch((error: unknown) => {
      if (isUniqueConstraintError(error)) throw new ConflictException('A location with this name already exists.');
      throw error;
    });
  }

  async archive(actor: Actor, id: string) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      await lockActiveLocation(tx, businessId, id);
      const location = await tx.location.findFirstOrThrow({ where: { id, businessId, archivedAt: null }, select: { id: true, _count: { select: { vehicles: { where: { archivedAt: null } } } } } });
      if (location._count.vehicles) throw new ConflictException('Move active vehicles to another location before archiving this location.');
      await tx.location.update({ where: { id }, data: { archivedAt: new Date() } });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'LOCATION_ARCHIVED', entityType: 'Location', entityId: id } });
      return { id, archived: true };
    });
  }

  private businessId(actor: Actor) {
    if (!actor.businessId) throw new ConflictException('Choose an active business workspace.');
    return actor.businessId;
  }
}

function isUniqueConstraintError(error: unknown): error is { code: 'P2002' } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

async function lockActiveLocation(tx: Prisma.TransactionClient, businessId: string, id: string) {
  const locations = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "Location"
    WHERE "id" = ${id} AND "businessId" = ${businessId} AND "archivedAt" IS NULL
    FOR UPDATE
  `);
  if (!locations.length) throw new NotFoundException('Location was not found.');
}
