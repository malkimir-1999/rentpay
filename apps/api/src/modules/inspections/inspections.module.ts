import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity/identity-access.module';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';

@Module({ imports: [IdentityAccessModule], controllers: [InspectionsController], providers: [InspectionsService] })
export class InspectionsModule {}
