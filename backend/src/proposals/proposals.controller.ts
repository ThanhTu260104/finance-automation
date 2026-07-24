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
import { CreateProposalCommentDto } from './dto/create-proposal-comment.dto';
import { ProposalQueryDto } from './dto/proposal-query.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { ProposalsService } from './proposals.service';
import { NotificationsStreamService } from '../notifications/notifications-stream.service';

@ApiTags('proposals')
@Controller('proposals')
export class ProposalsController {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly realtime: NotificationsStreamService,
  ) {}

  private async changed<T>(
    proposalId: string,
    action: string,
    operation: Promise<T>,
  ) {
    const result = await operation;
    this.realtime.broadcastProposalChange(proposalId, action);
    return result;
  }

  @Get('stats')
  getStats(@CurrentUserId() userId: string) {
    return this.proposalsService.getStats(userId);
  }

  @Get()
  findAll(@CurrentUserId() userId: string, @Query() query: ProposalQueryDto) {
    return this.proposalsService.findAll(userId, query);
  }

  @Post()
  async create(@CurrentUserId() userId: string, @Body() dto: CreateProposalDto) {
    const result = await this.proposalsService.create(userId, dto);
    this.realtime.broadcastProposalChange(result.id, 'created');
    return result;
  }

  @Get('projects')
  getProjects(@CurrentUserId() userId: string) {
    return this.proposalsService.getProjects(userId);
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.proposalsService.getComments(id, userId);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateProposalCommentDto,
  ) {
    return this.changed(
      id,
      'commented',
      this.proposalsService.addComment(id, userId, dto.content),
    );
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
    return this.changed(id, 'updated', this.proposalsService.update(id, userId, dto));
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.changed(id, 'submitted', this.proposalsService.submit(id, userId));
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: ApproveProposalDto,
  ) {
    return this.changed(id, 'approved', this.proposalsService.approve(id, userId, dto));
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: RejectProposalDto,
  ) {
    return this.changed(id, 'rejected', this.proposalsService.reject(id, userId, dto));
  }

  @Post(':id/mark-paid')
  markPaid(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.changed(id, 'paid', this.proposalsService.markPaid(id, userId));
  }
}
