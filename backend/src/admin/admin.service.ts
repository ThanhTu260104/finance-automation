import { Injectable } from '@nestjs/common';
import { ApprovalStepStatus, Prisma, ProposalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

type ReportPeriod = 'week' | 'month';

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

  private getPeriodRange(query: PeriodQuery = {}) {
    const period: ReportPeriod = query.period === 'week' ? 'week' : 'month';
    const now = new Date();

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

  async getDashboardSummary(query: PeriodQuery = {}): Promise<DashboardSummaryDto> {
    const { range, where: periodWhere } = this.createdInPeriod(query);

    const [
      totalProposals,
      pendingProposals,
      approvedProposals,
      paymentAgg,
      financeTypes,
    ] = await Promise.all([
      this.prisma.proposal.count({
        where: {
          ...periodWhere,
          status: { notIn: [ProposalStatus.DRAFT, ProposalStatus.CANCELLED] },
        },
      }),
      this.prisma.proposal.count({
        where: { ...periodWhere, status: ProposalStatus.PENDING },
      }),
      this.prisma.proposal.count({
        where: {
          ...periodWhere,
          status: { in: APPROVED_STATUSES },
        },
      }),
      this.prisma.proposal.aggregate({
        where: {
          ...periodWhere,
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

  async getRecentProposals(query: PeriodQuery = {}) {
    const { where: periodWhere } = this.createdInPeriod(query);
    return this.prisma.proposal.findMany({
      where: {
        ...periodWhere,
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

  async getReportDepartments() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async getDepartmentReport(query: PeriodQuery & { departmentId?: string }) {
    const { range, where: periodWhere } = this.createdInPeriod(query);
    const baseWhere: Prisma.ProposalWhereInput = {
      ...periodWhere,
      status: { notIn: [ProposalStatus.DRAFT, ProposalStatus.CANCELLED] },
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    };

    const chartYear = range.start.getFullYear();
    const monthlyWhere: Prisma.ProposalWhereInput = {
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
