import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentActor, PermissionGuard, RequirePermission, TenantAccessGuard } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { OperationsService } from './operations.service';

@Controller('business/operations')
@UseGuards(AuthGuard, TenantAccessGuard, PermissionGuard)
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}
  @Get('today') @RequirePermission('dashboard.view')
  today(@CurrentActor() actor: Actor) { return this.operations.today(actor); }
}
