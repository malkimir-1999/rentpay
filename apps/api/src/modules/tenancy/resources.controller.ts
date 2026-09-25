import { Body, Controller, Delete, Get, NotFoundException, ForbiddenException, Inject, Param, Patch, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';
import { AuthGuard } from '../identity/auth.guard';
import { RequirePermission, PermissionGuard, TenantAccessGuard, PlatformGuard, CustomerGuard } from '../identity/access';
import { CurrentActor } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { PrismaService } from '../../infra/prisma.service';
import { UploadService } from '../../infra/storage';
import { AuthService } from '../identity/auth.service';
import { AuditService } from '../../infra/audit.service';
import { SUBSCRIPTION_PAYMENT_PROVIDER, type PakistanPaymentMethod, type SubscriptionPaymentProvider } from '../subscriptions/manual-payment.provider';
@Controller('platform')
@UseGuards(AuthGuard, PlatformGuard)
export class PlatformController { @Get('health') health() { return { ok: true, scope: 'platform' }; } }
@Controller('customer')
@UseGuards(AuthGuard, CustomerGuard)
export class CustomerController { @Get('me') me(@CurrentActor() actor: Actor) { return { userId: actor.userId, accountType: actor.accountType }; } }
@Controller('business/files')
@UseGuards(AuthGuard, TenantAccessGuard, PermissionGuard)
export class TenantFilesController {
 constructor(private readonly uploads: UploadService) {}
 @Post() @RequirePermission('vehicle.manage') @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
 upload(@CurrentActor() actor: Actor, @UploadedFile() file?: { buffer: Buffer; mimetype: string }) {
  if (!file) throw new BadRequestException('Choose a file to upload');
  return this.uploads.upload({ businessId: actor.businessId, actorBusinessId: actor.businessId, buffer: file.buffer, claimedMime: file.mimetype });
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
