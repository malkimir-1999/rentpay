import { Injectable, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink, readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import { PrismaService } from './prisma.service';
const allowed = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const maxBytes = 10 * 1024 * 1024;
export interface StoredFile { key: string; provider: string; }
export interface StorageProvider { put(key: string, bytes: Buffer): Promise<void>; get(key: string): Promise<Buffer>; remove(key: string): Promise<void>; }
export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
export class LocalStorageProvider implements StorageProvider {
 constructor(private readonly root: string) {}
 private targetFor(key: string) {
  const root = resolve(this.root);
  const target = resolve(root, key);
  const pathFromRoot = relative(root, target);
  if (!pathFromRoot || pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) throw new Error('Invalid storage key');
  return target;
 }
 async put(key: string, bytes: Buffer) { const target = this.targetFor(key); await mkdir(dirname(target), { recursive: true }); await writeFile(target, bytes, { flag: 'wx' }); }
 async get(key: string) { return readFile(this.targetFor(key)); }
 async remove(key: string) { await unlink(this.targetFor(key)); }
}
@Injectable()
export class UploadService {
 constructor(private readonly prisma: PrismaService, @Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}
 async upload(input: { businessId?: string; actorBusinessId?: string; buffer: Buffer; claimedMime: string }) {
  if (!input.actorBusinessId || input.actorBusinessId !== input.businessId) throw new ForbiddenException();
  if (!input.buffer.length || input.buffer.length > maxBytes) throw new BadRequestException('File must be smaller than 10 MB');
  const detected = await fileTypeFromBuffer(input.buffer);
  if (!detected || !allowed.has(detected.mime) || input.claimedMime !== detected.mime) throw new BadRequestException('Only verified JPEG, PNG, and PDF files are accepted');
  const key = `${input.actorBusinessId}/${randomUUID()}.${detected.ext}`;
  await this.provider.put(key, input.buffer);
  return this.prisma.fileAsset.create({ data: { businessId: input.actorBusinessId, provider: 'configured', key, mimeType: detected.mime, sizeBytes: input.buffer.length } });
 }
 async delete(assetId: string, actorBusinessId: string) {
  const asset = await this.prisma.fileAsset.findFirst({ where: { id: assetId, businessId: actorBusinessId } });
  if (!asset) throw new ForbiddenException();
  await this.provider.remove(asset.key);
  await this.prisma.fileAsset.delete({ where: { id: asset.id } });
 }

 async downloadEvidence(assetId: string, actorBusinessId: string) {
  const asset = await this.prisma.fileAsset.findFirst({ where: { id: assetId, businessId: actorBusinessId, inspectionEvidence: { some: { businessId: actorBusinessId } } }, select: { key: true, mimeType: true } });
  if (!asset) throw new ForbiddenException();
  try { return { ...asset, bytes: await this.provider.get(asset.key) }; }
  catch { throw new BadRequestException('This evidence file is temporarily unavailable.'); }
 }
}
