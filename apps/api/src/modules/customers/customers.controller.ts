import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CustomerStatus, VerificationStatus } from '@prisma/client';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentActor, PermissionGuard, RequirePermission, TenantAccessGuard } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { CustomersService, type CustomerInput, type CustomerUpdate, type DriverInput } from './customers.service';

class CustomerQueryDto { @IsOptional() @IsString() @MaxLength(80) search?: string; }
class CreateCustomerDto implements CustomerInput {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(2) @MaxLength(120) fullName!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value) @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(5) @MaxLength(32) phone!: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
class UpdateCustomerDto implements CustomerUpdate {
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(2) @MaxLength(120) fullName?: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value) @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(5) @MaxLength(32) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsEnum(CustomerStatus) status?: CustomerStatus;
  @IsOptional() @IsEnum(VerificationStatus) verification?: VerificationStatus;
}
class CreateDriverDto implements DriverInput {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(2) @MaxLength(120) fullName!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(5) @MaxLength(32) phone!: string;
  @IsOptional() @IsString() @MaxLength(80) licenseNumber?: string;
  @IsOptional() @IsString() @MaxLength(2) licenseCountry?: string;
  @IsOptional() @IsISO8601() licenseExpiresAt?: string;
  @IsOptional() @IsEnum(VerificationStatus) verification?: VerificationStatus;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
class UpdateDriverDto {
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(2) @MaxLength(120) fullName?: string;
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(5) @MaxLength(32) phone?: string;
  @IsOptional() @IsString() @MaxLength(80) licenseNumber?: string;
  @IsOptional() @IsString() @MaxLength(2) licenseCountry?: string;
  @IsOptional() @IsISO8601() licenseExpiresAt?: string;
  @IsOptional() @IsEnum(VerificationStatus) verification?: VerificationStatus;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

@Controller('business/customers')
@UseGuards(AuthGuard, TenantAccessGuard, PermissionGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}
  @Get() @RequirePermission('customer.view')
  list(@CurrentActor() actor: Actor, @Query() query: CustomerQueryDto) { return this.customers.list(actor, query.search); }
  @Post() @RequirePermission('customer.manage')
  create(@CurrentActor() actor: Actor, @Body() body: CreateCustomerDto) { return this.customers.create(actor, body); }
  @Get(':customerId') @RequirePermission('customer.view')
  get(@CurrentActor() actor: Actor, @Param('customerId') id: string) { return this.customers.get(actor, id); }
  @Patch(':customerId') @RequirePermission('customer.manage')
  update(@CurrentActor() actor: Actor, @Param('customerId') id: string, @Body() body: UpdateCustomerDto) { return this.customers.update(actor, id, body); }
  @Delete(':customerId') @RequirePermission('customer.manage')
  archive(@CurrentActor() actor: Actor, @Param('customerId') id: string) { return this.customers.archive(actor, id); }
  @Post(':customerId/drivers') @RequirePermission('customer.manage')
  addDriver(@CurrentActor() actor: Actor, @Param('customerId') customerId: string, @Body() body: CreateDriverDto) { return this.customers.addDriver(actor, customerId, body); }
  @Patch(':customerId/drivers/:driverId') @RequirePermission('customer.manage')
  updateDriver(@CurrentActor() actor: Actor, @Param('customerId') customerId: string, @Param('driverId') driverId: string, @Body() body: UpdateDriverDto) { return this.customers.updateDriver(actor, customerId, driverId, body); }
  @Delete(':customerId/drivers/:driverId') @RequirePermission('customer.manage')
  archiveDriver(@CurrentActor() actor: Actor, @Param('customerId') customerId: string, @Param('driverId') driverId: string) { return this.customers.archiveDriver(actor, customerId, driverId); }
}
