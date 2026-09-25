import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity/identity-access.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({ imports: [IdentityAccessModule], controllers: [CustomersController], providers: [CustomersService] })
export class CustomersModule {}
