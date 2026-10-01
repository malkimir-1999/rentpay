import { Controller, Get, Header, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { IsDateString } from 'class-validator';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentActor, PermissionGuard, RequirePermission, TenantAccessGuard } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { ReportsService } from './reports.service';

class DateRangeQuery { @IsDateString() from!: string; @IsDateString() to!: string; }

@Controller('business/reports')
@UseGuards(AuthGuard, TenantAccessGuard, PermissionGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('utilization') @RequirePermission('report.view')
  utilization(@CurrentActor() actor: Actor, @Query() query: DateRangeQuery) { return this.reports.utilization(actor, query); }

  @Get('utilization/export.csv') @RequirePermission('report.export') @Header('Cache-Control', 'private, no-store')
  async exportUtilization(@CurrentActor() actor: Actor, @Query() query: DateRangeQuery) {
    const csv = await this.reports.utilizationCsv(actor, query);
    return new StreamableFile(Buffer.from(csv), { type: 'text/csv; charset=utf-8', disposition: 'attachment; filename="rentpay-fleet-utilization.csv"' });
  }
}
