import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infra/prisma.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/identity/auth.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { LocationsModule } from './modules/locations/locations.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { FinanceModule } from './modules/finance/finance.module';
import { RentalsModule } from './modules/rentals/rentals.module';
import { OperationsModule } from './modules/operations/operations.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { TeamModule } from './modules/team/team.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SearchModule } from './modules/search/search.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { RedisRateLimitStorage } from './infra/rate-limit.storage';
import { DevMailboxController } from './infra/dev-mailbox.controller';
import { RequestLoggingInterceptor } from './infra/request-logging.interceptor';
import { envSchema } from '../../../packages/config/src/env';
import { resolve } from 'node:path';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')], validate: (config) => envSchema.parse(config) }), PrismaModule, ThrottlerModule.forRootAsync({ useFactory: () => ({ throttlers: [{ ttl: 60000, limit: process.env.NODE_ENV === 'test' ? 1000 : 120 }], ...(process.env.REDIS_URL ? { storage: new RedisRateLimitStorage(process.env.REDIS_URL) } : {}) }) }), AuthModule, TenancyModule, FleetModule, LocationsModule, CustomersModule, ReservationsModule, FinanceModule, RentalsModule, OperationsModule, InspectionsModule, MaintenanceModule, TeamModule, NotificationsModule, ReportsModule, SearchModule], controllers: [HealthController, DevMailboxController], providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor }] })
export class AppModule {}
