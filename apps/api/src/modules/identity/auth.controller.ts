import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { AuthService } from './auth.service';
import { countries, type CountryCode } from '../../../../../packages/config/src/countries';

const emailVerificationLimit = process.env.NODE_ENV === 'test' ? 100 : 5;
const testRate = (productionLimit: number) => process.env.NODE_ENV === 'test' ? 100 : productionLimit;

class LoginDto { @IsEmail() email!: string; @IsString() @MinLength(12) password!: string; @IsOptional() @IsIn(['BUSINESS', 'CUSTOMER', 'PLATFORM']) accountType?: 'BUSINESS' | 'CUSTOMER' | 'PLATFORM'; }
class RegisterDto extends LoginDto { @IsString() @MinLength(2) @MaxLength(100) businessName!: string; @IsString() @MinLength(2) @MaxLength(100) name!: string; @IsOptional() @IsString() @MaxLength(32) phone?: string; @IsOptional() @IsIn(Object.keys(countries)) country?: CountryCode; @IsBoolean() termsAccepted!: boolean; }
class TokenDto { @IsString() @MinLength(32) token!: string; }
class ResetDto extends TokenDto { @IsString() @MinLength(12) password!: string; }
class InviteAcceptDto extends ResetDto { @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string; }
class CustomerDto extends LoginDto {}
class ForgotDto { @IsEmail() email!: string; }

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') @Throttle({ default: { limit: testRate(5), ttl: 60000 } }) register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post('login') @HttpCode(200) @Throttle({ default: { limit: testRate(10), ttl: 60000 } }) login(@Body() dto: LoginDto) { return this.auth.login(dto.email, dto.password, dto.accountType); }
  @Post('refresh') @HttpCode(200) @Throttle({ default: { limit: testRate(10), ttl: 60000 } }) refresh(@Headers('authorization') authorization?: string) { const token = authorization?.replace(/^Bearer\s+/i, ''); if (!token) throw new UnauthorizedException(); return this.auth.refresh(token); }
  @Post('logout') @HttpCode(204) logout(@Headers('authorization') authorization?: string) { return this.auth.logout(authorization?.replace(/^Bearer\s+/i, '')); }
  @Post('forgot-password') @HttpCode(202) @Throttle({ default: { limit: 3, ttl: 60000 } }) async forgot(@Body() dto: ForgotDto) { await this.auth.requestPasswordReset(dto.email); return { message: 'If an account matches that email, reset instructions will be sent.' }; }
  @Post('reset-password') @HttpCode(204) @Throttle({ default: { limit: 5, ttl: 60000 } }) reset(@Body() dto: ResetDto) { return this.auth.resetPassword(dto.token, dto.password); }
  @Post('verify-email') @HttpCode(204) @Throttle({ default: { limit: emailVerificationLimit, ttl: 60000 } }) verify(@Body() dto: TokenDto) { return this.auth.verifyEmail(dto.token); }
  @Post('verify-email/resend') @HttpCode(202) @Throttle({ default: { limit: 3, ttl: 60000 } }) async resendVerification(@Body() dto: ForgotDto) { await this.auth.resendVerification(dto.email); return { message: 'If verification is available, instructions will be sent.' }; }
  @Post('invite/accept') @Throttle({ default: { limit: testRate(5), ttl: 60000 } }) acceptInvite(@Body() dto: InviteAcceptDto) { return this.auth.acceptInvitation(dto.token, dto.password, dto.name); }
  @Get('invite/:token') @Throttle({ default: { limit: 10, ttl: 60000 } }) invitation(@Param('token') token: string) { return this.auth.invitationDetails(token); }
  @Post('customer/register') @Throttle({ default: { limit: testRate(5), ttl: 60000 } }) customerRegister(@Body() dto: CustomerDto) { return this.auth.registerCustomer(dto.email, dto.password); }
}
