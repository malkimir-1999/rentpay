import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentActor, TenantAccessGuard } from '../identity/access';
import type { Actor } from '../identity/auth.types';
import { SearchService } from './search.service';

class SearchQuery { @IsString() @MinLength(2) @MaxLength(80) query!: string; }

@Controller('business/search')
@UseGuards(AuthGuard, TenantAccessGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@CurrentActor() actor: Actor, @Query() input: SearchQuery) { return this.searchService.search(actor, input); }
}
