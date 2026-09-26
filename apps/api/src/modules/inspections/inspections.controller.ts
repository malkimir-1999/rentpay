import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DamageStatus, InspectionStage } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentActor, PermissionGuard, RequirePermission, TenantAccessGuard } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { InspectionsService } from './inspections.service';
import type { VehicleConditionChecklist } from '../../../../../packages/config/src/inspection';

class CreateInspectionDto {
  @IsString() @MinLength(8) @MaxLength(100) vehicleId!: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(100) rentalId?: string;
  @IsEnum(InspectionStage) stage!: InspectionStage;
  @IsObject() checklist!: VehicleConditionChecklist;
  @IsInt() @Min(0) @Max(2_000_000_000) odometerKm!: number;
  @IsInt() @Min(0) @Max(100) fuelPercent!: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) evidenceAssetIds?: string[];
}

class CreateDamageDto {
  @IsString() @MinLength(8) @MaxLength(100) vehicleId!: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(100) rentalId?: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(100) inspectionId?: string;
  @IsString() @MinLength(3) @MaxLength(120) title!: string;
  @IsString() @MinLength(10) @MaxLength(2000) description!: string;
  @IsOptional() @IsInt() @Min(0) @Max(2_000_000_000) estimatedMinor?: number;
}

class UpdateDamageDto {
  @IsEnum(DamageStatus) status!: DamageStatus;
  @IsOptional() @IsInt() @Min(0) @Max(2_000_000_000) estimatedMinor?: number;
  @IsOptional() @IsInt() @Min(0) @Max(2_000_000_000) finalMinor?: number;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(1000) resolutionNotes?: string;
}

@Controller('business/inspections')
@UseGuards(AuthGuard, TenantAccessGuard, PermissionGuard)
export class InspectionsController {
  constructor(private readonly inspections: InspectionsService) {}

  @Get() @RequirePermission('inspection.manage')
  list(@CurrentActor() actor: Actor, @Query('vehicleId') vehicleId?: string, @Query('rentalId') rentalId?: string) { return this.inspections.list(actor, { vehicleId, rentalId }); }

  @Post() @RequirePermission('inspection.manage')
  create(@CurrentActor() actor: Actor, @Body() body: CreateInspectionDto) { return this.inspections.createInspection(actor, body); }

  @Get('damage-cases') @RequirePermission('inspection.manage')
  damageCases(@CurrentActor() actor: Actor, @Query('status') status?: DamageStatus) { return this.inspections.listDamage(actor, status); }

  @Post('damage-cases') @RequirePermission('inspection.manage')
  createDamage(@CurrentActor() actor: Actor, @Body() body: CreateDamageDto) { return this.inspections.createDamage(actor, body); }

  @Patch('damage-cases/:id') @RequirePermission('inspection.manage')
  updateDamage(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: UpdateDamageDto) { return this.inspections.updateDamage(actor, id, body); }
}
