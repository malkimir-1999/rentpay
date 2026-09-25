import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiErrorFilter } from './infra/api-error.filter';
import { requestContext } from './infra/request-context.middleware';
import { appLogger } from './infra/app.logger';
import { StructuredLogger } from './infra/structured-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(new StructuredLogger());
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], baseUri: ["'self'"], frameAncestors: ["'none'"], objectSrc: ["'none'"], imgSrc: ["'self'", 'data:', 'https:'], styleSrc: ["'self'", "'unsafe-inline'"], scriptSrc: ["'self'"], connectSrc: ["'self'", process.env.WEB_URL ?? 'http://localhost:3000'], formAction: ["'self'"], upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null } }, hsts: process.env.NODE_ENV === 'production' }));
  app.enableCors({ origin: process.env.WEB_URL ?? 'http://localhost:3000', credentials: false, allowedHeaders: ['content-type', 'authorization', 'x-business-id', 'x-request-id'] });
  app.use(requestContext);
  app.useGlobalFilters(new ApiErrorFilter());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: true }));
  appLogger.info({ event: 'api_started' }, 'RentPay API started');
  await app.listen(process.env.PORT ?? 4000, process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
}
void bootstrap();
