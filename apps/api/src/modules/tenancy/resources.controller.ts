import { Body, Controller, Delete, Get, NotFoundException, ForbiddenException, Inject, Param, Patch, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException, ConflictException, StreamableFile, Header } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import { IsBoolean, IsEmail, IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { AuthGuard } from '../identity/auth.guard';
import { RequirePermission, PermissionGuard, TenantAccessGuard, PlatformGuard, CustomerGuard } from '../identity/access';
import { CurrentActor } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { PrismaService } from '../../infra/prisma.service';
import { UploadService } from '../../infra/storage';
import { AuthService } from '../identity/auth.service';
import { AuditService } from '../../infra/audit.service';
import { NotificationsService } from '../../infra/notifications.service';
import { SUBSCRIPTION_PAYMENT_PROVIDER, type PakistanPaymentMethod, type SubscriptionPaymentProvider } from '../subscriptions/manual-payment.provider';
@Controller('platform')
@UseGuards(AuthGuard, PlatformGuard)
export class PlatformController {
 constructor(private readonly prisma: PrismaService) {}
 @Get('health') health() { return { ok: true, scope: 'platform' }; }
 @Get('overview') async overview() {
  const [businesses, users, activeSubscriptions, trials, pendingPayments, overdueTrials] = await Promise.all([
   this.prisma.business.count(),
   this.prisma.user.count(),
   this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
   this.prisma.subscription.count({ where: { status: 'TRIALING' } }),
   this.prisma.subscriptionPayment.count({ where: { status: 'PENDING_VERIFICATION' } }),
   this.prisma.subscription.count({ where: { status: 'TRIALING', trialEndsAt: { lt: new Date() } } }),
  ]);
  return { businesses, users, activeSubscriptions, trials, pendingPayments, overdueTrials };
 }
 @Get('businesses') businesses() {
  return this.prisma.business.findMany({ select: { id: true, name: true, slug: true, country: true, createdAt: true, _count: { select: { memberships: true, vehicles: true, customers: true } }, subscriptions: { take: 1, orderBy: { trialStartedAt: 'desc' }, select: { status: true, trialEndsAt: true, activatedAt: true, plan: { select: { name: true, amountMinor: true, currency: true } } } } }, orderBy: { createdAt: 'desc' } });
 }
 @Get('audit') audit() { return this.prisma.auditEvent.findMany({ take: 100, orderBy: { createdAt: 'desc' }, select: { id: true, businessId: true, actorUserId: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true } }); }
}
class CustomerExtensionRequestDto { @IsISO8601() requestedReturnAt!: string; @IsString() @MinLength(8) @MaxLength(500) reason!: string; }
@Controller('customer')
@UseGuards(AuthGuard, CustomerGuard)
export class CustomerController {
 constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}
 @Get('me') me(@CurrentActor() actor: Actor) { return this.prisma.user.findUnique({ where: { id: actor.userId }, select: { id: true, name: true, email: true, accountType: true } }); }
 @Get('bookings') bookings(@CurrentActor() actor: Actor) {
  return this.prisma.reservation.findMany({ where: { customer: { userId: actor.userId } }, select: { id: true, status: true, source: true, startAt: true, endAt: true, estimatedTotalMinor: true, currency: true, createdAt: true, business: { select: { name: true, slug: true, phone: true, email: true, settings: { select: { timezone: true } } } }, vehicle: { select: { make: true, model: true, category: true } }, pickupLocation: { select: { name: true, address: true } }, dropoffLocation: { select: { name: true } } }, orderBy: { startAt: 'desc' }, take: 100 });
 }
 @Get('rentals') rentals(@CurrentActor() actor: Actor) {
  return this.prisma.rental.findMany({ where: { customer: { userId: actor.userId } }, select: { id: true, status: true, startAt: true, expectedReturnAt: true, actualReturnAt: true, estimatedTotalMinor: true, currency: true, business: { select: { name: true, slug: true, phone: true, email: true, settings: { select: { timezone: true } } } }, vehicle: { select: { make: true, model: true, category: true } }, pickupLocation: { select: { name: true } }, dropoffLocation: { select: { name: true } } }, orderBy: { startAt: 'desc' }, take: 100 });
 }
 @Get('payments') async payments(@CurrentActor() actor: Actor) {
  const customerScope = { reservation: { customer: { userId: actor.userId } } };
  const [paymentEntries, depositEntries] = await Promise.all([
   this.prisma.rentalPaymentEntry.findMany({ where: customerScope, select: { id: true, type: true, amountMinor: true, currency: true, method: true, createdAt: true, reservation: { select: { vehicle: { select: { make: true, model: true } }, business: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
   this.prisma.depositLedgerEntry.findMany({ where: customerScope, select: { id: true, type: true, amountMinor: true, currency: true, createdAt: true, reservation: { select: { vehicle: { select: { make: true, model: true } }, business: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
  ]);
  return [
   ...paymentEntries.map(({ reservation, ...entry }) => ({ ...entry, kind: 'PAYMENT' as const, method: entry.method.replaceAll('_', ' '), vehicle: reservation.vehicle, business: reservation.business })),
   ...depositEntries.map(({ reservation, ...entry }) => ({ ...entry, kind: 'DEPOSIT' as const, method: null, vehicle: reservation.vehicle, business: reservation.business })),
  ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()).slice(0, 100);
 }
 @Post('rentals/:rentalId/extension-requests') async requestExtension(@CurrentActor() actor: Actor, @Param('rentalId') rentalId: string, @Body() body: CustomerExtensionRequestDto) {
  const requestedReturnAt = new Date(body.requestedReturnAt);
  if (!Number.isFinite(requestedReturnAt.getTime())) throw new BadRequestException('Choose a valid return date and time.');
  const created = await this.prisma.$transaction(async (tx) => {
   const locked = await tx.$queryRaw<Array<{ id: string; businessId: string; customerId: string; status: string; expectedReturnAt: Date }>>(Prisma.sql`SELECT "id", "businessId", "customerId", "status", "expectedReturnAt" FROM "Rental" WHERE "id" = ${rentalId} FOR UPDATE`);
   const rental = locked[0];
   if (!rental) throw new NotFoundException('Rental was not found.');
   const customer = await tx.customer.findFirst({ where: { id: rental.customerId, businessId: rental.businessId, userId: actor.userId, status: 'ACTIVE', archivedAt: null }, select: { id: true, fullName: true } });
   if (!customer) throw new NotFoundException('Rental was not found.');
   if (!['BOOKED', 'ACTIVE'].includes(rental.status)) throw new BadRequestException('An extension can only be requested for a booked or active rental.');
   if (requestedReturnAt <= rental.expectedReturnAt || requestedReturnAt.getTime() - rental.expectedReturnAt.getTime() > 90 * 86400000) throw new BadRequestException('Choose a return time after the current return time and within 90 days.');
   const pending = await tx.rentalExtensionRequest.findFirst({ where: { businessId: rental.businessId, rentalId, status: 'PENDING' }, select: { id: true } });
   if (pending) throw new ConflictException('You already have an extension request waiting for the rental team.');
   const request = await tx.rentalExtensionRequest.create({ data: { businessId: rental.businessId, rentalId, customerId: customer.id, requestedByUserId: actor.userId, requestedReturnAt, reason: body.reason.trim() } });
   await tx.auditEvent.create({ data: { businessId: rental.businessId, actorUserId: actor.userId, action: 'RENTAL_EXTENSION_REQUESTED', entityType: 'RentalExtensionRequest', entityId: request.id, metadata: { rentalId, requestedReturnAt: requestedReturnAt.toISOString() } } });
   return { id: request.id, businessId: rental.businessId, customerName: customer.fullName, requestedReturnAt: request.requestedReturnAt, status: request.status, reason: request.reason, createdAt: request.createdAt };
  });
  const owners = await this.prisma.businessMembership.findMany({ where: { businessId: created.businessId, status: 'ACTIVE', role: { key: 'OWNER' } }, select: { userId: true } });
  await Promise.allSettled(owners.map((owner) => this.notifications.dispatch({ event: 'RENTAL_EXTENSION_REQUEST', channel: 'IN_APP', recipient: owner.userId, businessId: created.businessId, subject: 'A renter requested more time', text: `${created.customerName} asked to return the vehicle later. Review the request in Rentals.` })));
  const { businessId: _businessId, customerName: _customerName, ...request } = created;
  return request;
 }
 @Get('extension-requests') extensionRequests(@CurrentActor() actor: Actor) {
  return this.prisma.rentalExtensionRequest.findMany({ where: { requestedByUserId: actor.userId }, select: { id: true, requestedReturnAt: true, reason: true, status: true, decisionNote: true, reviewedAt: true, createdAt: true, rental: { select: { id: true, status: true, expectedReturnAt: true, vehicle: { select: { make: true, model: true } }, business: { select: { name: true, phone: true, email: true, settings: { select: { timezone: true } } } } } } }, orderBy: { createdAt: 'desc' }, take: 50 });
 }
}
@Controller('business/files')
@UseGuards(AuthGuard, TenantAccessGuard, PermissionGuard)
export class TenantFilesController {
 constructor(private readonly uploads: UploadService) {}
 @Post() @RequirePermission('vehicle.manage') @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
 upload(@CurrentActor() actor: Actor, @UploadedFile() file?: { buffer: Buffer; mimetype: string }) {
  if (!file) throw new BadRequestException('Choose a file to upload');
  return this.uploads.upload({ businessId: actor.businessId, actorBusinessId: actor.businessId, buffer: file.buffer, claimedMime: file.mimetype });
 }
 @Get(':id/download') @RequirePermission('inspection.manage') @Header('Cache-Control', 'private, no-store') @Header('X-Content-Type-Options', 'nosniff')
 async download(@CurrentActor() actor: Actor, @Param('id') id: string) {
  const asset = await this.uploads.downloadEvidence(id, actor.businessId!);
  const filename = asset.key.split('/').pop() ?? 'evidence';
  return new StreamableFile(asset.bytes, { type: asset.mimeType, disposition: `inline; filename="${filename}"` });
 }
 @Delete(':id') @RequirePermission('vehicle.manage') delete(@CurrentActor() actor: Actor, @Param('id') id: string) { return this.uploads.delete(id, actor.businessId!); }
}
class InviteDto { @IsEmail() email!: string; @IsString() roleId!: string; }
class ManualPaymentDto { @IsIn(['BANK_TRANSFER','EASYPAISA','JAZZCASH']) method!: PakistanPaymentMethod; @IsString() @MinLength(1) planId!: string; @IsString() @MinLength(4) reference!: string; @IsOptional() @IsString() proofAssetId?: string; }
class CreatePlanDto { @IsString() @Matches(/^[A-Z0-9_-]{2,32}$/) key!: string; @IsString() @MinLength(2) name!: string; @IsInt() @Min(1) amountMinor!: number; @IsIn(['PKR']) currency!: 'PKR'; @IsOptional() @IsInt() @Min(1) vehicleLimit?: number; @IsOptional() @IsInt() @Min(1) staffLimit?: number; @IsOptional() @IsString({ each: true }) features?: string[]; }
class ReviewPaymentDto { @IsBoolean() approve!: boolean; }
@Controller('business')
@UseGuards(AuthGuard, TenantAccessGuard, PermissionGuard)
export class TenantAdministrationController {
 constructor(private readonly auth: AuthService, private readonly prisma: PrismaService, private readonly audit: AuditService, @Inject(SUBSCRIPTION_PAYMENT_PROVIDER) private readonly payments: SubscriptionPaymentProvider) {}
 @Get('team/invitation-roles') @RequirePermission('team.manage')
 invitationRoles() { return this.prisma.role.findMany({ where: { key: { notIn: ['OWNER', 'ADMIN'] } }, select: { id: true, key: true, name: true }, orderBy: { name: 'asc' } }); }
 @Get('subscription') @RequirePermission('settings.manage')
 subscription(@CurrentActor() actor: Actor) { return this.prisma.subscription.findFirst({ where: { businessId: actor.businessId }, include: { plan: true }, orderBy: { trialStartedAt: 'desc' } }); }
 @Get('subscription/plans') @RequirePermission('settings.manage')
 plans() { return this.prisma.plan.findMany({ where: { isPurchasable: true }, orderBy: { amountMinor: 'asc' } }); }
 @Get('subscription/payment-methods') @RequirePermission('settings.manage')
 paymentMethods() { return this.payments.paymentInstructions(); }
 @Post('invitations') @RequirePermission('team.manage')
 invite(@CurrentActor() actor: Actor, @Body() body: InviteDto) { return this.auth.createInvitation({ businessId: actor.businessId!, email: body.email, roleId: body.roleId, createdById: actor.userId }); }
 @Post('subscription/payments') @RequirePermission('settings.manage')
 async submitPayment(@CurrentActor() actor: Actor, @Body() body: ManualPaymentDto) {
  this.payments.requireConfigured(body.method);
  const plan = await this.prisma.plan.findFirst({ where: { id: body.planId, isPurchasable: true } });
  if (!plan) throw new NotFoundException('Purchasable plan was not found');
  const subscription = await this.prisma.subscription.findFirst({ where: { businessId: actor.businessId, status: { in: ['TRIALING','EXPIRED','PAST_DUE','GRACE_PERIOD'] } }, orderBy: { trialStartedAt: 'desc' } });
  if (!subscription) throw new NotFoundException('No subscription is available for payment');
  if (body.proofAssetId && !await this.prisma.fileAsset.findFirst({ where: { id: body.proofAssetId, businessId: actor.businessId } })) throw new ForbiddenException();
  const payment = await this.prisma.subscriptionPayment.create({ data: { subscriptionId: subscription.id, requestedPlanId: plan.id, amountMinor: plan.amountMinor, method: body.method, reference: body.reference, proofAssetId: body.proofAssetId } });
  await this.audit.record({ businessId: actor.businessId, actorUserId: actor.userId, action: 'SUBSCRIPTION_PAYMENT_SUBMITTED', entityType: 'SubscriptionPayment', entityId: payment.id });
  return payment;
 }
}
@Controller('platform/subscription-payments')
@UseGuards(AuthGuard, PlatformGuard)
export class PlatformPaymentsController {
 constructor(private readonly prisma: PrismaService) {}
 @Get('pending') pending() { return this.prisma.subscriptionPayment.findMany({ where: { status: 'PENDING_VERIFICATION' }, include: { requestedPlan: true, subscription: { include: { business: true, plan: true } } } }); }
 @Patch(':id/review') async review(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() body: ReviewPaymentDto) {
  return this.prisma.$transaction(async (tx) => {
   const payment = await tx.subscriptionPayment.findUnique({ where: { id }, include: { subscription: true } });
   if (!payment || payment.status !== 'PENDING_VERIFICATION') throw new NotFoundException('Pending payment was not found');
   const status = body.approve ? 'APPROVED' : 'REJECTED';
   await tx.subscriptionPayment.update({ where: { id }, data: { status } });
   if (body.approve) await tx.subscription.update({ where: { id: payment.subscriptionId }, data: { status: 'ACTIVE', activatedAt: new Date(), ...(payment.requestedPlanId ? { planId: payment.requestedPlanId } : {}) } });
   await tx.auditEvent.create({ data: { businessId: payment.subscription.businessId, actorUserId: actor.userId, action: body.approve ? 'SUBSCRIPTION_PAYMENT_APPROVED' : 'SUBSCRIPTION_PAYMENT_REJECTED', entityType: 'SubscriptionPayment', entityId: id, metadata: { status } } });
   return { id, status };
  });
 }
}

@Controller('platform/plans')
@UseGuards(AuthGuard, PlatformGuard)
export class PlatformPlansController {
 constructor(private readonly prisma: PrismaService) {}
 @Get() plans() { return this.prisma.plan.findMany({ orderBy: { amountMinor: 'asc' } }); }
 @Post() create(@CurrentActor() actor: Actor, @Body() body: CreatePlanDto) {
  return this.prisma.$transaction(async (tx) => {
   const plan = await tx.plan.create({ data: { ...body, isPurchasable: true } });
   await tx.auditEvent.create({ data: { actorUserId: actor.userId, action: 'SUBSCRIPTION_PLAN_CREATED', entityType: 'Plan', entityId: plan.id, metadata: { key: plan.key, amountMinor: plan.amountMinor, currency: plan.currency } } });
   return plan;
  });
 }
}
