import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentActor, PermissionGuard, RequirePermission, TenantAccessGuard } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { TeamService } from './team.service';

class UpdateMemberDto {
  @IsOptional() @IsString() roleId?: string;
  @IsOptional() @IsIn(['ACTIVE', 'SUSPENDED']) status?: 'ACTIVE' | 'SUSPENDED';
}

@Controller('business/team')
@UseGuards(AuthGuard, TenantAccessGuard, PermissionGuard)
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get() @RequirePermission('team.manage')
  list(@CurrentActor() actor: Actor) { return this.team.list(actor.businessId!); }

  @Patch(':membershipId') @RequirePermission('team.manage')
  update(@CurrentActor() actor: Actor, @Param('membershipId') id: string, @Body() body: UpdateMemberDto) {
    return this.team.update(actor, id, body);
  }
}
