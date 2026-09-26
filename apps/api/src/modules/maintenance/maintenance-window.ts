import { Prisma } from '@prisma/client';

export function blockingMaintenance(businessId: string, startAt: Date, endAt: Date): Prisma.MaintenanceWorkOrderWhereInput {
  return {
    businessId,
    blocksAvailability: true,
    OR: [
      { status: 'IN_PROGRESS' },
      { status: 'PLANNED', scheduledStartAt: { lt: endAt }, expectedEndAt: { gt: startAt } },
    ],
  };
}
