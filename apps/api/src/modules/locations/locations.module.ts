import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity/identity-access.module';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({ imports: [IdentityAccessModule], controllers: [LocationsController], providers: [LocationsService] })
export class LocationsModule {}
