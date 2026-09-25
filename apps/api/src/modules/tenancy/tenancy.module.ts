import { Module } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';
import { CustomerController, PlatformController, TenantFilesController } from './resources.controller';
import { UploadService, LocalStorageProvider, STORAGE_PROVIDER } from '../../infra/storage';
import { resolve } from 'node:path';
import { AuthModule } from '../identity/auth.module';
import { IdentityAccessModule } from '../identity/identity-access.module';
import { TenantAdministrationController, PlatformPaymentsController, PlatformPlansController } from './resources.controller';
import { AuditService } from '../../infra/audit.service';
import { PakistanManualPaymentProvider, SUBSCRIPTION_PAYMENT_PROVIDER } from '../subscriptions/manual-payment.provider';
import { OnboardingController, PublicMarketingController } from '../onboarding/onboarding.controller';
@Module({ imports: [AuthModule, IdentityAccessModule], controllers: [PlatformController, CustomerController, TenantFilesController, TenantAdministrationController, PlatformPaymentsController, PlatformPlansController, OnboardingController, PublicMarketingController], providers: [TenantGuard, UploadService, AuditService, { provide: SUBSCRIPTION_PAYMENT_PROVIDER, useClass: PakistanManualPaymentProvider }, { provide: STORAGE_PROVIDER, useFactory: () => new LocalStorageProvider(resolve(process.cwd(), 'uploads')) }], exports: [TenantGuard] })
export class TenancyModule {}
