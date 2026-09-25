import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
@Injectable()
export class AuditService {
 constructor(private readonly prisma: PrismaService) {}
 record(input: { businessId?: string; actorUserId?: string; action: string; entityType: string; entityId?: string; metadata?: Record<string, unknown>; ipAddress?: string }) {
  return this.prisma.auditEvent.create({ data: { ...input, metadata: input.metadata as object | undefined } });
 }
}
