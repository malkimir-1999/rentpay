import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { CustomerGuard, PermissionGuard, PlatformGuard, TenantAccessGuard } from './access';

@Module({
  providers: [AuthGuard, TenantAccessGuard, PermissionGuard, PlatformGuard, CustomerGuard],
  exports: [AuthGuard, TenantAccessGuard, PermissionGuard, PlatformGuard, CustomerGuard],
})
export class IdentityAccessModule {}
