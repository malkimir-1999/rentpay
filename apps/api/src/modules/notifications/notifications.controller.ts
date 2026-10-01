import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentActor, CustomerGuard, TenantAccessGuard } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { NotificationsService } from '../../infra/notifications.service';

@Controller('business/notifications')
@UseGuards(AuthGuard, TenantAccessGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentActor() actor: Actor) { return this.notifications.listFor(actor); }

  @Patch(':notificationId/read')
  markRead(@CurrentActor() actor: Actor, @Param('notificationId') id: string) { return this.notifications.markRead(actor, id); }
}

@Controller('customer/notifications')
@UseGuards(AuthGuard, CustomerGuard)
export class CustomerNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentActor() actor: Actor) { return this.notifications.listFor(actor); }

  @Patch(':notificationId/read')
  markRead(@CurrentActor() actor: Actor, @Param('notificationId') id: string) { return this.notifications.markRead(actor, id); }
}
