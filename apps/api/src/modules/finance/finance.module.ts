import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity/identity-access.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({ imports: [IdentityAccessModule], controllers: [FinanceController], providers: [FinanceService] })
export class FinanceModule {}
