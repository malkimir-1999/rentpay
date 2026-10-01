import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma.service';
import type { Actor } from '../identity/auth.types';

const assignableRoles = ['ADMIN', 'OPERATIONS_MANAGER', 'RESERVATIONS', 'FINANCE', 'FLEET', 'READ_ONLY'];

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  async list(businessId: string) {
    const [members, invitations, roles] = await Promise.all([
      this.prisma.businessMembership.findMany({ where: { businessId }, include: { user: { select: { id: true, name: true, email: true, createdAt: true } }, role: { select: { id: true, key: true, name: true } } }, orderBy: [{ status: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.invitation.findMany({ where: { businessId, acceptedAt: null, expiresAt: { gt: new Date() } }, include: { role: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.role.findMany({ where: { key: { in: assignableRoles } }, select: { id: true, key: true, name: true }, orderBy: { name: 'asc' } }),
    ]);
    return { members, invitations, roles };
  }

  async update(actor: Actor, membershipId: string, change: { roleId?: string; status?: 'ACTIVE' | 'SUSPENDED' }) {
    if (!actor.businessId || (!change.roleId && !change.status)) throw new ConflictException('Choose a role or a member status to update.');
    const businessId = actor.businessId;
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.businessMembership.findFirst({ where: { id: membershipId, businessId }, include: { role: true } });
      if (!member) throw new NotFoundException('Team member was not found.');
      if (member.role.key === 'OWNER') throw new ForbiddenException('The business owner cannot be changed here.');
      if (change.roleId) {
        const role = await tx.role.findFirst({ where: { id: change.roleId, key: { in: assignableRoles } } });
        if (!role) throw new ConflictException('Choose one of the available team roles.');
        if (role.key === 'ADMIN' && actor.roleKey !== 'OWNER') throw new ForbiddenException('Only the owner can assign an administrator role.');
      }
      const nextStatus = change.status ?? member.status;
      const nextRoleId = change.roleId ?? member.roleId;
      const updated = await tx.businessMembership.update({ where: { id: member.id }, data: { status: nextStatus, roleId: nextRoleId }, include: { user: { select: { id: true, name: true, email: true } }, role: { select: { id: true, key: true, name: true } } } });
      await tx.auditEvent.create({ data: { businessId, actorUserId: actor.userId, action: 'TEAM_MEMBERSHIP_UPDATED', entityType: 'BusinessMembership', entityId: member.id, metadata: { oldRole: member.role.key, newRoleId: nextRoleId, oldStatus: member.status, newStatus: nextStatus } } });
      return updated;
    });
  }
}
