import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service';
import type { PrismaService } from './prisma.service';

describe('notification event delivery', () => {
  it('persists an in-app event and records its delivery state', async () => {
    const prisma = { notification: { create: vi.fn(async () => ({ id: 'notice-1' })), update: vi.fn(async () => ({})) } } as unknown as PrismaService;
    const service = new NotificationsService(prisma);
    await expect(service.dispatch({ event: 'SUBSCRIPTION_REVIEW', channel: 'IN_APP', recipient: 'owner-1', subject: 'Payment reviewed', text: 'The payment was approved.', businessId: 'biz-1' })).resolves.toEqual({ status: 'DELIVERED' });
    expect(prisma.notification.create).toHaveBeenCalledWith({ data: { businessId: 'biz-1', recipientUserId: 'owner-1', event: 'SUBSCRIPTION_REVIEW', channel: 'IN_APP', status: 'QUEUED', title: 'Payment reviewed', message: 'The payment was approved.' } });
    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 'notice-1' }, data: { status: 'DELIVERED' } });
  });

  it('lists business notifications within the active tenant only', async () => {
    const findMany = vi.fn(async () => []);
    const prisma = { notification: { create: vi.fn(), update: vi.fn(), findMany } } as unknown as PrismaService;
    await new NotificationsService(prisma).listFor({ userId: 'user-1', accountType: 'BUSINESS', businessId: 'business-a' });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { recipientUserId: 'user-1', businessId: 'business-a' }, take: 50 }));
  });

  it('does not let platform identities use the tenant/customer notification inbox', async () => {
    const findMany = vi.fn(async () => []);
    const prisma = { notification: { findMany } } as unknown as PrismaService;
    await expect(new NotificationsService(prisma).listFor({ userId: 'admin-1', accountType: 'PLATFORM' })).rejects.toMatchObject({ status: 403 });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('requires a guard-established tenant context before business inbox access', async () => {
    const findMany = vi.fn(async () => []);
    const prisma = { notification: { findMany } } as unknown as PrismaService;
    await expect(new NotificationsService(prisma).listFor({ userId: 'user-1', accountType: 'BUSINESS' })).rejects.toMatchObject({ status: 409 });
    expect(findMany).not.toHaveBeenCalled();
  });
});
