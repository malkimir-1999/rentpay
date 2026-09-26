import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity/identity-access.module';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({ imports: [IdentityAccessModule], controllers: [MaintenanceController], providers: [MaintenanceService] })
export class MaintenanceModule {}
