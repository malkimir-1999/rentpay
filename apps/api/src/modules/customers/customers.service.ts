import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type CustomerStatus, type VerificationStatus } from '@prisma/client';
import type { Actor } from '../identity/auth.types';
import { PrismaService } from '../../infra/prisma.service';

const customerSelect = {
  id: true, fullName: true, email: true, phone: true, address: true, notes: true,
  status: true, verification: true, createdAt: true, updatedAt: true,
  _count: { select: { drivers: { where: { archivedAt: null } } } },
} satisfies Prisma.CustomerSelect;

const driverSelect = {
  id: true, customerId: true, fullName: true, phone: true, licenseNumber: true,
  licenseCountry: true, licenseExpiresAt: true, verification: true, notes: true,
  createdAt: true, updatedAt: true,
} satisfies Prisma.DriverSelect;

export type CustomerInput = { fullName: string; email?: string; phone: string; address?: string; notes?: string };
export type CustomerUpdate = Partial<CustomerInput> & { status?: CustomerStatus; verification?: VerificationStatus };
export type DriverInput = { fullName: string; phone: string; licenseNumber?: string; licenseCountry?: string; licenseExpiresAt?: string; verification?: VerificationStatus; notes?: string };

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  list(actor: Actor, search?: string) {
    const businessId = this.businessId(actor);
    const term = search?.trim();
    return this.prisma.customer.findMany({
      where: { businessId, archivedAt: null, ...(term ? { OR: [{ fullName: { contains: term, mode: 'insensitive' } }, { email: { contains: term, mode: 'insensitive' } }, { phone: { contains: term } }] } : {}) },
      select: customerSelect, orderBy: { fullName: 'asc' }, take: 100,
    });
  }

  async get(actor: Actor, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId: this.businessId(actor), archivedAt: null },
      select: { ...customerSelect, drivers: { where: { archivedAt: null }, select: driverSelect, orderBy: { fullName: 'asc' } } },
    });
    if (!customer) throw new NotFoundException('Customer was not found.');
    return customer;
  }

  async create(actor: Actor, input: CustomerInput) {
    const businessId = this.businessId(actor);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({ data: { ...normalizeCustomer(input), businessId }, select: customerSelect });
        await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'CUSTOMER_CREATED', entityType: 'Customer', entityId: customer.id } });
        return customer;
      });
    } catch (error) { return this.mapUniqueConflict(error); }
  }

  async update(actor: Actor, id: string, input: CustomerUpdate) {
    const businessId = this.businessId(actor);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const changed = await tx.customer.updateMany({ where: { id, businessId, archivedAt: null }, data: normalizeCustomer(input) });
        if (!changed.count) throw new NotFoundException('Customer was not found.');
        const customer = await tx.customer.findFirstOrThrow({ where: { id, businessId, archivedAt: null }, select: customerSelect });
        await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'CUSTOMER_UPDATED', entityType: 'Customer', entityId: id, metadata: { changedFields: Object.keys(input) } } });
        return customer;
      });
    } catch (error) { return this.mapUniqueConflict(error); }
  }

  async archive(actor: Actor, id: string) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.customer.updateMany({ where: { id, businessId, archivedAt: null }, data: { archivedAt: new Date() } });
      if (!changed.count) throw new NotFoundException('Customer was not found.');
      await tx.driver.updateMany({ where: { customerId: id, businessId, archivedAt: null }, data: { archivedAt: new Date() } });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'CUSTOMER_ARCHIVED', entityType: 'Customer', entityId: id } });
      return { id, archived: true };
    });
  }

  async addDriver(actor: Actor, customerId: string, input: DriverInput) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      await this.requireCustomer(tx, businessId, customerId);
      const driver = await tx.driver.create({ data: { ...normalizeDriver(input), businessId, customerId }, select: driverSelect });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'DRIVER_ADDED', entityType: 'Driver', entityId: driver.id, metadata: { customerId } } });
      return driver;
    });
  }

  async updateDriver(actor: Actor, customerId: string, driverId: string, input: Partial<DriverInput>) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      await this.requireCustomer(tx, businessId, customerId);
      const changed = await tx.driver.updateMany({ where: { id: driverId, customerId, businessId, archivedAt: null }, data: normalizeDriver(input) });
      if (!changed.count) throw new NotFoundException('Driver was not found.');
      const driver = await tx.driver.findFirstOrThrow({ where: { id: driverId, customerId, businessId, archivedAt: null }, select: driverSelect });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'DRIVER_UPDATED', entityType: 'Driver', entityId: driverId, metadata: { changedFields: Object.keys(input), customerId } } });
      return driver;
    });
  }

  async archiveDriver(actor: Actor, customerId: string, driverId: string) {
    const businessId = this.businessId(actor);
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.driver.updateMany({ where: { id: driverId, customerId, businessId, archivedAt: null }, data: { archivedAt: new Date() } });
      if (!changed.count) throw new NotFoundException('Driver was not found.');
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'DRIVER_ARCHIVED', entityType: 'Driver', entityId: driverId, metadata: { customerId } } });
      return { id: driverId, archived: true };
    });
  }

  private async requireCustomer(tx: Prisma.TransactionClient, businessId: string, id: string) {
    const customer = await tx.customer.findFirst({ where: { id, businessId, archivedAt: null }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer was not found.');
    return customer;
  }

  private businessId(actor: Actor) {
    if (!actor.businessId) throw new ConflictException('Choose an active business workspace.');
    return actor.businessId;
  }

  private mapUniqueConflict(error: unknown): never {
    if (error instanceof NotFoundException) throw error;
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') throw new ConflictException('A customer with this email already exists in this business.');
    throw error;
  }
}

function normalizeCustomer<T extends Partial<CustomerInput>>(input: T): T {
  return { ...input, ...(input.fullName === undefined ? {} : { fullName: input.fullName.trim() }), ...(input.email === undefined ? {} : { email: input.email.trim().toLocaleLowerCase() || null }), ...(input.phone === undefined ? {} : { phone: input.phone.trim() }), ...(input.address === undefined ? {} : { address: input.address?.trim() || null }), ...(input.notes === undefined ? {} : { notes: input.notes?.trim() || null }) } as T;
}

function normalizeDriver<T extends Partial<DriverInput>>(input: T): T {
  return { ...input, ...(input.fullName === undefined ? {} : { fullName: input.fullName.trim() }), ...(input.phone === undefined ? {} : { phone: input.phone.trim() }), ...(input.licenseNumber === undefined ? {} : { licenseNumber: input.licenseNumber?.trim() || null }), ...(input.licenseCountry === undefined ? {} : { licenseCountry: input.licenseCountry?.trim() || null }), ...(input.licenseExpiresAt === undefined ? {} : { licenseExpiresAt: input.licenseExpiresAt ? new Date(input.licenseExpiresAt) : null }), ...(input.notes === undefined ? {} : { notes: input.notes?.trim() || null }) } as T;
}
