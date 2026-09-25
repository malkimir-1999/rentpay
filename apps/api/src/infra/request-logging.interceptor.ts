import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { finalize } from 'rxjs/operators';
import { appLogger } from './app.logger';
import type { AuthenticatedRequest } from '../modules/identity/auth.types';
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
 intercept(context: ExecutionContext, next: CallHandler) {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  const started = Date.now();
  return next.handle().pipe(finalize(() => appLogger.info({ event: 'http_request', requestId: request.requestId, userId: request.actor?.userId, businessId: request.actor?.businessId, method: request.method, path: request.path, durationMs: Date.now() - started })));
 }
}
