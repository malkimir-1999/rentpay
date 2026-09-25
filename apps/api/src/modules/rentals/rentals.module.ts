import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity/identity-access.module';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';

@Module({ imports: [IdentityAccessModule], controllers: [RentalsController], providers: [RentalsService] })
export class RentalsModule {}
