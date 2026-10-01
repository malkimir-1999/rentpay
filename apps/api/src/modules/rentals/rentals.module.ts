import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity/identity-access.module';
import { AuthModule } from '../identity/auth.module';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';

@Module({ imports: [IdentityAccessModule, AuthModule], controllers: [RentalsController], providers: [RentalsService] })
export class RentalsModule {}
