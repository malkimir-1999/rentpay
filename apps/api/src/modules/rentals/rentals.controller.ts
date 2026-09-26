import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RentalPaymentMethod, RentalStatus } from '@prisma/client';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentActor, PermissionGuard, RequirePermission, TenantAccessGuard } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { RentalsService } from './rentals.service';

class RentalQueryDto { @IsOptional() @IsEnum(RentalStatus) status?: RentalStatus; }
class CheckOutDto {
  @IsInt() @Min(0) @Max(2_000_000_000) odometerKm!: number;
  @IsInt() @Min(0) @Max(100) fuelPercent!: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
class CheckInDto extends CheckOutDto {
  @IsString() @MinLength(8) @MaxLength(100) returnLocationId!: string;
}
class ExtendRentalDto {
  @IsISO8601() expectedReturnAt!: string;
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}
class SettlementDto {
  @IsInt() @Min(0) @Max(2_000_000_000) additionalChargesMinor!: number;
  @IsInt() @Min(0) @Max(2_000_000_000) paymentReceivedMinor!: number;
  @IsEnum(RentalPaymentMethod) method!: RentalPaymentMethod;
  @IsOptional() @IsString() @MaxLength(160) reference?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

@Controller('business/rentals')
@UseGuards(AuthGuard, TenantAccessGuard, PermissionGuard)
export class RentalsController {
  constructor(private readonly rentals: RentalsService) {}

  @Get() @RequirePermission('rental.view')
  list(@CurrentActor() actor: Actor, @Query() query: RentalQueryDto) { return this.rentals.list(actor, query.status); }

  @Get('return-locations') @RequirePermission('rental.return')
  returnLocations(@CurrentActor() actor: Actor) { return this.rentals.returnLocations(actor); }

  @Get(':id') @RequirePermission('rental.view')
  get(@CurrentActor() actor: Actor, @Param('id') id: string) { return this.rentals.get(actor, id); }

  @Post(':id/checkout') @RequirePermission('rental.checkout')
  checkout(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: CheckOutDto) { return this.rentals.checkout(actor, id, body); }

  @Post(':id/return') @RequirePermission('rental.return')
  checkin(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: CheckInDto) { return this.rentals.checkin(actor, id, body); }

  @Patch(':id/extension') @RequirePermission('rental.manage')
  extend(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: ExtendRentalDto) { return this.rentals.extend(actor, id, body.expectedReturnAt, body.reason); }

  @Post(':id/settlement') @RequirePermission('rental.manage')
  settle(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: SettlementDto) { return this.rentals.settle(actor, id, body); }
}
