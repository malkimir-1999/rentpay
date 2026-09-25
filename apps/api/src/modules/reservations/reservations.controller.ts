import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ReservationStatus } from '@prisma/client';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentActor, PermissionGuard, RequirePermission, TenantAccessGuard } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { ReservationsService, type CreateReservationInput } from './reservations.service';

class AvailabilityQueryDto {
  @IsISO8601() startAt!: string;
  @IsISO8601() endAt!: string;
  @IsOptional() @IsString() @MaxLength(100) locationId?: string;
}
class ReservationQueryDto { @IsOptional() @IsEnum(ReservationStatus) status?: ReservationStatus; }
class CreateReservationDto implements CreateReservationInput {
  @IsString() @MinLength(8) @MaxLength(100) customerId!: string;
  @IsString() @MinLength(8) @MaxLength(100) vehicleId!: string;
  @IsString() @MinLength(8) @MaxLength(100) pickupLocationId!: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(100) dropoffLocationId?: string;
  @IsISO8601() startAt!: string;
  @IsISO8601() endAt!: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
class TransitionReservationDto {
  @IsEnum(ReservationStatus) status!: ReservationStatus;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(500) reason?: string;
}

@Controller('business')
@UseGuards(AuthGuard, TenantAccessGuard, PermissionGuard)
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get('availability') @RequirePermission('vehicle.view')
  availability(@CurrentActor() actor: Actor, @Query() query: AvailabilityQueryDto) { return this.reservations.availability(actor, query.startAt, query.endAt, query.locationId); }

  @Get('reservations') @RequirePermission('reservation.view')
  list(@CurrentActor() actor: Actor, @Query() query: ReservationQueryDto) { return this.reservations.list(actor, query.status); }

  @Post('reservations') @RequirePermission('reservation.manage')
  create(@CurrentActor() actor: Actor, @Body() body: CreateReservationDto) { return this.reservations.create(actor, body); }

  @Get('reservations/:id') @RequirePermission('reservation.view')
  get(@CurrentActor() actor: Actor, @Param('id') id: string) { return this.reservations.get(actor, id); }

  @Patch('reservations/:id/status') @RequirePermission('reservation.manage')
  transition(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: TransitionReservationDto) { return this.reservations.transition(actor, id, body.status, body.reason); }

  @Post('reservations/:id/convert-to-rental') @RequirePermission('rental.manage')
  convertToRental(@CurrentActor() actor: Actor, @Param('id') id: string) { return this.reservations.convertToRental(actor, id); }
}
