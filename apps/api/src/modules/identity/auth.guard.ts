import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { PrismaService } from '../../infra/prisma.service';
import type { AuthenticatedRequest } from './auth.types';
@Injectable()
export class AuthGuard implements CanActivate {
 constructor(private readonly prisma: PrismaService) {}
 async canActivate(context: ExecutionContext) {
  const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) throw new UnauthorizedException();
  try {
   const claims = verify(token, secret, { issuer: 'rentpay-api', audience: 'rentpay' }) as { sub: string; kind: 'BUSINESS' | 'CUSTOMER' | 'PLATFORM'; jti?: string };
   const session = claims.jti ? await this.prisma.apiSession.findFirst({ where: { tokenId: claims.jti, userId: claims.sub, revokedAt: null, expiresAt: { gt: new Date() } } }) : null;
   if (!session) throw new UnauthorizedException();
   const user = await this.prisma.user.findUnique({ where: { id: claims.sub } });
   if (!user || user.accountType !== claims.kind) throw new UnauthorizedException();
   req.actor = { userId: user.id, accountType: user.accountType, platformRole: user.platformRole, permissions: [] };
   return true;
  } catch { throw new UnauthorizedException(); }
 }
}
