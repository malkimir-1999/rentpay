import { Module } from '@nestjs/common';
import { AuthModule } from '../identity/auth.module';
import { CustomerNotificationsController, NotificationsController } from './notifications.controller';

@Module({ imports: [AuthModule], controllers: [NotificationsController, CustomerNotificationsController] })
export class NotificationsModule {}
