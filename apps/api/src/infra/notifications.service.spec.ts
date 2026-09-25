import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service';
import type { PrismaService } from './prisma.service';

describe('notification event delivery', () => {
  it('persists an in-app event and records its delivery state', async () => {
    const prisma = { notification: { create: vi.fn(async () => ({ id: 'notice-1' })), update: vi.fn(async () => ({})) } } as unknown as PrismaService;
    const service = new NotificationsService(prisma);
    await expect(service.dispatch({ event: 'SUBSCRIPTION_REVIEW', channel: 'IN_APP', recipient: 'owner-1', subject: 'Payment reviewed', text: 'The payment was approved.', businessId: 'biz-1' })).resolves.toEqual({ status: 'DELIVERED' });
    expect(prisma.notification.create).toHaveBeenCalledWith({ data: { businessId: 'biz-1', event: 'SUBSCRIPTION_REVIEW', channel: 'IN_APP', status: 'QUEUED' } });
    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 'notice-1' }, data: { status: 'DELIVERED' } });
  });
});
