import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProposalGroup } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProposalTypesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(group?: ProposalGroup, includeWorkflows = true, includeInactive = false) {
    return this.prisma.proposalType.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(group ? { group } : {}),
      },
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }],
      ...(includeWorkflows
        ? {
            include: {
              workflows: {
                where: { isActive: true },
                include: {
                  steps: {
                    orderBy: { stepOrder: 'asc' },
                    include: {
                      approver: {
                        select: { id: true, fullName: true, email: true },
                      },
                    },
                  },
                  participants: {
                    include: {
                      user: {
                        select: { id: true, fullName: true, email: true },
                      },
                    },
                  },
                },
              },
            },
          }
        : {}),
    });
  }

  create(dto: {
    code: string;
    name: string;
    group: ProposalGroup;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.proposalType.create({ data: dto as any });
  }

  update(id: string, dto: Record<string, unknown>) {
    return this.prisma.proposalType.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const proposalType = await this.prisma.proposalType.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: { select: { proposals: true } },
      },
    });
    if (!proposalType) {
      throw new NotFoundException('Không tìm thấy loại đề xuất');
    }
    if (proposalType._count.proposals > 0) {
      throw new BadRequestException(
        `Loại đề xuất "${proposalType.name}" đã phát sinh dữ liệu. Hãy tạm tắt để giữ lịch sử.`,
      );
    }
    await this.prisma.proposalType.delete({ where: { id } });
    return { ok: true };
  }
}
