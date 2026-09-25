export type ApiErrorCode = 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'BUSINESS_RULE_ERROR' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
export type ApiError = { error: { code: ApiErrorCode; message: string; details?: unknown; requestId?: string } };
export type ApiSuccess<T> = { data: T; requestId?: string };
