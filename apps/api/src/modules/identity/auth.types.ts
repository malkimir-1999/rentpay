import type { Request } from 'express';
export type Actor = { userId: string; accountType: 'BUSINESS' | 'CUSTOMER' | 'PLATFORM'; businessId?: string; roleId?: string; roleKey?: string; permissions: string[]; platformRole?: 'SUPER_ADMIN' | 'SUPPORT' | null };
export type AuthenticatedRequest = Request & { actor?: Actor; requestId?: string };
