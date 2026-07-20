import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProposalAttachmentKind } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createReadStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
import { appEnv } from '../config/app-env';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

function normalizeOriginalName(originalName: string) {
  const decoded = Buffer.from(originalName, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? originalName : decoded;
}

@Injectable()
export class ProposalAttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  ensureUploadDir() {
    if (!existsSync(appEnv.proposalUploadDir)) {
      mkdirSync(appEnv.proposalUploadDir, { recursive: true });
    }
  }

  async list(proposalId: string) {
    await this.requireProposal(proposalId);
    return this.prisma.proposalAttachment.findMany({
      where: { proposalId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async upload(
    proposalId: string,
    kind: ProposalAttachmentKind,
    file: Express.Multer.File,
  ) {
    await this.requireProposal(proposalId);
    this.validateFile(file);

    this.ensureUploadDir();
    const originalName = normalizeOriginalName(file.originalname);
    const ext = extname(originalName) || '';
    const storedName = `${randomUUID()}${ext}`;
    const diskPath = join(appEnv.proposalUploadDir, storedName);
    const { writeFileSync } = await import('fs');
    writeFileSync(diskPath, file.buffer);

    const urlPath = `${appEnv.uploadUrlPrefix}proposals/${storedName}`;
    return this.prisma.proposalAttachment.create({
      data: {
        proposalId,
        kind,
        originalName,
        storedName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        urlPath,
      },
    });
  }

  async remove(proposalId: string, attachmentId: string) {
    const attachment = await this.prisma.proposalAttachment.findFirst({
      where: { id: attachmentId, proposalId },
    });
    if (!attachment) throw new NotFoundException('Không tìm thấy file');

    const diskPath = join(appEnv.proposalUploadDir, attachment.storedName);
    if (existsSync(diskPath)) unlinkSync(diskPath);

    await this.prisma.proposalAttachment.delete({ where: { id: attachmentId } });
    return { ok: true };
  }

  getFileStream(storedName: string) {
    const diskPath = join(appEnv.proposalUploadDir, storedName);
    if (!existsSync(diskPath)) {
      throw new NotFoundException('File không tồn tại');
    }
    return createReadStream(diskPath);
  }

  async findByStoredName(storedName: string) {
    return this.prisma.proposalAttachment.findFirst({
      where: { storedName },
    });
  }

  private validateFile(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Chưa chọn file');
    if (file.size > appEnv.maxUploadFileSizeBytes) {
      throw new BadRequestException(
        `File tối đa ${Math.round(appEnv.maxUploadFileSizeBytes / 1024 / 1024)}MB`,
      );
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Chỉ hỗ trợ PDF, ảnh, Word, Excel',
      );
    }
  }

  private async requireProposal(proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw new NotFoundException('Không tìm thấy đề xuất');
    return proposal;
  }
}
