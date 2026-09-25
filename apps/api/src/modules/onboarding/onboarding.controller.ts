import { Body, Controller, Get, Post, Patch, UseGuards, ConflictException, NotFoundException, Param, ServiceUnavailableException } from '@nestjs/common';
import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentActor, PermissionGuard, RequirePermission, TenantAccessGuard } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { PrismaService } from '../../infra/prisma.service';
import { AuditService } from '../../infra/audit.service';
import { NotificationsService } from '../../infra/notifications.service';

class BusinessProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) country?: string;
  @IsOptional() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(60) slug?: string;
}
class SettingsDto {
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) country?: string;
  @IsOptional() @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @IsIn(['DAILY', 'HOURLY']) rentalDurationModel?: string;
  @IsOptional() @IsBoolean() depositRequired?: boolean;
  @IsOptional() @IsInt() @Min(0) defaultDepositMinor?: number;
  @IsOptional() @IsInt() @Min(0) lateReturnGraceMinutes?: number;
  @IsOptional() @IsInt() @Min(0) lateReturnFeeMinor?: number;
  @IsOptional() @IsIn(['REQUEST_TO_BOOK', 'INSTANT_BOOKING']) bookingMode?: string;
  @IsOptional() @IsIn(['CASH', 'BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH'], { each: true }) enabledRentalPaymentMethods?: string[];
  @IsOptional() @Matches(/^#[0-9A-Fa-f]{6}$/) publicBrandColor?: string;
  @IsOptional() @IsBoolean() publicWebsiteEnabled?: boolean;
}
class LocationDto { @IsString() @MinLength(2) @MaxLength(100) name!: string; @IsString() timezone!: string; @IsOptional() @IsString() @MaxLength(240) address?: string; @IsOptional() @IsString() @MaxLength(32) phone?: string; }
class VehicleDto {
  @IsString() @MinLength(1) @MaxLength(60) make!: string;
  @IsString() @MinLength(1) @MaxLength(60) model!: string;
  @IsOptional() @IsInt() @Min(1950) year?: number;
  @IsString() @MinLength(2) @MaxLength(24) registrationNumber!: string;
  @IsInt() @Min(0) dailyRateMinor!: number;
  @IsOptional() @IsInt() @Min(0) weeklyRateMinor?: number;
  @IsOptional() @IsInt() @Min(0) monthlyRateMinor?: number;
  @IsOptional() @IsInt() @Min(0) depositMinor?: number;
  @IsOptional() @IsString() locationId?: string;
}
class ProgressDto { @IsInt() @Min(0) step!: number; @IsOptional() @IsBoolean() completed?: boolean; }
class ContactDto { @IsString() @MinLength(2) @MaxLength(100) name!: string; @IsEmail() email!: string; @IsOptional() @IsString() @MaxLength(120) businessName?: string; @IsOptional() @IsInt() @Min(1) fleetSize?: number; @IsString() @MinLength(10) @MaxLength(3000) message!: string; }

@Controller('business/onboarding')
@UseGuards(AuthGuard, TenantAccessGuard, PermissionGuard)
@RequirePermission('settings.manage')
export class OnboardingController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Get()
  async get(@CurrentActor() actor: Actor) {
    const businessId = actor.businessId!;
    const [business, settings, locations, vehicles] = await Promise.all([
      this.prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { id: true, name: true, slug: true, phone: true, email: true, address: true, country: true } }),
      this.prisma.businessSettings.findUniqueOrThrow({ where: { businessId } }),
      this.prisma.location.findMany({ where: { businessId, archivedAt: null }, orderBy: { name: 'asc' } }),
      this.prisma.vehicle.findMany({ where: { businessId, archivedAt: null }, orderBy: { createdAt: 'asc' }, take: 1 }),
    ]);
    return { business, settings, locations, vehicle: vehicles[0] ?? null };
  }

  @Patch('profile')
  async updateProfile(@CurrentActor() actor: Actor, @Body() body: BusinessProfileDto) {
    if (body.slug) {
      const existing = await this.prisma.business.findFirst({ where: { slug: body.slug, id: { not: actor.businessId } } });
      if (existing) throw new ConflictException('That booking-page address is already in use. Choose another.');
    }
    const result = await this.prisma.business.update({ where: { id: actor.businessId }, data: body });
    await this.audit.record({ businessId: actor.businessId, actorUserId: actor.userId, action: 'BUSINESS_SETUP_PROFILE_UPDATED', entityType: 'Business', entityId: result.id });
    return { id: result.id, name: result.name, slug: result.slug, phone: result.phone, email: result.email, address: result.address, country: result.country };
  }

  @Patch('settings')
  async updateSettings(@CurrentActor() actor: Actor, @Body() body: SettingsDto) {
    const result = await this.prisma.businessSettings.update({ where: { businessId: actor.businessId }, data: body });
    await this.audit.record({ businessId: actor.businessId, actorUserId: actor.userId, action: 'BUSINESS_SETUP_SETTINGS_UPDATED', entityType: 'BusinessSettings', entityId: result.id });
    return result;
  }

  @Post('locations')
  async createLocation(@CurrentActor() actor: Actor, @Body() body: LocationDto) {
    const location = await this.prisma.location.upsert({ where: { businessId_name: { businessId: actor.businessId!, name: body.name } }, create: { ...body, businessId: actor.businessId! }, update: { ...body, archivedAt: null } });
    await this.audit.record({ businessId: actor.businessId, actorUserId: actor.userId, action: 'BUSINESS_SETUP_LOCATION_CREATED', entityType: 'Location', entityId: location.id });
    return location;
  }

  @Post('vehicle')
  @RequirePermission('vehicle.manage')
  async createVehicle(@CurrentActor() actor: Actor, @Body() body: VehicleDto) {
    if (body.locationId && !await this.prisma.location.findFirst({ where: { id: body.locationId, businessId: actor.businessId, archivedAt: null } })) throw new NotFoundException('Choose a location in your business.');
    const businessId = actor.businessId!;
    const existing = await this.prisma.vehicle.findFirst({ where: { businessId, registrationNumber: body.registrationNumber.trim() }, select: { id: true } });
    const currency = await this.currency(businessId);
    const vehicle = await this.prisma.vehicle.upsert({ where: { businessId_registrationNumber: { businessId, registrationNumber: body.registrationNumber.trim() } }, create: { ...body, registrationNumber: body.registrationNumber.trim(), businessId, currency }, update: { ...body, registrationNumber: body.registrationNumber.trim(), currency } });
    await this.audit.record({ businessId, actorUserId: actor.userId, action: existing ? 'BUSINESS_SETUP_VEHICLE_UPDATED' : 'BUSINESS_SETUP_VEHICLE_CREATED', entityType: 'Vehicle', entityId: vehicle.id });
    return vehicle;
  }

  @Patch('progress')
  async progress(@CurrentActor() actor: Actor, @Body() body: ProgressDto) {
    if (body.completed && !await this.prisma.location.findFirst({ where: { businessId: actor.businessId }, select: { id: true } })) throw new ConflictException('Add a rental location before finishing setup.');
    const settings = await this.prisma.businessSettings.update({ where: { businessId: actor.businessId }, data: { onboardingStep: body.step, ...(body.completed ? { onboardingCompletedAt: new Date(), publicWebsiteEnabled: true } : {}) } });
    if (body.completed) await this.audit.record({ businessId: actor.businessId, actorUserId: actor.userId, action: 'BUSINESS_ONBOARDING_COMPLETED', entityType: 'BusinessSettings', entityId: settings.id });
    return { step: settings.onboardingStep, completedAt: settings.onboardingCompletedAt };
  }

  private async currency(businessId: string) { return (await this.prisma.businessSettings.findUniqueOrThrow({ where: { businessId }, select: { currency: true } })).currency; }
}

@Controller('public')
export class PublicMarketingController {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}
  @Post('contact')
  @Throttle({ default: { limit: 3, ttl: 900000 } })
  async contact(@Body() body: ContactDto) {
    const recipient = process.env.CONTACT_EMAIL;
    if (!recipient) throw new ServiceUnavailableException('Contact requests are temporarily unavailable. Please start a trial or try again later.');
    await this.notifications.dispatch({ event: 'CONTACT_DEMO', channel: 'EMAIL', recipient, subject: 'New RentPay product enquiry', text: `Name: ${body.name.trim()}\nEmail: ${body.email.trim()}\nBusiness: ${body.businessName?.trim() || 'Not provided'}\nFleet size: ${body.fleetSize ?? 'Not provided'}\n\n${body.message.trim()}` });
    return { message: 'Thanks for contacting RentPay. Your message has been sent.' };
  }
  @Get('plans') plans() { return this.prisma.plan.findMany({ where: { isPurchasable: true }, select: { id: true, key: true, name: true, amountMinor: true, currency: true, vehicleLimit: true, staffLimit: true, features: true }, orderBy: { amountMinor: 'asc' } }); }
  @Get('rentals') rentalSlugs() { return this.prisma.business.findMany({ where: { settings: { publicWebsiteEnabled: true } }, select: { slug: true, updatedAt: true } }); }
  @Get('rentals/:slug')
  async rentalSite(@Param('slug') slug: string) {
    const business = await this.prisma.business.findFirst({ where: { slug, settings: { publicWebsiteEnabled: true } }, select: { name: true, slug: true, phone: true, email: true, address: true, settings: { select: { currency: true, publicBrandColor: true } }, vehicles: { where: { archivedAt: null }, select: { id: true, make: true, model: true, year: true, dailyRateMinor: true, currency: true }, orderBy: { createdAt: 'desc' } } } });
    if (!business) throw new NotFoundException('This rental page is not available.');
    return business;
  }
}
