import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeamService } from './team.service';
import type { PrismaService } from '../../infra/prisma.service';
import type { Actor } from '../identity/auth.types';

const owner: Actor = { userId: 'owner-a', accountType: 'BUSINESS', businessId: 'business-a', roleKey: 'OWNER', permissions: ['team.manage'] };

function setup(member: Record<string, unknown> | null) {
  const tx = {
    businessMembership: { findFirst: vi.fn(async () => member), update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...member, ...data })) },
    role: { findFirst: vi.fn(async () => ({ id: 'role-ops', key: 'OPERATIONS_MANAGER' })) },
    auditEvent: { create: vi.fn(async () => ({ id: 'audit-1' })) },
  };
  const prisma = { $transaction: vi.fn(async (work: (client: typeof tx) => unknown) => work(tx)), businessMembership: { findMany: vi.fn(), }, invitation: { findMany: vi.fn(), }, role: { findMany: vi.fn() } };
  return { service: new TeamService(prisma as unknown as PrismaService), tx, prisma };
}

describe('tenant team administration', () => {
  it('lists only records for the trusted business context', async () => {
    const memberQuery = vi.fn(async () => []);
    const prisma = { businessMembership: { findMany: memberQuery }, invitation: { findMany: vi.fn(async () => []) }, role: { findMany: vi.fn(async () => []) } } as unknown as PrismaService;
    const service = new TeamService(prisma);
    await service.list('business-a');
    expect(memberQuery).toHaveBeenCalledWith(expect.objectContaining({ where: { businessId: 'business-a' } }));
  });

  it('cannot update a guessed member ID from another business', async () => {
    const { service, tx } = setup(null);
    await expect(service.update(owner, 'guessed-member', { status: 'SUSPENDED' })).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.businessMembership.findFirst).toHaveBeenCalledWith({ where: { id: 'guessed-member', businessId: 'business-a' }, include: { role: true } });
    expect(tx.businessMembership.update).not.toHaveBeenCalled();
  });

  it('protects the owner membership from role and status changes', async () => {
    const { service, tx } = setup({ id: 'member-owner', businessId: 'business-a', roleId: 'owner-role', status: 'ACTIVE', role: { key: 'OWNER' } });
    await expect(service.update(owner, 'member-owner', { status: 'SUSPENDED' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.businessMembership.update).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });

  it('updates a tenant member and writes the audit event in the same transaction', async () => {
    const { service, tx } = setup({ id: 'member-staff', businessId: 'business-a', roleId: 'role-old', status: 'ACTIVE', role: { key: 'RESERVATIONS' } });
    await service.update(owner, 'member-staff', { roleId: 'role-ops', status: 'SUSPENDED' });
    expect(tx.businessMembership.update).toHaveBeenCalledWith({ where: { id: 'member-staff' }, data: { roleId: 'role-ops', status: 'SUSPENDED' }, include: expect.any(Object) });
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ businessId: 'business-a', actorUserId: 'owner-a', action: 'TEAM_MEMBERSHIP_UPDATED' }) }));
  });
});
