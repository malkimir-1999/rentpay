import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../modules/identity/auth.types';
import { appLogger } from './app.logger';
import type { ApiErrorCode } from '../../../../packages/contracts/src';
const codeByStatus: Record<number, ApiErrorCode> = { 400: 'VALIDATION_ERROR', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 429: 'RATE_LIMITED' };
@Catch()
export class ApiErrorFilter implements ExceptionFilter {
 catch(exception: unknown, host: ArgumentsHost) {
  const ctx = host.switchToHttp();
  const response = ctx.getResponse<Response>();
  const request = ctx.getRequest<AuthenticatedRequest>();
  const prismaCode = exception && typeof exception === 'object' && 'code' in exception ? (exception as { code?: string }).code : undefined;
  const status = exception instanceof HttpException ? exception.getStatus() : prismaCode === 'P2002' ? HttpStatus.CONFLICT : HttpStatus.INTERNAL_SERVER_ERROR;
  const original = exception instanceof HttpException ? exception.getResponse() : undefined;
  const message = typeof original === 'string' ? original : typeof original === 'object' && original && 'message' in original ? (original as { message: string | string[] }).message : status >= 500 ? 'An unexpected error occurred' : 'The request could not be completed';
  const code = status === 422 ? 'BUSINESS_RULE_ERROR' : codeByStatus[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'BUSINESS_RULE_ERROR');
  if (status >= 500) appLogger.error({ event: 'api_request_failed', requestId: request.requestId, status, exception: exception instanceof Error ? exception.name : 'UnknownError', ...(prismaCode ? { prismaCode } : {}) });
  response.status(status).json({ error: { code, message, ...(status === 400 && typeof message !== 'string' ? { details: message } : {}), requestId: request.requestId } });
 }
}
