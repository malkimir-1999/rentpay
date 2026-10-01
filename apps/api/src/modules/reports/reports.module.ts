import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity/identity-access.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({ imports: [IdentityAccessModule], controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
