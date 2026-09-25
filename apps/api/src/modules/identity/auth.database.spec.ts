import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../infra/prisma.service';
import { NotificationsService, developmentMailbox } from '../../infra/notifications.service';
import { AuthService } from './auth.service';

process.env.AUTH_SECRET ??= 'rentpay-vitest-only-secret-with-more-than-thirty-two-characters';
const databaseUrl = process.env.DATABASE_URL;
describe.skipIf(!databaseUrl)('identity and tenant database foundation', () => {
 const prisma = new PrismaService();
 const auth = new AuthService(prisma, new NotificationsService(prisma));
 let identity: { userId: string; businessId: string };
 const email = 'phase1-' + Date.now() + '@example.test';
 beforeAll(async () => { await prisma.$connect(); identity = await auth.register({ email, password: 'RentPay-Database-Test-2026!', businessName: 'Phase 1 Test Rentals', name: 'Phase One Tester', termsAccepted: true }); });
 afterAll(async () => { await prisma.$disconnect(); });
 it('creates tenant, owner membership, settings, and an exact 30-day trial atomically', async () => {
  const [user, business, membership, settings, subscription] = await Promise.all([
   prisma.user.findUniqueOrThrow({ where: { id: identity.userId } }),
   prisma.business.findUniqueOrThrow({ where: { id: identity.businessId } }),
   prisma.businessMembership.findFirstOrThrow({ where: { userId: identity.userId, businessId: identity.businessId }, include: { role: true } }),
   prisma.businessSettings.findUniqueOrThrow({ where: { businessId: identity.businessId } }),
   prisma.subscription.findFirstOrThrow({ where: { businessId: identity.businessId } }),
  ]);
  expect(user.email).toBe(email);
  expect(business.name).toBe('Phase 1 Test Rentals');
  expect(membership.role.key).toBe('OWNER');
  expect(settings.currency).toBe('PKR');
  expect(subscription.status).toBe('TRIALING');
  expect(subscription.trialEndsAt!.getTime() - subscription.trialStartedAt!.getTime()).toBe(30 * 86400000);
 });
 it('verifies one-time email tokens and issues revocable authenticated sessions', async () => {
  const mail = [...developmentMailbox].reverse().find((entry) => entry.recipient === email && entry.event === 'EMAIL_VERIFICATION')!;
  const token = new URL(mail.text.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;
  await auth.verifyEmail(token);
  await expect(auth.verifyEmail(token)).rejects.toThrow();
  const result = await auth.login(email, 'RentPay-Database-Test-2026!');
  await auth.logout(result.accessToken);
  const revoked = await prisma.apiSession.findFirst({ where: { userId: identity.userId } });
  expect(revoked?.revokedAt).toBeTruthy();
 });
 it('prevents modification of audit history in the database', async () => {
  const event = await prisma.auditEvent.findFirstOrThrow({ where: { businessId: identity.businessId } });
  await expect(prisma.auditEvent.update({ where: { id: event.id }, data: { action: 'ALTERED' } })).rejects.toThrow(/immutable/i);
 });
});
