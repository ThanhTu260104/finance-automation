import { Module } from '@nestjs/common';
import { ProposalActionsController } from './proposal-actions.controller';
import { ProposalAttachmentsController } from './proposal-attachments.controller';
import { ProposalAttachmentsService } from './proposal-attachments.service';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [
    ProposalsController,
    ProposalActionsController,
    ProposalAttachmentsController,
  ],
  imports: [NotificationsModule],
  providers: [ProposalsService, ProposalAttachmentsService],
  exports: [ProposalsService, ProposalAttachmentsService],
})
export class ProposalsModule {}
