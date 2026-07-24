import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProposalAttachmentKind } from '@prisma/client';
import { ProposalAttachmentsService } from './proposal-attachments.service';
import { NotificationsStreamService } from '../notifications/notifications-stream.service';

@ApiTags('proposal-attachments')
@Controller('proposals')
export class ProposalAttachmentsController {
  constructor(
    private readonly attachments: ProposalAttachmentsService,
    private readonly realtime: NotificationsStreamService,
  ) {}

  @Get(':id/attachments')
  list(@Param('id') id: string) {
    return this.attachments.list(id);
  }

  @Post(':id/attachments')
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'kind', enum: ProposalAttachmentKind })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('id') id: string,
    @Query('kind') kind: ProposalAttachmentKind,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!Object.values(ProposalAttachmentKind).includes(kind)) {
      throw new BadRequestException('kind không hợp lệ');
    }
    const result = await this.attachments.upload(id, kind, file);
    this.realtime.broadcastProposalChange(id, 'attachment-uploaded');
    return result;
  }

  @Delete(':id/attachments/:attachmentId')
  async remove(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    const result = await this.attachments.remove(id, attachmentId);
    this.realtime.broadcastProposalChange(id, 'attachment-removed');
    return result;
  }
}
