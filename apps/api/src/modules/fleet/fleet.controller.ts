import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { VehicleCondition } from '@prisma/client';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentActor, PermissionGuard, RequirePermission, TenantAccessGuard } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { FleetService, type CreateVehicleInput, type UpdateVehicleInput } from './fleet.service';

class FleetQueryDto {
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @IsEnum(VehicleCondition) condition?: VehicleCondition;
  @IsOptional() @IsString() @MaxLength(100) locationId?: string;
}

class CreateVehicleDto implements CreateVehicleInput {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(1) @MaxLength(60) make!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(1) @MaxLength(60) model!: string;
  @IsOptional() @IsString() @MaxLength(80) variant?: string;
  @IsOptional() @IsInt() @Min(1950) @Max(new Date().getUTCFullYear() + 2) year?: number;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(2) @MaxLength(24) registrationNumber!: string;
  @IsOptional() @IsString() @MaxLength(40) vin?: string;
  @IsOptional() @IsString() @MaxLength(40) color?: string;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @IsInTransmission() transmission?: string;
  @IsOptional() @IsInFuelType() fuelType?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) seats?: number;
  @IsOptional() @IsInt() @Min(0) odometerKm?: number;
  @IsOptional() @IsEnum(VehicleCondition) condition?: VehicleCondition;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsInt() @Min(0) dailyRateMinor!: number;
  @IsOptional() @IsInt() @Min(0) weeklyRateMinor?: number;
  @IsOptional() @IsInt() @Min(0) monthlyRateMinor?: number;
  @IsOptional() @IsInt() @Min(0) depositMinor?: number;
  @IsOptional() @IsString() @MaxLength(100) locationId?: string;
}

class UpdateVehicleDto implements UpdateVehicleInput {
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(1) @MaxLength(60) make?: string;
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(1) @MaxLength(60) model?: string;
  @IsOptional() @IsString() @MaxLength(80) variant?: string;
  @IsOptional() @IsInt() @Min(1950) @Max(new Date().getUTCFullYear() + 2) year?: number;
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(2) @MaxLength(24) registrationNumber?: string;
  @IsOptional() @IsString() @MaxLength(40) vin?: string;
  @IsOptional() @IsString() @MaxLength(40) color?: string;
  @IsOptional() @IsString() @MaxLength(60) category?: string;
  @IsOptional() @IsInTransmission() transmission?: string;
  @IsOptional() @IsInFuelType() fuelType?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) seats?: number;
  @IsOptional() @IsInt() @Min(0) odometerKm?: number;
  @IsOptional() @IsEnum(VehicleCondition) condition?: VehicleCondition;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsInt() @Min(0) dailyRateMinor?: number;
  @IsOptional() @IsInt() @Min(0) weeklyRateMinor?: number;
  @IsOptional() @IsInt() @Min(0) monthlyRateMinor?: number;
  @IsOptional() @IsInt() @Min(0) depositMinor?: number;
  @IsOptional() @IsString() @MaxLength(100) locationId?: string;
}

function IsInTransmission() {
  return Matches(/^(MANUAL|AUTOMATIC|CVT|OTHER)$/);
}

function IsInFuelType() {
  return Matches(/^(PETROL|DIESEL|HYBRID|ELECTRIC|CNG|LPG|OTHER)$/);
}

@Controller('business/fleet')
@UseGuards(AuthGuard, TenantAccessGuard, PermissionGuard)
export class FleetController {
  constructor(private readonly fleet: FleetService) {}

  @Get('options')
  @RequirePermission('vehicle.view')
  options(@CurrentActor() actor: Actor) {
    return this.fleet.options(actor);
  }

  @Get()
  @RequirePermission('vehicle.view')
  list(@CurrentActor() actor: Actor, @Query() query: FleetQueryDto) {
    return this.fleet.list(actor, query);
  }

  @Post()
  @RequirePermission('vehicle.manage')
  create(@CurrentActor() actor: Actor, @Body() body: CreateVehicleDto) {
    return this.fleet.create(actor, body);
  }

  @Get(':id')
  @RequirePermission('vehicle.view')
  get(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.fleet.get(actor, id);
  }

  @Patch(':id')
  @RequirePermission('vehicle.manage')
  update(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: UpdateVehicleDto) {
    return this.fleet.update(actor, id, body);
  }

  @Delete(':id')
  @RequirePermission('vehicle.manage')
  archive(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.fleet.archive(actor, id);
  }
}
