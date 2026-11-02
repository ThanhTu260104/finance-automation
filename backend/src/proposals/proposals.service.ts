import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStepStatus,
  NotificationType,
  ParticipantRole,
  ProposalStatus,
  Prisma,
} from '@prisma/client';
import { UserContextService } from '../common/user-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { roleHasPermission } from '../roles/role-permissions';
import {
  ApproveProposalDto,
  CancelProposalDto,
  RejectProposalDto,
} from './dto/approve-proposal.dto';
import { CreateProposalDto } from './dto/create-proposal.dto';
import {
  ProposalQueryDto,
  ProposalViewFilter,
} from './dto/proposal-query.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';

const proposalInclude = {
  proposalType: true,
  department: true,
  creator: { select: { id: true, fullName: true, email: true } },
  workflow: {
    include: {
      steps: {
        orderBy: { stepOrder: 'asc' as const },
        include: {
          approver: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      },
      participants: {
        include: { user: { select: { id: true, fullName: true } } },
      },
    },
  },
  participants: {
    include: { user: { select: { id: true, fullName: true, email: true } } },
  },
  approvalSteps: {
    orderBy: { stepOrder: 'asc' as const },
    include: {
      approver: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
    },
  },
  attachments: {
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.ProposalInclude;

const proposalListInclude = {
  proposalType: {
    select: { id: true, code: true, name: true, group: true },
  },
  department: { select: { id: true, name: true } },
  creator: { select: { id: true, fullName: true, email: true } },
  workflow: {
    select: {
      isSequential: true,
      steps: {
        select: { stepOrder: true, isSeniorApprover: true },
      },
    },
  },
  participants: {
    where: { role: ParticipantRole.EXECUTOR },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
  },
  approvalSteps: {
    orderBy: { stepOrder: 'asc' as const },
    select: {
      id: true,
      stepOrder: true,
      approverId: true,
      status: true,
      comment: true,
      actedAt: true,
      isSeniorApprover: true,
    },
  },
} satisfies Prisma.ProposalInclude;

function isSeniorWorkflowStep(
  workflow:
    | { steps: { stepOrder: number; isSeniorApprover: boolean }[] }
    | null
    | undefined,
  stepOrder: number,
) {
  return (
    workflow?.steps.some(
      (s) => s.stepOrder === stepOrder && s.isSeniorApprover,
    ) ?? false
  );
}

function getInitialApproverIds(proposal: {
  approvalSteps: Array<{ approverId: string; status: ApprovalStepStatus; stepOrder: number; isSeniorApprover: boolean }>;
  workflow?: { isSequential?: boolean; steps: { stepOrder: number; isSeniorApprover: boolean }[] } | null;
  currentStepOrder: number;
}) {
  return Array.from(
    new Set(
      proposal.approvalSteps
        .filter((s) => s.status === ApprovalStepStatus.PENDING)
        .filter((s) =>
          !proposal.workflow?.isSequential
            ? true
            : s.stepOrder === proposal.currentStepOrder ||
              s.isSeniorApprover,
        )
        .map((s) => s.approverId)
        .filter(Boolean),
    ),
  );
}

function isBlank(value?: string | null) {
  return !value || value.trim().length === 0;
}

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContextService,
    private readonly notifications: NotificationsService,
  ) {}

  private async getCommentContext(proposalId: string, userId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        title: true,
        creatorId: true,
        departmentId: true,
        approvalSteps: { select: { approverId: true } },
        participants: { select: { userId: true } },
        comments: { select: { authorId: true } },
      },
    });
    if (!proposal) throw new NotFoundException('Không tìm thấy đề xuất');

    const memberIds = new Set([
      proposal.creatorId,
      ...proposal.approvalSteps.map((step) => step.approverId),
      ...proposal.participants.map((participant) => participant.userId),
    ]);
    if (proposal.departmentId) {
      const projectMembers = await this.prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { departmentId: proposal.departmentId },
            { departmentMemberships: { some: { departmentId: proposal.departmentId } } },
          ],
        },
        select: { id: true },
      });
      projectMembers.forEach((member) => memberIds.add(member.id));
    }
    if (!memberIds.has(userId)) {
      throw new ForbiddenException('Bạn không thuộc luồng trao đổi của đề xuất này');
    }
    return { proposal, memberIds };
  }

  async getComments(id: string, rawUserId: string) {
    const userId = this.userContext.requireUserId(rawUserId);
    await this.getCommentContext(id, userId);
    return this.prisma.proposalComment.findMany({
      where: { proposalId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async addComment(id: string, rawUserId: string, content: string) {
    const userId = this.userContext.requireUserId(rawUserId);
    const { proposal, memberIds } = await this.getCommentContext(id, userId);
    const author = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, isActive: true },
    });
    if (!author?.isActive) throw new ForbiddenException('Tài khoản không hoạt động');

    const comment = await this.prisma.proposalComment.create({
      data: { proposalId: id, authorId: userId, content },
      include: {
        author: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
    });

    proposal.comments.forEach((item) => memberIds.add(item.authorId));
    memberIds.delete(userId);
    const preview = content.length > 140 ? `${content.slice(0, 137)}...` : content;
    await Promise.all(
      Array.from(memberIds).map((recipientId) =>
        this.notifications.create(undefined, {
          userId: recipientId,
          type: NotificationType.INFO,
          title: 'Ý kiến mới về đề xuất',
          message: `${author.fullName}: ${preview}`,
          link: `/proposals/${id}`,
          payload: { proposalId: id, commentId: comment.id },
        }),
      ),
    );
    return comment;
  }

  private getUserDepartmentIds(user: {
    departmentId?: string | null;
    departmentMemberships?: Array<{ departmentId: string | null }>;
  }) {
    return Array.from(
      new Set(
        [
          ...(user.departmentMemberships?.map((item) => item.departmentId) ??
            []),
          user.departmentId,
        ].filter(Boolean) as string[],
      ),
    );
  }

  private async getProposalAccessScope(
    userId: string,
  ): Promise<Prisma.ProposalWhereInput> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        departmentId: true,
        departmentMemberships: { select: { departmentId: true } },
        role: { select: { permissions: true } },
      },
    });
    if (!user || !roleHasPermission(user.role.permissions, 'proposal.view')) {
      throw new ForbiddenException('Bạn không có quyền xem đề xuất');
    }
    if (roleHasPermission(user.role.permissions, 'proposal.view_all')) {
      return {};
    }

    const departmentIds = this.getUserDepartmentIds(user);
    if (departmentIds.length > 0) {
      return { departmentId: { in: departmentIds } };
    }
    return {
      OR: [
        { creatorId: userId },
        { approvalSteps: { some: { approverId: userId } } },
        { participants: { some: { userId } } },
      ],
    };
  }

  private resolveProposalDepartmentId(
    user: {
      departmentId?: string | null;
      departmentMemberships?: Array<{ departmentId: string | null }>;
    },
    requestedDepartmentId?: string | null,
  ) {
    const allowedDepartmentIds = this.getUserDepartmentIds(user);
    if (allowedDepartmentIds.length === 0) {
      throw new BadRequestException('Tài khoản chưa được gán dự án');
    }

    if (requestedDepartmentId) {
      if (!allowedDepartmentIds.includes(requestedDepartmentId)) {
        throw new ForbiddenException('Bạn không thuộc dự án này');
      }
      return requestedDepartmentId;
    }

    if (allowedDepartmentIds.length === 1) {
      return allowedDepartmentIds[0];
    }

    throw new BadRequestException('Vui lòng chọn dự án');
  }

  private assertReadyForSubmit(data: {
    proposalTypeId?: string | null;
    title?: string | null;
    departmentId?: string | null;
    content?: string | null;
    paymentAmount?: number | string | Prisma.Decimal | null;
    paymentContent?: string | null;
    paymentMethod?: string | null;
    cashRecipient?: string | null;
    accountHolder?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
  }) {
    const missing: string[] = [];

    if (isBlank(data.proposalTypeId)) missing.push('loại đề xuất');
    if (isBlank(data.departmentId)) missing.push('dự án');
    if (isBlank(data.title)) missing.push('tên đề xuất');
    if (isBlank(data.paymentContent)) missing.push('nội dung thanh toán');
    if (data.paymentAmount === null || data.paymentAmount === undefined) {
      missing.push('số tiền thanh toán');
    } else if (Number(data.paymentAmount) <= 0) {
      missing.push('số tiền thanh toán lớn hơn 0');
    }
    if (data.paymentMethod === 'CASH') {
      if (isBlank(data.cashRecipient)) missing.push('nơi/người nhận tiền');
    } else {
      if (isBlank(data.accountHolder)) missing.push('tên chủ tài khoản');
      if (isBlank(data.bankName)) missing.push('ngân hàng - chi nhánh');
      if (isBlank(data.accountNumber)) missing.push('số tài khoản');
    }
    if (isBlank(data.content)) missing.push('nội dung mô tả');

    if (missing.length) {
      throw new BadRequestException(
        `Vui lòng nhập đầy đủ thông tin bắt buộc: ${missing.join(', ')}`,
      );
    }
  }

  async getStats(rawUserId: string) {
    const userId = this.userContext.requireUserId(rawUserId);
    const [mine, pending, approved, pendingPayment, paid, rejected, needApproval] =
      await Promise.all([
      this.prisma.proposal.count({ where: { creatorId: userId } }),
      this.prisma.proposal.count({
        where: { creatorId: userId, status: ProposalStatus.PENDING },
      }),
      this.prisma.proposal.count({
        where: {
          creatorId: userId,
          status: {
            in: [
              ProposalStatus.APPROVED,
              ProposalStatus.PENDING_PAYMENT,
              ProposalStatus.PAID,
            ],
          },
        },
      }),
      this.prisma.proposal.count({
        where: { creatorId: userId, status: ProposalStatus.PENDING_PAYMENT },
      }),
      this.prisma.proposal.count({
        where: { creatorId: userId, status: ProposalStatus.PAID },
      }),
      this.prisma.proposal.count({
        where: { creatorId: userId, status: ProposalStatus.REJECTED },
      }),
      this.prisma.proposal.count({
        where: {
          status: ProposalStatus.PENDING,
          approvalSteps: {
            some: {
              approverId: userId,
              status: ApprovalStepStatus.PENDING,
            },
          },
        },
      }),
    ]);
    return { mine, pending, approved, pendingPayment, paid, rejected, needApproval };
  }

  async findAll(rawUserId: string, query: ProposalQueryDto) {
    const userId = this.userContext.requireUserId(rawUserId);
    const accessScope = await this.getProposalAccessScope(userId);
    const view = query.view ?? ProposalViewFilter.ALL;
    let where: Prisma.ProposalWhereInput = {};

    switch (view) {
      case ProposalViewFilter.DRAFT:
        where = {
          creatorId: userId,
          status: ProposalStatus.DRAFT,
        };
        break;
      case ProposalViewFilter.CANCELLED:
        where = {
          creatorId: userId,
          status: ProposalStatus.CANCELLED,
        };
        break;
      case ProposalViewFilter.MINE:
        where = { creatorId: userId };
        break;
      case ProposalViewFilter.APPROVE:
        where = {
          status: ProposalStatus.PENDING,
          approvalSteps: {
            some: {
              approverId: userId,
              status: ApprovalStepStatus.PENDING,
            },
          },
        };
        break;
      case ProposalViewFilter.WATCH:
        where = {
          participants: {
            some: { userId, role: ParticipantRole.WATCHER },
          },
        };
        break;
      case ProposalViewFilter.NOTIFY:
        where = {
          participants: {
            some: { userId, role: ParticipantRole.NOTIFY },
          },
        };
        break;
      case ProposalViewFilter.EXECUTE:
        where = {
          participants: {
            some: { userId, role: ParticipantRole.EXECUTOR },
          },
        };
        break;
      default:
        where = {};
    }
    where = { AND: [accessScope, where] };

    const isSeparatedStatusView =
      view === ProposalViewFilter.DRAFT ||
      view === ProposalViewFilter.CANCELLED;

    if (!isSeparatedStatusView) {
      where = {
        AND: [
          where,
          {
            status: {
              notIn: [ProposalStatus.DRAFT, ProposalStatus.CANCELLED],
            },
          },
        ],
      };
    }

    if (
      query.amountMin !== undefined &&
      query.amountMax !== undefined &&
      query.amountMin > query.amountMax
    ) {
      throw new BadRequestException(
        'Số tiền từ không được lớn hơn số tiền đến',
      );
    }

    const filters: Prisma.ProposalWhereInput[] = [];

    if (
      query.status &&
      !isSeparatedStatusView &&
      query.status !== ProposalStatus.DRAFT &&
      query.status !== ProposalStatus.CANCELLED
    ) {
      filters.push({ status: query.status });
    }
    if (query.proposalTypeId) {
      filters.push({ proposalTypeId: query.proposalTypeId });
    }
    if (query.departmentId) {
      filters.push({ departmentId: query.departmentId });
    }
    if (query.creatorId) {
      filters.push({ creatorId: query.creatorId });
    }
    if (query.executorId) {
      filters.push({
        participants: {
          some: { userId: query.executorId, role: ParticipantRole.EXECUTOR },
        },
      });
    }
    if (query.projectName) {
      filters.push({ projectName: query.projectName });
    }
    if (query.dateFrom || query.dateTo) {
      filters.push({
        createdAt: {
          ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo
            ? { lt: new Date(new Date(query.dateTo).getTime() + 86400000) }
            : {}),
        },
      });
    }
    if (query.amountMin !== undefined || query.amountMax !== undefined) {
      filters.push({
        paymentAmount: {
          ...(query.amountMin !== undefined ? { gte: query.amountMin } : {}),
          ...(query.amountMax !== undefined ? { lte: query.amountMax } : {}),
        },
      });
    }
    if (query.search) {
      filters.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { code: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    if (filters.length) {
      where = { AND: [where, ...filters] };
    }

    const page = query.page ?? 1;
    const limit = query.limit;
    const skip = limit ? (page - 1) * limit : 0;
    const filterApprovalTurnAfterQuery = view === ProposalViewFilter.APPROVE;

    const baseRows = await this.prisma.proposal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      // The approve view needs an additional sequential-workflow check below,
      // so it is sliced only after that check has been applied.
      skip: limit && !filterApprovalTurnAfterQuery ? skip : undefined,
      take: limit && !filterApprovalTurnAfterQuery ? limit : 100,
    });

    const proposalIds = baseRows.map((row) => row.id);
    const [proposalTypes, departments, creators, participants, approvalSteps, workflows] =
      await Promise.all([
        this.prisma.proposalType.findMany({
          where: { id: { in: Array.from(new Set(baseRows.map((row) => row.proposalTypeId))) } },
          select: { id: true, code: true, name: true, group: true },
        }),
        this.prisma.department.findMany({
          where: {
            id: {
              in: Array.from(
                new Set(baseRows.map((row) => row.departmentId).filter(Boolean) as string[]),
              ),
            },
          },
          select: { id: true, name: true },
        }),
        this.prisma.user.findMany({
          where: { id: { in: Array.from(new Set(baseRows.map((row) => row.creatorId))) } },
          select: { id: true, fullName: true, email: true },
        }),
        this.prisma.proposalParticipant.findMany({
          where: { proposalId: { in: proposalIds }, role: ParticipantRole.EXECUTOR },
          select: {
            proposalId: true,
            role: true,
            user: { select: { id: true, fullName: true, email: true } },
          },
        }),
        this.prisma.proposalApprovalStep.findMany({
          where: { proposalId: { in: proposalIds } },
          orderBy: [{ proposalId: 'asc' }, { stepOrder: 'asc' }],
          select: {
            id: true,
            proposalId: true,
            stepOrder: true,
            approverId: true,
            status: true,
            comment: true,
            actedAt: true,
          },
        }),
        this.prisma.approvalWorkflow.findMany({
          where: {
            id: {
              in: Array.from(
                new Set(baseRows.map((row) => row.workflowId).filter(Boolean) as string[]),
              ),
            },
          },
          select: {
            id: true,
            name: true,
            isSequential: true,
            steps: {
              orderBy: { stepOrder: 'asc' },
              select: { stepOrder: true, isSeniorApprover: true },
            },
          },
        }),
      ]);

    const proposalTypeById = new Map(proposalTypes.map((row) => [row.id, row]));
    const departmentById = new Map(departments.map((row) => [row.id, row]));
    const creatorById = new Map(creators.map((row) => [row.id, row]));
    const workflowById = new Map(workflows.map((row) => [row.id, row]));
    const participantsByProposal = new Map<string, typeof participants>();
    for (const participant of participants) {
      const grouped = participantsByProposal.get(participant.proposalId) ?? [];
      grouped.push(participant);
      participantsByProposal.set(participant.proposalId, grouped);
    }

    const approvalStepsByProposal = new Map<string, typeof approvalSteps>();
    for (const approvalStep of approvalSteps) {
      const grouped = approvalStepsByProposal.get(approvalStep.proposalId) ?? [];
      grouped.push(approvalStep);
      approvalStepsByProposal.set(approvalStep.proposalId, grouped);
    }

    const rows = baseRows.map((row) => ({
      ...row,
      proposalType: proposalTypeById.get(row.proposalTypeId)!,
      department: row.departmentId ? departmentById.get(row.departmentId) ?? null : null,
      creator: creatorById.get(row.creatorId)!,
      workflow: row.workflowId ? workflowById.get(row.workflowId) ?? null : null,
      participants: participantsByProposal.get(row.id) ?? [],
      approvalSteps: approvalStepsByProposal.get(row.id) ?? [],
    }));

    if (view === ProposalViewFilter.APPROVE) {
      const filteredRows = rows.filter((p) => {
        if (p.workflow?.isSequential) {
          return p.approvalSteps.some(
            (s) =>
              s.approverId === userId &&
              s.status === ApprovalStepStatus.PENDING &&
              (s.stepOrder === p.currentStepOrder ||
                isSeniorWorkflowStep(p.workflow, s.stepOrder)),
          );
        }

        return p.approvalSteps.some(
          (s) => s.approverId === userId && s.status === ApprovalStepStatus.PENDING,
        );
      });

      return limit ? filteredRows.slice(skip, skip + limit) : filteredRows;
    }

    return rows;
  }

  async getProjects(rawUserId: string) {
    const userId = this.userContext.requireUserId(rawUserId);
    const accessScope = await this.getProposalAccessScope(userId);
    const rows = await this.prisma.proposal.findMany({
      where: {
        AND: [
          accessScope,
          {
            projectName: { not: null },
            status: { notIn: [ProposalStatus.DRAFT, ProposalStatus.CANCELLED] },
          },
        ],
      },
      select: { projectName: true },
      distinct: ['projectName'],
      orderBy: { projectName: 'asc' },
    });

    return rows
      .map((row) => row.projectName?.trim())
      .filter((name): name is string => Boolean(name));
  }

  async findOne(id: string, rawUserId?: string) {
    const userId = rawUserId
      ? this.userContext.requireUserId(rawUserId)
      : undefined;
    const accessScope = userId
      ? await this.getProposalAccessScope(userId)
      : {};
    const proposal = await this.prisma.proposal.findFirst({
      where: { AND: [{ id }, accessScope] },
      include: proposalInclude,
    });
    if (!proposal) throw new NotFoundException('Không tìm thấy đề xuất');
    if (userId) {
      if (
        (proposal.status === ProposalStatus.DRAFT ||
          proposal.status === ProposalStatus.CANCELLED) &&
        proposal.creatorId !== userId
      ) {
        throw new NotFoundException('Không tìm thấy đề xuất');
      }
    }
    return proposal;
  }

  async create(rawUserId: string, dto: CreateProposalDto) {
    const userId = this.userContext.requireUserId(rawUserId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        departmentId: true,
        departmentMemberships: { select: { departmentId: true } },
        role: { select: { permissions: true } },
      },
    });
    if (!user || !roleHasPermission(user.role.permissions, 'proposal.create')) {
      throw new ForbiddenException('Bạn không có quyền tạo đề xuất');
    }

    const workflow = await this.prisma.approvalWorkflow.findFirst({
      where: { proposalTypeId: dto.proposalTypeId, isActive: true },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        participants: true,
      },
    });

    const status =
      dto.saveAsDraft !== false ? ProposalStatus.DRAFT : ProposalStatus.PENDING;
    const code = await this.generateCode();
    const departmentId = this.resolveProposalDepartmentId(
      user,
      dto.departmentId,
    );

    if (status === ProposalStatus.PENDING) {
      if (!workflow?.steps.length) {
        throw new BadRequestException(
          'Chưa cấu hình quy trình duyệt cho loại đề xuất này',
        );
      }
      this.assertReadyForSubmit({ ...dto, departmentId });
    }

    const workflowParticipants =
      workflow?.participants.map((p) => ({
        userId: p.userId,
        role: p.role,
      })) ?? [];
    const proposal = await this.prisma.proposal.create({
      data: {
        code,
        title: dto.title,
        status,
        proposalTypeId: dto.proposalTypeId,
        workflowId: workflow?.id,
        creatorId: userId,
        departmentId,
        projectName: dto.projectName,
        content: dto.content,
        paymentAmount: dto.paymentAmount,
        paymentContent: dto.paymentContent,
        paymentMethod: dto.paymentMethod,
        cashRecipient: dto.cashRecipient,
        accountHolder: dto.accountHolder,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        contractRef: dto.contractRef,
        invoiceRef: dto.invoiceRef,
        desiredDeadline: dto.desiredDeadline
          ? new Date(dto.desiredDeadline)
          : undefined,
        regulationDeadline: dto.regulationDeadline
          ? new Date(dto.regulationDeadline)
          : undefined,
        currentStepOrder: status === ProposalStatus.PENDING ? 1 : 0,
        ...(workflowParticipants.length
          ? { participants: { create: workflowParticipants } }
          : {}),
        ...(status === ProposalStatus.PENDING && workflow?.steps.length
          ? {
              approvalSteps: {
                create: workflow.steps.map((s) => ({
                  stepOrder: s.stepOrder,
                  approverId: s.approverId,
                  isSeniorApprover: s.isSeniorApprover,
                  status: ApprovalStepStatus.PENDING,
                })),
              },
            }
          : {}),
      },
      include: proposalInclude,
    });

    if (status === ProposalStatus.PENDING) {
      await this.notifyApproversOfSubmit(proposal.id);
    }

    return proposal;
  }

  async update(id: string, rawUserId: string, dto: UpdateProposalDto) {
    const userId = this.userContext.requireUserId(rawUserId);
    const existing = await this.findOne(id);
    if (existing.creatorId !== userId) {
      throw new ForbiddenException('Chỉ người tạo mới được sửa');
    }
    if (
      existing.status !== ProposalStatus.DRAFT &&
      existing.status !== ProposalStatus.PENDING
    ) {
      throw new BadRequestException('Đề xuất không thể chỉnh sửa');
    }

    const shouldSubmit =
      existing.status === ProposalStatus.DRAFT && dto.saveAsDraft === false;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        departmentId: true,
        departmentMemberships: { select: { departmentId: true } },
      },
    });
    if (!user) throw new ForbiddenException('Người dùng không hợp lệ');
    const departmentId =
      dto.departmentId !== undefined
        ? this.resolveProposalDepartmentId(user, dto.departmentId)
        : undefined;

    await this.prisma.proposal.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.departmentId !== undefined
          ? { departmentId }
          : {}),
        ...(dto.projectName !== undefined
          ? { projectName: dto.projectName }
          : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.paymentAmount !== undefined
          ? { paymentAmount: dto.paymentAmount }
          : {}),
        ...(dto.paymentContent !== undefined
          ? { paymentContent: dto.paymentContent }
          : {}),
        ...(dto.paymentMethod !== undefined
          ? { paymentMethod: dto.paymentMethod }
          : {}),
        ...(dto.cashRecipient !== undefined
          ? { cashRecipient: dto.cashRecipient }
          : {}),
        ...(dto.accountHolder !== undefined
          ? { accountHolder: dto.accountHolder }
          : {}),
        ...(dto.bankName !== undefined ? { bankName: dto.bankName } : {}),
        ...(dto.accountNumber !== undefined
          ? { accountNumber: dto.accountNumber }
          : {}),
        ...(dto.contractRef !== undefined
          ? { contractRef: dto.contractRef }
          : {}),
        ...(dto.invoiceRef !== undefined ? { invoiceRef: dto.invoiceRef } : {}),
        ...(dto.desiredDeadline !== undefined
          ? {
              desiredDeadline: dto.desiredDeadline
                ? new Date(dto.desiredDeadline)
                : null,
            }
          : {}),
        ...(dto.regulationDeadline !== undefined
          ? {
              regulationDeadline: dto.regulationDeadline
                ? new Date(dto.regulationDeadline)
                : null,
            }
          : {}),
        ...(dto.saveAsDraft === true ? { status: ProposalStatus.DRAFT } : {}),
      },
    });

    if (shouldSubmit) {
      return this.submit(id, rawUserId);
    }

    return this.findOne(id);
  }

  async submit(id: string, rawUserId: string) {
    const userId = this.userContext.requireUserId(rawUserId);
    const proposal = await this.findOne(id);
    if (proposal.creatorId !== userId) {
      throw new ForbiddenException('Chỉ người tạo mới được gửi duyệt');
    }
    if (proposal.status !== ProposalStatus.DRAFT) {
      throw new BadRequestException('Chỉ gửi duyệt đề xuất nháp');
    }

    this.assertReadyForSubmit(proposal);

    const workflow = proposal.workflowId
      ? await this.prisma.approvalWorkflow.findUnique({
          where: { id: proposal.workflowId },
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
            participants: true,
          },
        })
      : await this.prisma.approvalWorkflow.findFirst({
          where: { proposalTypeId: proposal.proposalTypeId, isActive: true },
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
            participants: true,
          },
        });

    if (!workflow?.steps.length) {
      throw new BadRequestException(
        'Chưa cấu hình quy trình duyệt cho loại đề xuất này',
      );
    }

    if (!proposal.participants.length && workflow.participants.length) {
      await this.prisma.proposalParticipant.createMany({
        data: workflow.participants.map((p) => ({
          proposalId: id,
          userId: p.userId,
          role: p.role,
        })),
      });
    }

    await this.prisma.proposalApprovalStep.deleteMany({
      where: { proposalId: id },
    });
    const updated = await this.prisma.proposal.update({
      where: { id },
      data: {
        status: ProposalStatus.PENDING,
        workflowId: workflow.id,
        currentStepOrder: workflow.isSequential ? 1 : 0,
        approvalSteps: {
          create: workflow.steps.map((s) => ({
            stepOrder: s.stepOrder,
            approverId: s.approverId,
            isSeniorApprover: s.isSeniorApprover,
            status: ApprovalStepStatus.PENDING,
          })),
        },
      },
      include: proposalInclude,
    });

    // async notify approvers (don't block response)
    this.notifyApproversOfSubmit(id).catch(() => {});

    return updated;
  }

  // After submit: notify initial approvers and creator
  private async notifyApproversOfSubmit(proposalId: string) {
    const proposal = await this.findOne(proposalId);
    const approverIds = getInitialApproverIds(proposal);

    await Promise.all(
      approverIds.map((approverId) =>
        this.notifications.create(undefined, {
          userId: approverId,
          type: 'ACTION',
          title: 'Đề xuất mới cần duyệt',
          message: `Đề xuất "${proposal.title}" vừa được gửi và đang chờ bạn duyệt.`,
          link: `/proposals/${proposal.id}`,
          payload: { proposalId: proposal.id },
        }),
      ),
    );

    try {
      await this.notifications.create(undefined, {
        userId: proposal.creatorId,
        type: 'INFO',
        title: 'Đã gửi yêu cầu duyệt',
        message: `Đề xuất "${proposal.title}" của bạn đã được gửi để duyệt.`,
        link: `/proposals/${proposal.id}`,
        payload: { proposalId: proposal.id },
      });
    } catch (e) {
      // ignore notification errors
    }
  }

  async approve(id: string, rawUserId: string, dto: ApproveProposalDto) {
    const userId = this.userContext.requireUserId(rawUserId);
    const proposal = await this.findOne(id);
    if (proposal.status !== ProposalStatus.PENDING) {
      throw new BadRequestException('Đề xuất không ở trạng thái chờ duyệt');
    }

    const step = proposal.approvalSteps.find(
      (s) => s.approverId === userId && s.status === ApprovalStepStatus.PENDING,
    );
    const approver = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, role: { select: { permissions: true } } },
    });
    if (
      !approver ||
      !roleHasPermission(approver.role.permissions, 'proposal.approve')
    ) {
      throw new ForbiddenException('Bạn không có quyền phê duyệt đề xuất');
    }
    if (!step) {
      throw new ForbiddenException('Bạn không phải người duyệt hiện tại');
    }

    const isSenior = step.isSeniorApprover;

    // If workflow is sequential, enforce ordering. Senior approvers may act anytime.
    if (
      proposal.workflow?.isSequential &&
      !isSenior &&
      step.stepOrder !== proposal.currentStepOrder
    ) {
      throw new BadRequestException('Chưa đến lượt duyệt của bạn');
    }

    await this.prisma.proposalApprovalStep.update({
      where: { id: step.id },
      data: {
        status: ApprovalStepStatus.APPROVED,
        comment: dto.comment,
        actedAt: new Date(),
      },
    });
    await this.notifications.markProposalNotificationsRead(
      id,
      [NotificationType.ACTION],
      [userId],
    );

    let updatedProposal: any = null;

    if (isSenior) {
      await this.prisma.proposalApprovalStep.updateMany({
        where: {
          proposalId: id,
          id: { not: step.id },
          status: ApprovalStepStatus.PENDING,
        },
        data: { status: ApprovalStepStatus.SKIPPED },
      });

      updatedProposal = await this.prisma.proposal.update({
        where: { id },
        data: {
          status: ProposalStatus.PENDING_PAYMENT,
          currentStepOrder: 0,
          lastReminderSentAt: new Date(),
        },
        include: proposalInclude,
      });
    }

    // For sequential workflows move to next step; for parallel workflows
    // check whether any pending steps remain and only mark approved when all done.
    let nextApproverIds: string[] = [];

    if (proposal.workflow?.isSequential && !isSenior) {
      const nextStep = proposal.approvalSteps.find(
        (s) => s.stepOrder === step.stepOrder + 1,
      );

      if (!nextStep) {
        updatedProposal = await this.prisma.proposal.update({
          where: { id },
          data: {
            status: ProposalStatus.PENDING_PAYMENT,
            currentStepOrder: 0,
            lastReminderSentAt: new Date(),
          },
          include: proposalInclude,
        });
      } else {
        updatedProposal = await this.prisma.proposal.update({
          where: { id },
          data: { currentStepOrder: nextStep.stepOrder },
          include: proposalInclude,
        });

        nextApproverIds = proposal.approvalSteps
          .filter(
            (s) =>
              s.status === ApprovalStepStatus.PENDING &&
              (s.stepOrder === nextStep.stepOrder ||
                s.isSeniorApprover),
          )
          .map((s) => s.approverId)
          .filter(Boolean);
      }
    }

    // Non-sequential: if no pending steps remain, mark approved.
    const remaining = await this.prisma.proposalApprovalStep.count({
      where: { proposalId: id, status: ApprovalStepStatus.PENDING },
    });

    if (!remaining && !updatedProposal) {
      updatedProposal = await this.prisma.proposal.update({
        where: { id },
        data: {
          status: ProposalStatus.PENDING_PAYMENT,
          currentStepOrder: 0,
          lastReminderSentAt: new Date(),
        },
        include: proposalInclude,
      });

    }

    if (!updatedProposal) updatedProposal = await this.findOne(id);

    if (updatedProposal.status === ProposalStatus.PENDING_PAYMENT) {
      await this.notifications.markProposalNotificationsRead(id, [
        NotificationType.ACTION,
      ]);
      try {
        await this.notifications.create(undefined, {
          userId: updatedProposal.creatorId,
          type: NotificationType.INFO,
          title: 'Đề xuất đã được duyệt',
          message: `Đề xuất "${updatedProposal.title}" đã được duyệt và đang chờ thanh toán.`,
          link: `/proposals/${updatedProposal.id}`,
          payload: { proposalId: updatedProposal.id },
        });
      } catch (e) {
        // ignore notification errors
      }

      const executorIds = await this.getPaymentUserIds(updatedProposal);

      if (executorIds.length) {
        await Promise.all(
          executorIds.map((executorId) =>
            this.notifications.create(undefined, {
              userId: executorId,
              type: NotificationType.TASK,
              title: 'Nhắc thanh toán đề xuất',
              message: `Đề xuất "${updatedProposal.title}" đã được duyệt và đang chờ thanh toán.`,
              link: `/proposals/${updatedProposal.id}`,
              payload: { proposalId: updatedProposal.id },
            }),
          ),
        );
      }
    } else {
      try {
        await this.notifications.create(undefined, {
          userId: updatedProposal.creatorId,
          type: NotificationType.INFO,
          title: 'Đề xuất đã được duyệt một bước',
          message: `${approver.fullName} đã duyệt đề xuất "${updatedProposal.title}". Đề xuất đang chờ bước duyệt tiếp theo.`,
          link: `/proposals/${updatedProposal.id}`,
          payload: { proposalId: updatedProposal.id, approverId: approver.id },
        });
      } catch (e) {
        // Do not fail the approval when notification delivery is unavailable.
      }
    }

    if (nextApproverIds.length) {
      await Promise.all(
        nextApproverIds.map((approverId) =>
          this.notifications.create(undefined, {
            userId: approverId,
            type: NotificationType.ACTION,
            title: 'Tiếp tục duyệt đề xuất',
            message: `Đề xuất "${updatedProposal.title}" đang chờ duyệt tiếp.`,
            link: `/proposals/${updatedProposal.id}`,
            payload: { proposalId: updatedProposal.id },
          }),
        ),
      );
    }

    return updatedProposal;
  }

  async reject(id: string, rawUserId: string, dto: RejectProposalDto) {
    const userId = this.userContext.requireUserId(rawUserId);
    const comment = dto.comment?.trim();
    if (!comment) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối');
    }
    const proposal = await this.findOne(id);
    const step = proposal.approvalSteps.find(
      (s) => s.approverId === userId && s.status === ApprovalStepStatus.PENDING,
    );
    const approver = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: { select: { permissions: true } } },
    });
    if (
      !approver ||
      !roleHasPermission(approver.role.permissions, 'proposal.approve')
    ) {
      throw new ForbiddenException('Bạn không có quyền từ chối đề xuất');
    }
    if (!step) {
      throw new ForbiddenException('Bạn không thể từ chối đề xuất này');
    }

    const isSenior = step.isSeniorApprover;

    if (
      proposal.workflow?.isSequential &&
      !isSenior &&
      step.stepOrder !== proposal.currentStepOrder
    ) {
      throw new ForbiddenException('Bạn không thể từ chối đề xuất này');
    }

    await this.prisma.proposalApprovalStep.update({
      where: { id: step.id },
      data: {
        status: ApprovalStepStatus.REJECTED,
        comment,
        actedAt: new Date(),
      },
    });

    const updated = await this.prisma.proposal.update({
      where: { id },
      data: { status: ProposalStatus.REJECTED },
      include: proposalInclude,
    });
    await this.notifications.markProposalNotificationsRead(id, [
      NotificationType.ACTION,
      NotificationType.TASK,
    ]);

    // notify creator when rejected
    try {
      await this.notifications.create(undefined, {
        userId: updated.creatorId,
        type: 'INFO',
        title: 'Đề xuất bị từ chối',
        message: `Đề xuất "${updated.title}" đã bị từ chối.`,
        link: `/proposals/${updated.id}`,
        payload: { proposalId: updated.id },
      });
    } catch (e) {
      // ignore
    }

    return updated;
  }

  private async notifySelectedRecipients(proposal: {
    id: string;
    title: string;
    participants: Array<{ userId: string; role: ParticipantRole }>;
  }) {
    const recipientIds = Array.from(
      new Set(
        proposal.participants
          .filter((participant) => participant.role === ParticipantRole.NOTIFY)
          .map((participant) => participant.userId),
      ),
    );
    await Promise.all(
      recipientIds.map((recipientId) =>
        this.notifications.create(undefined, {
          userId: recipientId,
          type: NotificationType.INFO,
          title: 'Bạn được thêm vào đề xuất',
          message: `Bạn được chọn nhận thông báo cho đề xuất "${proposal.title}".`,
          link: `/proposals/${proposal.id}`,
          payload: { proposalId: proposal.id },
        }),
      ),
    );
  }

  async markPaid(id: string, rawUserId: string) {
    const userId = this.userContext.requireUserId(rawUserId);
    const proposal = await this.findOne(id);

    const isExecutor = proposal.participants.some(
      (participant) =>
        participant.userId === userId &&
        participant.role === ParticipantRole.EXECUTOR,
    );

    if (!isExecutor) {
      throw new ForbiddenException(
        'Bạn không có quyền xác nhận thanh toán đề xuất',
      );
    }

    // Chỉ thanh toán khi quy trình duyệt đã hoàn tất (BGĐ đã duyệt).
    // Không bao giờ bỏ qua người duyệt cấp cao.
    if (
      proposal.status !== ProposalStatus.PENDING_PAYMENT &&
      proposal.status !== ProposalStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Chỉ xác nhận thanh toán sau khi quy trình phê duyệt đã hoàn tất',
      );
    }

    const seniorSteps = proposal.approvalSteps.filter(
      (s) => s.isSeniorApprover,
    );
    if (
      seniorSteps.length &&
      !seniorSteps.some((s) => s.status === ApprovalStepStatus.APPROVED)
    ) {
      throw new BadRequestException(
        'Chỉ xác nhận thanh toán sau khi người duyệt cấp cao đã duyệt',
      );
    }

    const updated = await this.prisma.proposal.update({
      where: { id },
      data: {
        status: ProposalStatus.PAID,
        currentStepOrder: 0,
        paidAt: new Date(),
      },
      include: proposalInclude,
    });

    await this.notifications.markProposalNotificationsRead(id, [
      NotificationType.TASK,
      NotificationType.ACTION,
    ]);

    try {
      await this.notifications.create(undefined, {
        userId: updated.creatorId,
        type: NotificationType.INFO,
        title: 'Đề xuất đã thanh toán',
        message: `Đề xuất "${updated.title}" đã được xác nhận thanh toán.`,
        link: `/proposals/${updated.id}`,
        payload: { proposalId: updated.id },
      });
    } catch (e) {
      // ignore notification errors
    }

    return updated;
  }

  async duplicate(id: string, rawUserId: string) {
    const userId = this.userContext.requireUserId(rawUserId);
    const source = await this.findOne(id, rawUserId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: { select: { permissions: true } } },
    });
    if (!user || !roleHasPermission(user.role.permissions, 'proposal.create')) {
      throw new ForbiddenException('Bạn không có quyền tạo đề xuất');
    }

    const code = await this.generateCode();

    let participants: Array<{ userId: string; role: ParticipantRole }> = [];
    if (source.workflowId) {
      const wps = await this.prisma.approvalWorkflowParticipant.findMany({
        where: { workflowId: source.workflowId },
      });
      participants = wps.map((p) => ({ userId: p.userId, role: p.role }));
    } else {
      participants = source.participants.map((p) => ({
        userId: p.userId,
        role: p.role,
      }));
    }

    return this.prisma.proposal.create({
      data: {
        code,
        title: source.title,
        status: ProposalStatus.DRAFT,
        proposalTypeId: source.proposalTypeId,
        workflowId: source.workflowId,
        creatorId: userId,
        departmentId: source.departmentId,
        projectName: source.projectName,
        content: source.content
          ? `${source.content}\n\n(Nhân bản từ ${source.code})`
          : `Nhân bản từ ${source.code}`,
        paymentAmount: source.paymentAmount,
        paymentContent: source.paymentContent,
        paymentMethod: source.paymentMethod,
        cashRecipient: source.cashRecipient,
        accountHolder: source.accountHolder,
        bankName: source.bankName,
        accountNumber: source.accountNumber,
        contractRef: source.contractRef,
        invoiceRef: source.invoiceRef,
        desiredDeadline: source.desiredDeadline,
        regulationDeadline: source.regulationDeadline,
        linkedProposalId: source.id,
        currentStepOrder: 0,
        participants: { create: participants },
      },
      include: proposalInclude,
    });
  }

  async remove(id: string, rawUserId: string) {
    const userId = this.userContext.requireUserId(rawUserId);
    const proposal = await this.findOne(id);
    if (proposal.creatorId !== userId) {
      throw new ForbiddenException('Chỉ người tạo mới được xóa');
    }
    if (proposal.status !== ProposalStatus.DRAFT) {
      throw new BadRequestException('Chỉ xóa được đề xuất nháp');
    }
    await this.prisma.proposal.delete({ where: { id } });
    return { success: true };
  }

  async cancel(id: string, rawUserId: string, dto: CancelProposalDto) {
    const userId = this.userContext.requireUserId(rawUserId);
    const reason = dto.reason?.trim();
    if (!reason) {
      throw new BadRequestException('Vui lòng nhập lý do hủy đề xuất');
    }
    const proposal = await this.findOne(id);
    if (proposal.creatorId !== userId) {
      throw new ForbiddenException('Chỉ người tạo mới được hủy');
    }
    if (
      proposal.status !== ProposalStatus.DRAFT &&
      proposal.status !== ProposalStatus.PENDING
    ) {
      throw new BadRequestException('Không thể hủy đề xuất này');
    }
    const updated = await this.prisma.proposal.update({
      where: { id },
      data: {
        status: ProposalStatus.CANCELLED,
        currentStepOrder: 0,
        cancellationReason: reason,
      },
      include: proposalInclude,
    });
    await this.notifications.markProposalNotificationsRead(id, [
      NotificationType.ACTION,
      NotificationType.TASK,
    ]);
    return updated;
  }

  private async getPaymentUserIds(proposal: {
    participants: Array<{ userId: string; role: ParticipantRole }>;
  }) {
    return Array.from(
      new Set(
        proposal.participants
          .filter((participant) => participant.role === ParticipantRole.EXECUTOR)
          .map((participant) => participant.userId)
          .filter(Boolean),
      ),
    );
  }

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DX-${year}-`;
    const rows = await this.prisma.proposal.findMany({
      where: { code: { startsWith: prefix } },
      select: { code: true },
    });

    let maxSeq = 0;
    for (const row of rows) {
      const seq = Number.parseInt(row.code.slice(prefix.length), 10);
      if (!Number.isNaN(seq)) maxSeq = Math.max(maxSeq, seq);
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = `${prefix}${String(maxSeq + 1 + attempt).padStart(4, '0')}`;
      const exists = await this.prisma.proposal.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!exists) return code;
    }

    return `${prefix}${String(Date.now()).slice(-4)}`;
  }
}
