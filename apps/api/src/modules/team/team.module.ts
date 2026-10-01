import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity/identity-access.module';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({ imports: [IdentityAccessModule], controllers: [TeamController], providers: [TeamService] })
export class TeamModule {}
