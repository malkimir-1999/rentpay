import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { DepositEntryType, RentalPaymentEntryType, RentalPaymentMethod } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentActor, PermissionGuard, RequirePermission, TenantAccessGuard } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { FinanceService } from './finance.service';

class PaymentEntryDto {
  @IsEnum(RentalPaymentEntryType) type!: RentalPaymentEntryType;
  @IsInt() @Min(1) @Max(2_000_000_000) amountMinor!: number;
  @IsEnum(RentalPaymentMethod) method!: RentalPaymentMethod;
  @IsOptional() @IsString() @MaxLength(160) reference?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

class DepositEntryDto {
  @IsEnum(DepositEntryType) type!: DepositEntryType;
  @IsInt() @Min(1) @Max(2_000_000_000) amountMinor!: number;
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

@Controller('business/reservations/:reservationId')
@UseGuards(AuthGuard, TenantAccessGuard, PermissionGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('ledger') @RequirePermission('payment.view')
  ledger(@CurrentActor() actor: Actor, @Param('reservationId') reservationId: string) { return this.finance.getReservationLedger(actor, reservationId); }

  @Post('payments') @RequirePermission('payment.manage')
  payment(@CurrentActor() actor: Actor, @Param('reservationId') reservationId: string, @Body() body: PaymentEntryDto) { return this.finance.recordPayment(actor, reservationId, body); }

  @Post('deposits') @RequirePermission('deposit.manage')
  deposit(@CurrentActor() actor: Actor, @Param('reservationId') reservationId: string, @Body() body: DepositEntryDto) { return this.finance.recordDeposit(actor, reservationId, body); }
}
