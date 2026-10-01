import { Module } from '@nestjs/common';
import { IdentityAccessModule } from '../identity/identity-access.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({ imports: [IdentityAccessModule], controllers: [SearchController], providers: [SearchService] })
export class SearchModule {}
