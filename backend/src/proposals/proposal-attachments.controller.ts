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

@ApiTags('proposal-attachments')
@Controller('proposals')
export class ProposalAttachmentsController {
  constructor(private readonly attachments: ProposalAttachmentsService) {}

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
  upload(
    @Param('id') id: string,
    @Query('kind') kind: ProposalAttachmentKind,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!Object.values(ProposalAttachmentKind).includes(kind)) {
      throw new BadRequestException('kind không hợp lệ');
    }
    return this.attachments.upload(id, kind, file);
  }

  @Delete(':id/attachments/:attachmentId')
  remove(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.attachments.remove(id, attachmentId);
  }
}
