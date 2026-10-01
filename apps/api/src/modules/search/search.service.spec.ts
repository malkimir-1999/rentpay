import { describe, expect, it, vi } from 'vitest';
import { SearchService } from './search.service';
import type { PrismaService } from '../../infra/prisma.service';
import type { Actor } from '../identity/auth.types';

describe('tenant workspace search', () => {
  it('scopes every queried resource to the active business and its view permissions', async () => {
    const prisma = {
      vehicle: { findMany: vi.fn(async () => [{ id: 'vehicle-a', make: 'Toyota', model: 'Corolla', registrationNumber: 'A-1', condition: 'READY' }]) },
      customer: { findMany: vi.fn(async () => []) },
      reservation: { findMany: vi.fn(async () => []) },
      rental: { findMany: vi.fn(async () => []) },
    } as unknown as PrismaService;
    const service = new SearchService(prisma);
    const actor: Actor = { userId: 'staff-a', accountType: 'BUSINESS', businessId: 'business-a', permissions: ['vehicle.view'] };

    const result = await service.search(actor, { query: ' Toyota ' });

    expect(result.results.map((item) => item.id)).toEqual(['vehicle-a']);
    expect(prisma.vehicle.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ businessId: 'business-a', archivedAt: null }) }));
    expect(prisma.customer.findMany).not.toHaveBeenCalled();
    expect(prisma.reservation.findMany).not.toHaveBeenCalled();
    expect(prisma.rental.findMany).not.toHaveBeenCalled();
  });

  it('does no queries for a missing tenant or too-short query', async () => {
    const findMany = vi.fn();
    const prisma = { vehicle: { findMany }, customer: { findMany }, reservation: { findMany }, rental: { findMany } } as unknown as PrismaService;
    const service = new SearchService(prisma);
    const actor: Actor = { userId: 'staff-a', accountType: 'BUSINESS', permissions: ['vehicle.view', 'customer.view', 'reservation.view', 'rental.view'] };

    expect((await service.search(actor, { query: 'ab' })).results).toEqual([]);
    expect((await service.search({ ...actor, businessId: 'business-a' }, { query: 'a' })).results).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
