import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity/identity-access.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({ imports: [IdentityAccessModule], controllers: [OperationsController], providers: [OperationsService] })
export class OperationsModule {}
