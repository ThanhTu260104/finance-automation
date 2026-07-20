import { Controller, Get, Query, Post, Body, Patch, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProposalGroup } from '@prisma/client';
import { ProposalTypesService } from './proposal-types.service';
import { CreateProposalTypeDto } from './dto/create-proposal-type.dto';
import { UpdateProposalTypeDto } from './dto/update-proposal-type.dto';

@ApiTags('proposal-types')
@Controller('proposal-types')
export class ProposalTypesController {
  constructor(private readonly proposalTypesService: ProposalTypesService) {}

  @Get()
  findAll(
    @Query('group') group?: ProposalGroup,
    @Query('includeWorkflows') includeWorkflows?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.proposalTypesService.findAll(
      group,
      includeWorkflows !== 'false',
      includeInactive === 'true',
    );
  }

  @Post()
  create(@Body() dto: CreateProposalTypeDto) {
    return this.proposalTypesService.create(dto as any);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProposalTypeDto) {
    return this.proposalTypesService.update(id, dto as any);
  }
}
