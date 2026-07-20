import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import {
  ApproveProposalDto,
  RejectProposalDto,
} from './dto/approve-proposal.dto';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { ProposalQueryDto } from './dto/proposal-query.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { ProposalsService } from './proposals.service';

@ApiTags('proposals')
@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get('stats')
  getStats(@CurrentUserId() userId: string) {
    return this.proposalsService.getStats(userId);
  }

  @Get()
  findAll(@CurrentUserId() userId: string, @Query() query: ProposalQueryDto) {
    return this.proposalsService.findAll(userId, query);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateProposalDto) {
    return this.proposalsService.create(userId, dto);
  }

  @Get('projects')
  getProjects() {
    return this.proposalsService.getProjects();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.proposalsService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateProposalDto,
  ) {
    return this.proposalsService.update(id, userId, dto);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.proposalsService.submit(id, userId);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: ApproveProposalDto,
  ) {
    return this.proposalsService.approve(id, userId, dto);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: RejectProposalDto,
  ) {
    return this.proposalsService.reject(id, userId, dto);
  }

  @Post(':id/mark-paid')
  markPaid(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.proposalsService.markPaid(id, userId);
  }
}
