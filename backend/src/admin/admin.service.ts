import { ForbiddenException, Injectable } from '@nestjs/common';
import { ApprovalStepStatus, Prisma, ProposalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { roleHasPermission } from '../roles/role-permissions';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

type ReportPeriod = 'day' | 'week' | 'month';

type PeriodQuery = {
  period?: string;
  date?: string;
};

const APPROVED_STATUSES = [
  ProposalStatus.APPROVED,
  ProposalStatus.PENDING_PAYMENT,
  ProposalStatus.PAID,
];

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async getProposalAccess(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        departmentId: true,
        departmentMemberships: { select: { departmentId: true } },
        role: { select: { permissions: true } },
      },
    });
    if (!user || !roleHasPermission(user.role.permissions, 'proposal.view')) {
      throw new ForbiddenException('Bạn không có quyền xem dữ liệu đề xuất');
    }
    if (roleHasPermission(user.role.permissions, 'proposal.view_all')) {
      return {
        proposalWhere: {} satisfies Prisma.ProposalWhereInput,
        departmentWhere: { isActive: true } satisfies Prisma.DepartmentWhereInput,
      };
    }
    const departmentIds = Array.from(
      new Set(
        [
          ...user.departmentMemberships.map((item) => item.departmentId),
          user.departmentId,
        ].filter(Boolean) as string[],
      ),
    );
    const proposalWhere: Prisma.ProposalWhereInput = departmentIds.length
      ? { departmentId: { in: departmentIds } }
      : {
          OR: [
            { creatorId: userId },
            { approvalSteps: { some: { approverId: userId } } },
            { participants: { some: { userId } } },
          ],
        };
    return {
      proposalWhere,
      departmentWhere: {
        isActive: true,
        id: { in: departmentIds },
      } satisfies Prisma.DepartmentWhereInput,
    };
  }

  private getPeriodRange(query: PeriodQuery = {}) {
    const period: ReportPeriod =
      query.period === 'day'
        ? 'day'
        : query.period === 'week'
          ? 'week'
          : 'month';
    const now = new Date();

    if (period === 'day') {
      const start = query.date ? new Date(query.date) : new Date(now);
      if (Number.isNaN(start.getTime())) {
        start.setTime(now.getTime());
      }
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      return { period, start, end };
    }

    if (period === 'week') {
      const anchor = query.date ? new Date(query.date) : now;
      if (Number.isNaN(anchor.getTime())) {
        anchor.setTime(now.getTime());
      }

      const start = new Date(anchor);
      start.setHours(0, 0, 0, 0);
      const day = start.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diffToMonday);

      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return { period, start, end };
    }

    const monthMatch = query.date?.match(/^(\d{4})-(\d{2})$/);
    const parsed = query.date && !monthMatch ? new Date(query.date) : now;
    const year = monthMatch
      ? Number(monthMatch[1])
      : Number.isNaN(parsed.getTime())
        ? now.getFullYear()
        : parsed.getFullYear();
    const month = monthMatch
      ? Number(monthMatch[2]) - 1
      : Number.isNaN(parsed.getTime())
        ? now.getMonth()
        : parsed.getMonth();

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    return { period, start, end };
  }

  private createdInPeriod(query: PeriodQuery = {}) {
    const range = this.getPeriodRange(query);
    return {
      range,
      where: {
        createdAt: { gte: range.start, lt: range.end },
      } satisfies Prisma.ProposalWhereInput,
    };
  }

  async getDashboardSummary(
    userId: string,
    query: PeriodQuery = {},
  ): Promise<DashboardSummaryDto> {
    const { proposalWhere } = await this.getProposalAccess(userId);
    const { range, where: periodWhere } = this.createdInPeriod(query);
    const scopedPeriodWhere: Prisma.ProposalWhereInput = {
      AND: [proposalWhere, periodWhere],
    };

    const [
      totalProposals,
      pendingProposals,
      approvedProposals,
      paymentAgg,
      financeTypes,
    ] = await Promise.all([
      this.prisma.proposal.count({
        where: {
          AND: [scopedPeriodWhere],
          status: { notIn: [ProposalStatus.DRAFT, ProposalStatus.CANCELLED] },
        },
      }),
      this.prisma.proposal.count({
        where: { AND: [scopedPeriodWhere], status: ProposalStatus.PENDING },
      }),
      this.prisma.proposal.count({
        where: {
          AND: [scopedPeriodWhere],
          status: { in: APPROVED_STATUSES },
        },
      }),
      this.prisma.proposal.aggregate({
        where: {
          AND: [scopedPeriodWhere],
          status: { in: APPROVED_STATUSES },
          paymentAmount: { not: null },
        },
        _sum: { paymentAmount: true },
      }),
      this.prisma.proposalType.count({ where: { isActive: true } }),
    ]);

    return {
      revenue: Number(paymentAgg._sum.paymentAmount ?? 0),
      pendingInvoices: pendingProposals,
      monthlyExpenses: totalProposals,
      reportsGenerated: approvedProposals,
      totalProposals,
      activeProposalTypes: financeTypes,
      period: range.period,
      periodStart: range.start.toISOString(),
      periodEnd: range.end.toISOString(),
    };
  }

  async getRecentProposals(userId: string, query: PeriodQuery = {}) {
    const { proposalWhere } = await this.getProposalAccess(userId);
    const { where: periodWhere } = this.createdInPeriod(query);
    return this.prisma.proposal.findMany({
      where: {
        AND: [proposalWhere, periodWhere],
        status: {
          notIn: [ProposalStatus.DRAFT, ProposalStatus.CANCELLED],
        },
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        proposalType: true,
        creator: { select: { fullName: true } },
      },
    });
  }

  async getPendingApprovals(userId: string, query: PeriodQuery = {}) {
    if (!userId) return [];
    const { where: periodWhere } = this.createdInPeriod(query);
    const rows = await this.prisma.proposal.findMany({
      where: {
        ...periodWhere,
        status: ProposalStatus.PENDING,
        approvalSteps: {
          some: {
            approverId: userId,
            status: ApprovalStepStatus.PENDING,
          },
        },
      },
      include: {
        proposalType: true,
        creator: { select: { fullName: true } },
        approvalSteps: true,
      },
      take: 20,
    });
    return rows.filter((p) =>
      p.approvalSteps.some(
        (s) =>
          s.approverId === userId &&
          s.status === ApprovalStepStatus.PENDING &&
          s.stepOrder === p.currentStepOrder,
      ),
    );
  }

  async getReportDepartments(userId: string) {
    const { departmentWhere } = await this.getProposalAccess(userId);
    return this.prisma.department.findMany({
      where: departmentWhere,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async getDepartmentReport(
    userId: string,
    query: PeriodQuery & { departmentId?: string },
  ) {
    const { proposalWhere } = await this.getProposalAccess(userId);
    const { range, where: periodWhere } = this.createdInPeriod(query);
    const baseWhere: Prisma.ProposalWhereInput = {
      AND: [proposalWhere, periodWhere],
      status: { notIn: [ProposalStatus.DRAFT, ProposalStatus.CANCELLED] },
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    };

    const chartYear = range.start.getFullYear();
    const monthlyWhere: Prisma.ProposalWhereInput = {
      AND: [proposalWhere],
      status: ProposalStatus.PAID,
      paymentAmount: { not: null },
      createdAt: {
        gte: new Date(chartYear, 0, 1),
        lt: new Date(chartYear + 1, 0, 1),
      },
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    };

    const [
      totalProposals,
      pendingProposals,
      approvedProposals,
      pendingPaymentProposals,
      paidProposals,
      rejectedProposals,
      approvedAmount,
      paidAmount,
      proposals,
      monthlyPaidRows,
    ] = await Promise.all([
      this.prisma.proposal.count({ where: baseWhere }),
      this.prisma.proposal.count({
        where: { ...baseWhere, status: ProposalStatus.PENDING },
      }),
      this.prisma.proposal.count({
        where: { ...baseWhere, status: { in: APPROVED_STATUSES } },
      }),
      this.prisma.proposal.count({
        where: { ...baseWhere, status: ProposalStatus.PENDING_PAYMENT },
      }),
      this.prisma.proposal.count({
        where: { ...baseWhere, status: ProposalStatus.PAID },
      }),
      this.prisma.proposal.count({
        where: { ...baseWhere, status: ProposalStatus.REJECTED },
      }),
      this.prisma.proposal.aggregate({
        where: {
          ...baseWhere,
          status: { in: APPROVED_STATUSES },
          paymentAmount: { not: null },
        },
        _sum: { paymentAmount: true },
      }),
      this.prisma.proposal.aggregate({
        where: {
          ...baseWhere,
          status: ProposalStatus.PAID,
          paymentAmount: { not: null },
        },
        _sum: { paymentAmount: true },
      }),
      this.prisma.proposal.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          proposalType: { select: { name: true } },
          creator: { select: { fullName: true } },
          department: { select: { name: true } },
        },
      }),
      this.prisma.proposal.findMany({
        where: monthlyWhere,
        select: { createdAt: true, paymentAmount: true },
      }),
    ]);

    const monthlyPaid = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      amount: 0,
    }));
    for (const proposal of monthlyPaidRows) {
      const monthIndex = proposal.createdAt.getMonth();
      monthlyPaid[monthIndex].amount += Number(proposal.paymentAmount ?? 0);
    }

    return {
      period: range.period,
      periodStart: range.start.toISOString(),
      periodEnd: range.end.toISOString(),
      departmentId: query.departmentId || null,
      summary: {
        totalProposals,
        pendingProposals,
        approvedProposals,
        pendingPaymentProposals,
        paidProposals,
        rejectedProposals,
        totalApprovedAmount: Number(approvedAmount._sum.paymentAmount ?? 0),
        totalPaidAmount: Number(paidAmount._sum.paymentAmount ?? 0),
      },
      monthlyPaid,
      proposals: proposals.map((proposal) => ({
        id: proposal.id,
        code: proposal.code,
        title: proposal.title,
        status: proposal.status,
        createdAt: proposal.createdAt,
        paymentAmount: proposal.paymentAmount
          ? Number(proposal.paymentAmount)
          : null,
        proposalType: proposal.proposalType,
        creator: proposal.creator,
        department: proposal.department,
      })),
    };
  }
}
