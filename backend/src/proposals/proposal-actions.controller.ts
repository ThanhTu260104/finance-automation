import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { CancelProposalDto } from './dto/approve-proposal.dto';
import { ProposalsService } from './proposals.service';
import { NotificationsStreamService } from '../notifications/notifications-stream.service';

@ApiTags('proposal-actions')
@Controller('proposals/:id')
export class ProposalActionsController {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly realtime: NotificationsStreamService,
  ) {}

  @Post('duplicate')
  async duplicate(@Param('id') id: string, @CurrentUserId() userId: string) {
    const result = await this.proposalsService.duplicate(id, userId);
    this.realtime.broadcastProposalChange(result.id, 'duplicated');
    return result;
  }

  @Post('cancel')
  async cancel(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: CancelProposalDto,
  ) {
    const result = await this.proposalsService.cancel(id, userId, dto);
    this.realtime.broadcastProposalChange(id, 'cancelled');
    return result;
  }

  @Delete()
  async remove(@Param('id') id: string, @CurrentUserId() userId: string) {
    const result = await this.proposalsService.remove(id, userId);
    this.realtime.broadcastProposalChange(id, 'deleted');
    return result;
  }
}
