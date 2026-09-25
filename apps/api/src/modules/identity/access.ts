import { SetMetadata, createParamDecorator, ExecutionContext, ForbiddenException, CanActivate, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../infra/prisma.service';
import type { AuthenticatedRequest, Actor } from './auth.types';
export const REQUIRED_PERMISSION = 'required_permission';
export const RequirePermission = (permission: string) => SetMetadata(REQUIRED_PERMISSION, permission);
export const CurrentActor = createParamDecorator((_data: unknown, context: ExecutionContext) => context.switchToHttp().getRequest<AuthenticatedRequest>().actor);
@Injectable()
export class TenantAccessGuard implements CanActivate {
 constructor(private readonly prisma: PrismaService) {}
 async canActivate(context: ExecutionContext) {
  const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
  const actor = req.actor;
  if (!actor || actor.accountType !== 'BUSINESS') throw new ForbiddenException();
  const requested = req.headers['x-business-id'];
  const membership = await this.prisma.businessMembership.findFirst({ where: { userId: actor.userId, businessId: typeof requested === 'string' ? requested : undefined, status: 'ACTIVE' }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
  if (!membership) throw new ForbiddenException();
  actor.businessId = membership.businessId;
  actor.roleId = membership.roleId;
  actor.roleKey = membership.role.key;
  actor.permissions = membership.role.permissions.map((entry) => entry.permission.key);
  req.actor = actor;
  return true;
 }
}
@Injectable()
export class PermissionGuard implements CanActivate {
 constructor(private readonly reflector: Reflector) {}
 canActivate(context: ExecutionContext) {
  const required = this.reflector.getAllAndOverride<string>(REQUIRED_PERMISSION, [context.getHandler(), context.getClass()]);
  if (!required) return true;
  const actor = context.switchToHttp().getRequest<AuthenticatedRequest>().actor as Actor | undefined;
  if (!actor?.permissions.includes(required)) throw new ForbiddenException();
  return true;
 }
}
@Injectable()
export class PlatformGuard implements CanActivate {
 canActivate(context: ExecutionContext) { const actor = context.switchToHttp().getRequest<AuthenticatedRequest>().actor; if (actor?.accountType !== 'PLATFORM' || actor.platformRole !== 'SUPER_ADMIN') throw new ForbiddenException(); return true; }
}
@Injectable()
export class CustomerGuard implements CanActivate {
 canActivate(context: ExecutionContext) { const actor = context.switchToHttp().getRequest<AuthenticatedRequest>().actor; if (actor?.accountType !== 'CUSTOMER') throw new ForbiddenException(); return true; }
}
