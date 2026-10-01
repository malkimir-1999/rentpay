import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { sign, verify } from 'jsonwebtoken';
import { PrismaService } from '../../infra/prisma.service';
import type { PermissionKey } from './permissions';
import { NotificationsService } from '../../infra/notifications.service';
import { appLogger } from '../../infra/app.logger';
import { countries, type CountryCode } from '../../../../../packages/config/src/countries';

const scrypt = promisify(scryptCallback);
const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
const normalizedEmail = (value: string) => value.trim().toLowerCase();

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async register(input: { email: string; password: string; businessName: string; name: string; phone?: string; country?: CountryCode; termsAccepted: boolean }) {
    if (!input.termsAccepted) throw new ConflictException('Please accept the terms to create your account.');
    const email = normalizedEmail(input.email);
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('An account with this email already exists');
    const passwordHash = await hashPassword(input.password);
    const slugBase = input.businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'rental-business';
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const country = input.country ?? 'PK';
      const user = await tx.user.create({ data: { email, name: input.name.trim(), phone: input.phone?.trim(), termsAcceptedAt: now, termsVersion: '2026-09-23', passwordHash, accountType: 'BUSINESS' } });
      const business = await tx.business.create({ data: { name: input.businessName.trim(), email, phone: input.phone?.trim(), country, slug: `${slugBase}-${randomBytes(3).toString('hex')}` } });
      const owner = await tx.role.findUniqueOrThrow({ where: { key: 'OWNER' } });
      await tx.businessMembership.create({ data: { userId: user.id, businessId: business.id, roleId: owner.id } });
      const plan = await tx.plan.findFirstOrThrow({ where: { key: 'TRIAL' } });
      await tx.subscription.create({ data: { businessId: business.id, status: 'TRIALING', trialStartedAt: now, trialEndsAt: new Date(now.getTime() + 30 * 86400000), planId: plan.id } });
      const defaults = countries[country];
      await tx.businessSettings.create({ data: { businessId: business.id, country, timezone: defaults.timezone, currency: defaults.currency, enabledRentalPaymentMethods: [...defaults.rentalPaymentMethods] } });
      await tx.auditEvent.create({ data: { businessId: business.id, actorUserId: user.id, action: 'BUSINESS_REGISTERED', entityType: 'Business', entityId: business.id } });
      const raw = randomBytes(32).toString('base64url');
      await tx.authToken.create({ data: { userId: user.id, purpose: 'EMAIL_VERIFICATION', tokenHash: tokenHash(raw), expiresAt: new Date(Date.now() + 86400000) } });
      return { userId: user.id, businessId: business.id, email: user.email, raw };
    });
    try { await this.notifications.dispatch({ event: 'EMAIL_VERIFICATION', channel: 'EMAIL', recipient: result.email, subject: 'Verify your RentPay email', text: `Verify your email: ${process.env.WEB_URL ?? 'http://localhost:3000'}/verify-email?token=${result.raw}`, businessId: result.businessId }); }
    catch { appLogger.error({ event: 'verification_email_delivery_failed', userId: result.userId }); }
    return { userId: result.userId, businessId: result.businessId };
  }

  async login(emailInput: string, password: string, accountType?: 'BUSINESS' | 'CUSTOMER' | 'PLATFORM') {
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail(emailInput) }, include: { memberships: { where: { status: 'ACTIVE' }, include: { business: true, role: { include: { permissions: { include: { permission: true } } } } } } } });
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash)) || !user.emailVerifiedAt || (accountType && user.accountType !== accountType)) {
      appLogger.warn({ event: 'security_auth_denied', reason: 'invalid_credentials_or_unverified', requestedAccountType: accountType ?? 'unspecified' });
      throw new UnauthorizedException('Email or password is incorrect');
    }
    const membership = user.memberships[0];
    const claims = { sub: user.id, kind: user.accountType, businessId: membership?.businessId, platformRole: user.platformRole };
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 32) throw new Error('AUTH_SECRET must contain at least 32 characters');
    const tokenId = randomUUID();
    const accessTokenExpiresAt = Date.now() + 15 * 60000;
    const accessToken = sign(claims, secret, { expiresIn: '15m', issuer: 'rentpay-api', audience: 'rentpay', jwtid: tokenId });
    await this.prisma.apiSession.create({ data: { userId: user.id, tokenId, expiresAt: new Date(Date.now() + 8 * 3600000) } });
    return { accessToken, accessTokenExpiresAt, user: { id: user.id, email: user.email, accountType: user.accountType, businessId: membership?.businessId, role: membership?.role.key, permissions: membership?.role.permissions.map((item) => item.permission.key as PermissionKey) ?? [], platformRole: user.platformRole } };
  }

  async logout(accessToken?: string) {
    if (!accessToken) return;
    const secret = process.env.AUTH_SECRET;
    if (!secret) return;
    try {
      const claims = verify(accessToken, secret, { issuer: 'rentpay-api', audience: 'rentpay', ignoreExpiration: true }) as { jti?: string };
      if (claims.jti) await this.prisma.apiSession.updateMany({ where: { tokenId: claims.jti, revokedAt: null }, data: { revokedAt: new Date() } });
    } catch { /* Logout remains idempotent for expired or invalid tokens. */ }
  }

  async refresh(accessToken: string) {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new UnauthorizedException();
    let claims: { sub: string; kind: 'BUSINESS' | 'CUSTOMER' | 'PLATFORM'; businessId?: string; platformRole?: string; jti?: string };
    try { claims = verify(accessToken, secret, { issuer: 'rentpay-api', audience: 'rentpay', ignoreExpiration: true }) as typeof claims; }
    catch { throw new UnauthorizedException(); }
    if (!claims.jti) throw new UnauthorizedException();
    const current = await this.prisma.apiSession.findFirst({ where: { tokenId: claims.jti, userId: claims.sub, revokedAt: null, expiresAt: { gt: new Date() } } });
    if (!current) throw new UnauthorizedException();
    const nextId = randomUUID();
    const rotated = await this.prisma.apiSession.updateMany({ where: { id: current.id, tokenId: current.tokenId, revokedAt: null }, data: { tokenId: nextId } });
    if (!rotated.count) throw new UnauthorizedException();
    return { accessToken: sign({ sub: claims.sub, kind: claims.kind, businessId: claims.businessId, platformRole: claims.platformRole }, secret, { expiresIn: '15m', issuer: 'rentpay-api', audience: 'rentpay', jwtid: nextId }), accessTokenExpiresAt: Date.now() + 15 * 60000 };
  }

  async createOneTimeToken(userId: string, purpose: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION') {
    const raw = randomBytes(32).toString('base64url');
    await this.prisma.authToken.create({ data: { userId, purpose, tokenHash: tokenHash(raw), expiresAt: new Date(Date.now() + (purpose === 'PASSWORD_RESET' ? 3600000 : 86400000)) } });
    return raw;
  }

  async requestPasswordReset(emailInput: string) {
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail(emailInput) } });
    if (!user) return;
    const raw = await this.createOneTimeToken(user.id, 'PASSWORD_RESET');
    await this.notifications.dispatch({ event: 'PASSWORD_RESET', channel: 'EMAIL', recipient: user.email, subject: 'Reset your RentPay password', text: `Reset your password: ${process.env.WEB_URL ?? 'http://localhost:3000'}/reset-password?token=${raw}` });
  }

  async consumeToken(raw: string, purpose: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION') {
    const hashed = tokenHash(raw);
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.authToken.findUnique({ where: { tokenHash: hashed } });
      if (!record || record.purpose !== purpose || record.consumedAt || record.expiresAt <= new Date()) throw new UnauthorizedException('This link is invalid or has expired');
      const changed = await tx.authToken.updateMany({ where: { id: record.id, consumedAt: null }, data: { consumedAt: new Date() } });
      if (changed.count !== 1) throw new UnauthorizedException('This link has already been used');
      return record.userId;
    });
  }

  async resetPassword(raw: string, password: string) {
    const userId = await this.consumeToken(raw, 'PASSWORD_RESET');
    await this.prisma.$transaction([this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } }), this.prisma.apiSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }), this.prisma.auditEvent.create({ data: { actorUserId: userId, action: 'PASSWORD_RESET', entityType: 'User', entityId: userId } })]);
  }

  async verifyEmail(raw: string) {
    await this.prisma.$transaction(async (tx) => {
      const token = await tx.authToken.findUnique({ where: { tokenHash: tokenHash(raw) } });
      if (!token || token.purpose !== 'EMAIL_VERIFICATION' || token.consumedAt || token.expiresAt <= new Date()) throw new UnauthorizedException('This link is invalid or has expired');
      const consumed = await tx.authToken.updateMany({ where: { id: token.id, consumedAt: null }, data: { consumedAt: new Date() } });
      if (consumed.count !== 1) throw new UnauthorizedException('This link has already been used');
      const userId = token.userId;
      const user = await tx.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() }, select: { id: true, email: true, accountType: true } });
      if (user.accountType !== 'CUSTOMER') return;
      const profiles = await tx.customer.findMany({ where: { email: user.email, userId: null }, select: { id: true, businessId: true } });
      for (const profile of profiles) {
        const alreadyLinked = await tx.customer.findFirst({ where: { businessId: profile.businessId, userId: user.id }, select: { id: true } });
        if (alreadyLinked) continue;
        await tx.customer.update({ where: { id: profile.id }, data: { userId: user.id } });
        await tx.auditEvent.create({ data: { businessId: profile.businessId, actorUserId: user.id, action: 'CUSTOMER_ACCOUNT_LINKED', entityType: 'Customer', entityId: profile.id } });
      }
    });
  }

  async acceptInvitation(raw: string, password: string, name?: string) {
    const hashed = tokenHash(raw);
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.invitation.findUnique({ where: { tokenHash: hashed } });
      if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) throw new UnauthorizedException('This invitation is invalid or has expired');
      const email = normalizedEmail(invite.email);
      let user = await tx.user.findUnique({ where: { email } });
      if (!user) user = await tx.user.create({ data: { email, name: name?.trim(), accountType: 'BUSINESS', passwordHash: await hashPassword(password), emailVerifiedAt: new Date() } });
      await tx.businessMembership.create({ data: { userId: user.id, businessId: invite.businessId, roleId: invite.roleId } });
      await tx.invitation.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
      await tx.auditEvent.create({ data: { businessId: invite.businessId, actorUserId: user.id, action: 'INVITATION_ACCEPTED', entityType: 'BusinessMembership', entityId: user.id } });
      return { userId: user.id, businessId: invite.businessId };
    });
  }

  async registerCustomer(emailInput: string, password: string) {
    const email = normalizedEmail(emailInput);
    const user = await this.prisma.user.create({ data: { email, passwordHash: await hashPassword(password), accountType: 'CUSTOMER' }, select: { id: true, email: true, accountType: true } });
    const raw = await this.createOneTimeToken(user.id, 'EMAIL_VERIFICATION');
    await this.notifications.dispatch({ event: 'EMAIL_VERIFICATION', channel: 'EMAIL', recipient: user.email, subject: 'Verify your RentPay email', text: `Verify your email: ${process.env.WEB_URL ?? 'http://localhost:3000'}/verify-email?token=${raw}` });
    return user;
  }

  async resendVerification(emailInput: string) {
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail(emailInput) } });
    if (!user || user.emailVerifiedAt) return;
    const raw = await this.createOneTimeToken(user.id, 'EMAIL_VERIFICATION');
    await this.notifications.dispatch({ event: 'EMAIL_VERIFICATION', channel: 'EMAIL', recipient: user.email, subject: 'Verify your RentPay email', text: `Verify your email: ${process.env.WEB_URL ?? 'http://localhost:3000'}/verify-email?token=${raw}` });
  }

  async createInvitation(input: { businessId: string; email: string; roleId: string; createdById: string }) {
    const role = await this.prisma.role.findUnique({ where: { id: input.roleId } });
    if (!role || ['OWNER', 'ADMIN'].includes(role.key)) throw new UnauthorizedException('This role cannot be assigned through an invitation');
    const raw = randomBytes(32).toString('base64url');
    const invite = await this.prisma.invitation.create({ data: { ...input, email: normalizedEmail(input.email), tokenHash: tokenHash(raw), expiresAt: new Date(Date.now() + 7 * 86400000) } });
    await this.notifications.dispatch({ event: 'INVITATION', channel: 'EMAIL', recipient: invite.email, subject: 'You are invited to RentPay', text: `Accept your invitation: ${process.env.WEB_URL ?? 'http://localhost:3000'}/invite?token=${raw}`, businessId: input.businessId });
    await this.prisma.auditEvent.create({ data: { businessId: input.businessId, actorUserId: input.createdById, action: 'INVITATION_CREATED', entityType: 'Invitation', entityId: invite.id } });
    return { id: invite.id, expiresAt: invite.expiresAt };
  }

  async invitationDetails(raw: string) {
    const invite = await this.prisma.invitation.findUnique({ where: { tokenHash: tokenHash(raw) }, include: { business: { select: { name: true } }, role: { select: { name: true } } } });
    if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) throw new UnauthorizedException('This invitation is invalid or has expired');
    const existingUser = await this.prisma.user.findUnique({ where: { email: normalizedEmail(invite.email) }, select: { id: true } });
    return { email: invite.email, businessName: invite.business.name, roleName: invite.role.name, existingUser: Boolean(existingUser) };
  }
}
