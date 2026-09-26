import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity/identity-access.module';
import { PublicReservationsController, ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({ imports: [IdentityAccessModule], controllers: [ReservationsController, PublicReservationsController], providers: [ReservationsService] })
export class ReservationsModule {}
