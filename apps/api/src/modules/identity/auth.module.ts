import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { NotificationsService } from '../../infra/notifications.service';
@Module({ controllers: [AuthController], providers: [AuthService, NotificationsService], exports: [AuthService, NotificationsService] }) export class AuthModule {}
