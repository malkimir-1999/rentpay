import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
export type TenantRequest = { user?: { businessId?: string }; tenantId?: string };
@Injectable() export class TenantGuard implements CanActivate { canActivate(context: ExecutionContext) { const request = context.switchToHttp().getRequest<TenantRequest>(); if (!request.user?.businessId) throw new UnauthorizedException('A tenant membership is required'); request.tenantId = request.user.businessId; return true; } }
