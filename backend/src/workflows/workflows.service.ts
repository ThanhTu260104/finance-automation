import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ParticipantRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

const workflowInclude = {
  proposalType: true,
  steps: {
    orderBy: { stepOrder: 'asc' as const },
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
};

export const proposalTypeInclude = {
  workflows: {
    where: { isActive: true },
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' as const },
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
};

function buildParticipantCreates(dto: {
  watcherIds?: string[];
  notifyIds?: string[];
  executorIds?: string[];
}) {
  return [
    ...(dto.watcherIds ?? []).map((userId) => ({
      userId,
      role: ParticipantRole.WATCHER,
    })),
    ...(dto.notifyIds ?? []).map((userId) => ({
      userId,
      role: ParticipantRole.NOTIFY,
    })),
    ...(dto.executorIds ?? []).map((userId) => ({
      userId,
      role: ParticipantRole.EXECUTOR,
    })),
  ];
}

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.approvalWorkflow.findMany({
      include: workflowInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const workflow = await this.prisma.approvalWorkflow.findUnique({
      where: { id },
      include: workflowInclude,
    });

    if (!workflow) {
      throw new NotFoundException('Không tìm thấy quy trình');
    }

    return workflow;
  }

  async create(dto: CreateWorkflowDto) {
    const type = await this.prisma.proposalType.findUnique({
      where: { id: dto.proposalTypeId },
    });

    if (!type) {
      throw new NotFoundException('Loại đề xuất không tồn tại');
    }

    if (!dto.steps?.length) {
      throw new BadRequestException('Cần ít nhất một bước duyệt');
    }

    const participantRows = buildParticipantCreates(dto);

    return this.prisma.approvalWorkflow.create({
      data: {
        name: dto.name,
        proposalTypeId: dto.proposalTypeId,
        isSequential: dto.isSequential ?? true,
        steps: {
          create: dto.steps.map((s) => ({
            stepOrder: s.stepOrder,
            label: s.label,
            approverId: s.approverId,
            isSeniorApprover: s.isSeniorApprover ?? false,
          })),
        },
        ...(participantRows.length
          ? { participants: { create: participantRows } }
          : {}),
      },
      include: workflowInclude,
    });
  }

  async update(id: string, dto: UpdateWorkflowDto) {
    await this.findOne(id);

    if (dto.steps) {
      await this.prisma.approvalWorkflowStep.deleteMany({
        where: { workflowId: id },
      });
    }

    const syncParticipants =
      dto.watcherIds !== undefined ||
      dto.notifyIds !== undefined ||
      dto.executorIds !== undefined;

    if (syncParticipants) {
      await this.prisma.approvalWorkflowParticipant.deleteMany({
        where: { workflowId: id },
      });
    }

    const participantRows = syncParticipants
      ? buildParticipantCreates(dto)
      : [];

    return this.prisma.approvalWorkflow.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.isSequential !== undefined
          ? { isSequential: dto.isSequential }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.steps
          ? {
              steps: {
                create: dto.steps.map((s) => ({
                  stepOrder: s.stepOrder,
                  label: s.label,
                  approverId: s.approverId,
                  isSeniorApprover: s.isSeniorApprover ?? false,
                })),
              },
            }
          : {}),
        ...(syncParticipants && participantRows.length
          ? { participants: { create: participantRows } }
          : {}),
      },
      include: workflowInclude,
    });
  }
}