import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { CancelProposalDto } from './dto/approve-proposal.dto';
import { ProposalsService } from './proposals.service';

@ApiTags('proposal-actions')
@Controller('proposals/:id')
export class ProposalActionsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post('duplicate')
  duplicate(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.proposalsService.duplicate(id, userId);
  }

  @Post('cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: CancelProposalDto,
  ) {
    return this.proposalsService.cancel(id, userId, dto);
  }

  @Delete()
  remove(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.proposalsService.remove(id, userId);
  }
}
