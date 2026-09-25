import type { LoggerService } from '@nestjs/common';
import { appLogger } from './app.logger';
export class StructuredLogger implements LoggerService {
 log(message: unknown, context?: string) { appLogger.info({ context, message }); }
 error(message: unknown, stack?: string, context?: string) { appLogger.error({ context, message, stack }); }
 warn(message: unknown, context?: string) { appLogger.warn({ context, message }); }
 debug(message: unknown, context?: string) { appLogger.debug({ context, message }); }
 verbose(message: unknown, context?: string) { appLogger.trace({ context, message }); }
 fatal(message: unknown, context?: string) { appLogger.fatal({ context, message }); }
}
