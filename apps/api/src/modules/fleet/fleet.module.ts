import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity/identity-access.module';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';

@Module({ imports: [IdentityAccessModule], controllers: [FleetController], providers: [FleetService] })
export class FleetModule {}
