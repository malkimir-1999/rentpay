import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LocalStorageProvider, UploadService } from './storage';
import type { PrismaService } from './prisma.service';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Y2cAAAAASUVORK5CYII=', 'base64');

function createService() {
  const provider = { put: vi.fn(), get: vi.fn(async () => png), remove: vi.fn() };
  const prisma = {
    fileAsset: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'asset-1', ...data })),
      findFirst: vi.fn(async () => null),
      delete: vi.fn(),
    },
  } as unknown as PrismaService;
  return { service: new UploadService(prisma, provider), provider, prisma };
}

describe('tenant file storage', () => {
  it('stores verified files under generated tenant-scoped keys', async () => {
    const { service, provider } = createService();
    const asset = await service.upload({ businessId: 'biz-a', actorBusinessId: 'biz-a', buffer: png, claimedMime: 'image/png' });
    expect(asset.key).toMatch(/^biz-a\/[0-9a-f-]+\.png$/i);
    expect(provider.put).toHaveBeenCalledWith(asset.key, png);
  });

  it('rejects tenant spoofing, unsupported content, and oversized files', async () => {
    const { service, provider } = createService();
    await expect(service.upload({ businessId: 'biz-b', actorBusinessId: 'biz-a', buffer: png, claimedMime: 'image/png' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.upload({ businessId: 'biz-a', actorBusinessId: 'biz-a', buffer: Buffer.from('not a document'), claimedMime: 'image/png' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.upload({ businessId: 'biz-a', actorBusinessId: 'biz-a', buffer: Buffer.alloc(10 * 1024 * 1024 + 1), claimedMime: 'image/png' })).rejects.toBeInstanceOf(BadRequestException);
    expect(provider.put).not.toHaveBeenCalled();
  });

  it('does not allow asset deletion across a tenant boundary', async () => {
    const { service, provider } = createService();
    await expect(service.delete('guessed-asset-id', 'biz-a')).rejects.toBeInstanceOf(ForbiddenException);
    expect(provider.remove).not.toHaveBeenCalled();
  });

  it('allows evidence download only when the asset is attached within the active tenant', async () => {
    const { service, provider, prisma } = createService();
    vi.mocked(prisma.fileAsset.findFirst).mockResolvedValueOnce({ key: 'biz-a/evidence.png', mimeType: 'image/png' } as never);
    await expect(service.downloadEvidence('asset-a', 'biz-a')).resolves.toMatchObject({ mimeType: 'image/png', bytes: png });
    expect(prisma.fileAsset.findFirst).toHaveBeenCalledWith({ where: { id: 'asset-a', businessId: 'biz-a', inspectionEvidence: { some: { businessId: 'biz-a' } } }, select: { key: true, mimeType: true } });
    expect(provider.get).toHaveBeenCalledWith('biz-a/evidence.png');
    await expect(service.downloadEvidence('asset-b', 'biz-a')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects storage keys that escape the configured root on every OS', async () => {
    const storage = new LocalStorageProvider('C:\\rentpay-test-storage');
    await expect(storage.put('../outside.txt', Buffer.from('blocked'))).rejects.toThrow('Invalid storage key');
  });
});
