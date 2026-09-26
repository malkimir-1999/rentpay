import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MaintenanceStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentActor, PermissionGuard, RequirePermission, TenantAccessGuard } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { MaintenanceService } from './maintenance.service';

class WorkOrderDto {
  @IsString() @MinLength(8) @MaxLength(100) vehicleId!: string;
  @IsString() @MinLength(3) @MaxLength(120) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() dueAt?: string;
  @IsOptional() @IsInt() @Min(0) @Max(2_000_000_000) dueOdometerKm?: number;
  @IsOptional() @IsString() scheduledStartAt?: string;
  @IsOptional() @IsString() expectedEndAt?: string;
  @IsBoolean() blocksAvailability!: boolean;
  @IsOptional() @IsString() @MaxLength(120) vendorName?: string;
  @IsOptional() @IsInt() @Min(0) @Max(2_000_000_000) estimatedCostMinor?: number;
}

class UpdateWorkOrderDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() dueAt?: string;
  @IsOptional() @IsInt() @Min(0) @Max(2_000_000_000) dueOdometerKm?: number;
  @IsOptional() @IsString() scheduledStartAt?: string;
  @IsOptional() @IsString() expectedEndAt?: string;
  @IsOptional() @IsBoolean() blocksAvailability?: boolean;
  @IsOptional() @IsString() @MaxLength(120) vendorName?: string;
  @IsOptional() @IsInt() @Min(0) @Max(2_000_000_000) estimatedCostMinor?: number;
}

class FinishDto {
  @IsString() @MinLength(3) @MaxLength(2000) completionNotes!: string;
  @IsOptional() @IsInt() @Min(0) @Max(2_000_000_000) actualCostMinor?: number;
}

class CancelDto { @IsString() @MinLength(3) @MaxLength(2000) reason!: string; }
class WorkOrderQueryDto { @IsOptional() @IsEnum(MaintenanceStatus) status?: MaintenanceStatus; }

@Controller('business/maintenance')
@UseGuards(AuthGuard, TenantAccessGuard, PermissionGuard)
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get() @RequirePermission('maintenance.view')
  list(@CurrentActor() actor: Actor, @Query() query: WorkOrderQueryDto) { return this.maintenance.list(actor, query.status); }

  @Get(':id') @RequirePermission('maintenance.view')
  get(@CurrentActor() actor: Actor, @Param('id') id: string) { return this.maintenance.get(actor, id); }

  @Post() @RequirePermission('maintenance.manage')
  create(@CurrentActor() actor: Actor, @Body() body: WorkOrderDto) { return this.maintenance.create(actor, body); }

  @Patch(':id') @RequirePermission('maintenance.manage')
  update(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: UpdateWorkOrderDto) { return this.maintenance.update(actor, id, body); }

  @Post(':id/start') @RequirePermission('maintenance.manage')
  start(@CurrentActor() actor: Actor, @Param('id') id: string) { return this.maintenance.start(actor, id); }

  @Post(':id/complete') @RequirePermission('maintenance.manage')
  complete(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: FinishDto) { return this.maintenance.complete(actor, id, body); }

  @Post(':id/cancel') @RequirePermission('maintenance.manage')
  cancel(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: CancelDto) { return this.maintenance.cancel(actor, id, body.reason); }
}
