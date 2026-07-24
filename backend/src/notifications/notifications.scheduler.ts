import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  ApprovalStepStatus,
  NotificationType,
  ParticipantRole,
  ProposalStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsScheduler implements OnModuleInit, OnModuleDestroy {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    // run every 10 minutes
    this.intervalId = setInterval(
      () => this.runChecks().catch(() => {}),
      10 * 60 * 1000,
    );
    // run once at startup
    this.runChecks().catch(() => {});
  }

  async onModuleDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async runChecks() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await this.runApprovalReminderChecks(cutoff);
    await this.runPaymentReminderChecks(cutoff);
  }

  private async runApprovalReminderChecks(cutoff: Date) {
    const rows = await this.prisma.proposal.findMany({
      where: {
        status: ProposalStatus.PENDING,
        createdAt: { lte: cutoff },
        OR: [
          { lastReminderSentAt: null },
          { lastReminderSentAt: { lte: cutoff } },
        ],
      },
      include: {
        approvalSteps: true,
        workflow: { include: { steps: true } },
      },
    });

    for (const proposal of rows) {
      const approverIds = this.getCurrentApproverIds(proposal);
      await Promise.all(
        approverIds.map((approverId) =>
          this.notifications.create(undefined, {
            userId: approverId,
            type: NotificationType.ACTION,
            title: 'Nhắc duyệt đề xuất',
            message: `Đề xuất "${proposal.title}" đang chờ duyệt hơn 24 giờ.`,
            link: `/proposals/${proposal.id}`,
            payload: { proposalId: proposal.id },
          }),
        ),
      );

      await this.prisma.proposal.update({
        where: { id: proposal.id },
        data: { lastReminderSentAt: new Date() },
      });
    }
  }

  private async runPaymentReminderChecks(cutoff: Date) {
    const rows = await this.prisma.proposal.findMany({
      where: {
        status: ProposalStatus.PENDING_PAYMENT,
        updatedAt: { lte: cutoff },
        OR: [
          { lastReminderSentAt: null },
          { lastReminderSentAt: { lte: cutoff } },
        ],
      },
      include: {
        participants: true,
      },
    });

    for (const proposal of rows) {
      const paymentUserIds = await this.getPaymentUserIds(proposal);
      await Promise.all(
        paymentUserIds.map((userId) =>
          this.notifications.create(undefined, {
            userId,
            type: NotificationType.TASK,
            title: 'Nhắc thanh toán đề xuất',
            message: `Đề xuất "${proposal.title}" đã được duyệt và đang chờ thanh toán.`,
            link: `/proposals/${proposal.id}`,
            payload: { proposalId: proposal.id },
          }),
        ),
      );

      await this.prisma.proposal.update({
        where: { id: proposal.id },
        data: { lastReminderSentAt: new Date() },
      });
    }
  }

  private getCurrentApproverIds(proposal: {
    approvalSteps: Array<{
      approverId: string;
      status: ApprovalStepStatus;
      stepOrder: number;
      isSeniorApprover: boolean;
    }>;
    workflow?: {
      isSequential: boolean;
      steps: Array<{ stepOrder: number; isSeniorApprover: boolean }>;
    } | null;
    currentStepOrder: number;
  }) {
    return Array.from(
      new Set(
        proposal.approvalSteps
          .filter((step) => step.status === ApprovalStepStatus.PENDING)
          .filter((step) =>
            !proposal.workflow?.isSequential
              ? true
              : step.stepOrder === proposal.currentStepOrder ||
                step.isSeniorApprover,
          )
          .map((step) => step.approverId)
          .filter(Boolean),
      ),
    );
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

  private isSeniorWorkflowStep(
    workflow:
      | { steps: { stepOrder: number; isSeniorApprover: boolean }[] }
      | null
      | undefined,
    stepOrder: number,
  ) {
    return (
      workflow?.steps.some(
        (step) => step.stepOrder === stepOrder && step.isSeniorApprover,
      ) ?? false
    );
  }
}
