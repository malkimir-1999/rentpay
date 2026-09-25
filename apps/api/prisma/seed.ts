import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/modules/identity/auth.service';
import { appLogger } from '../src/infra/app.logger';
const db = new PrismaClient();
const permissionKeys = ['dashboard.view','reservation.view','reservation.manage','rental.view','rental.checkout','rental.return','rental.manage','vehicle.view','vehicle.manage','customer.view','customer.manage','payment.view','payment.manage','deposit.manage','inspection.manage','maintenance.view','maintenance.manage','report.view','report.export','team.manage','settings.manage','audit.view'];
const rolePermissions: Record<string, string[]> = {
 OWNER: permissionKeys,
 ADMIN: permissionKeys,
 OPERATIONS_MANAGER: permissionKeys.filter((key) => !['payment.manage','team.manage','settings.manage'].includes(key)),
 RESERVATIONS: ['dashboard.view','reservation.view','reservation.manage','vehicle.view','customer.view','customer.manage'],
 FINANCE: ['dashboard.view','reservation.view','rental.view','payment.view','payment.manage','deposit.manage','report.view'],
 FLEET: ['dashboard.view','vehicle.view','vehicle.manage','inspection.manage','maintenance.view','maintenance.manage'],
 READ_ONLY: ['dashboard.view','reservation.view','rental.view','vehicle.view','customer.view','payment.view','report.view'],
};
async function main() {
 if (process.env.NODE_ENV === 'production') throw new Error('Development seed is disabled in production');
 const allPermissions = await Promise.all(permissionKeys.map((key) => db.permission.upsert({ where: { key }, update: {}, create: { key } })));
 for (const [key, keys] of Object.entries(rolePermissions)) {
  const role = await db.role.upsert({ where: { key }, update: { name: key.replaceAll('_', ' ') }, create: { key, name: key.replaceAll('_', ' ') } });
  const selected = allPermissions.filter((permission) => keys.includes(permission.key));
  await Promise.all(selected.map((permission) => db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {}, create: { roleId: role.id, permissionId: permission.id } })));
 }
 await db.plan.upsert({ where: { key: 'TRIAL' }, update: {}, create: { key: 'TRIAL', name: '30-day trial', amountMinor: 0, currency: 'PKR' } });
 const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@rentpay.local').toLowerCase();
 const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'RentPay-Local-Only-2026!';
 await db.user.upsert({ where: { email: adminEmail }, update: { passwordHash: await hashPassword(adminPassword), accountType: 'PLATFORM', platformRole: 'SUPER_ADMIN' }, create: { email: adminEmail, passwordHash: await hashPassword(adminPassword), accountType: 'PLATFORM', platformRole: 'SUPER_ADMIN', emailVerifiedAt: new Date() } });
 const ownerEmail = 'owner@rentpay.local';
 const owner = await db.user.upsert({ where: { email: ownerEmail }, update: { passwordHash: await hashPassword('RentPay-Local-Only-2026!'), accountType: 'BUSINESS', emailVerifiedAt: new Date() }, create: { email: ownerEmail, passwordHash: await hashPassword('RentPay-Local-Only-2026!'), accountType: 'BUSINESS', emailVerifiedAt: new Date() } });
 const business = await db.business.upsert({ where: { slug: 'sample-rentals' }, update: {}, create: { name: 'Sample Rentals', slug: 'sample-rentals' } });
 const ownerRole = await db.role.findUniqueOrThrow({ where: { key: 'OWNER' } });
 await db.businessMembership.upsert({ where: { userId_businessId: { userId: owner.id, businessId: business.id } }, update: { roleId: ownerRole.id, status: 'ACTIVE' }, create: { userId: owner.id, businessId: business.id, roleId: ownerRole.id } });
 const staff = await db.user.upsert({ where: { email: 'staff@rentpay.local' }, update: { passwordHash: await hashPassword('RentPay-Local-Only-2026!'), accountType: 'BUSINESS', emailVerifiedAt: new Date() }, create: { email: 'staff@rentpay.local', passwordHash: await hashPassword('RentPay-Local-Only-2026!'), accountType: 'BUSINESS', emailVerifiedAt: new Date() } });
 const staffRole = await db.role.findUniqueOrThrow({ where: { key: 'OPERATIONS_MANAGER' } });
 await db.businessMembership.upsert({ where: { userId_businessId: { userId: staff.id, businessId: business.id } }, update: { roleId: staffRole.id, status: 'ACTIVE' }, create: { userId: staff.id, businessId: business.id, roleId: staffRole.id } });
 await db.businessSettings.upsert({ where: { businessId: business.id }, update: {}, create: { businessId: business.id, timezone: 'Asia/Karachi', currency: 'PKR' } });
 const plan = await db.plan.findUniqueOrThrow({ where: { key: 'TRIAL' } });
 if (!await db.subscription.findFirst({ where: { businessId: business.id } })) await db.subscription.create({ data: { businessId: business.id, planId: plan.id, status: 'TRIALING', trialStartedAt: new Date(), trialEndsAt: new Date(Date.now() + 30 * 86400000) } });
 appLogger.info({ event: 'development_seed_complete', adminEmail, sampleBusinessId: business.id }, 'Development seed completed');
}
main().catch((error: unknown) => { appLogger.error({ event: 'development_seed_failed', error }, 'Development seed failed'); process.exitCode = 1; }).finally(() => db.$disconnect());
