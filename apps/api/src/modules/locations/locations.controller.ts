import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentActor, PermissionGuard, RequirePermission, TenantAccessGuard } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { LocationsService, type LocationInput } from './locations.service';

class LocationDto implements LocationInput {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsString() @MinLength(1) @MaxLength(100) timezone!: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
}

class UpdateLocationDto {
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) timezone?: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
}

@Controller('business/locations')
@UseGuards(AuthGuard, TenantAccessGuard, PermissionGuard)
@RequirePermission('settings.manage')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get()
  list(@CurrentActor() actor: Actor) { return this.locations.list(actor); }

  @Get(':id')
  get(@CurrentActor() actor: Actor, @Param('id') id: string) { return this.locations.get(actor, id); }

  @Post()
  create(@CurrentActor() actor: Actor, @Body() body: LocationDto) { return this.locations.create(actor, body); }

  @Patch(':id')
  update(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: UpdateLocationDto) { return this.locations.update(actor, id, body); }

  @Delete(':id')
  archive(@CurrentActor() actor: Actor, @Param('id') id: string) { return this.locations.archive(actor, id); }
}
