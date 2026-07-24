import { Injectable } from '@nestjs/common';
import {
  ApprovalStepStatus,
  NotificationType,
  ParticipantRole,
  ProposalStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserContextService } from '../common/user-context.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsStreamService } from './notifications-stream.service';
import { WebPushService } from './web-push.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContextService,
    private readonly notificationStream: NotificationsStreamService,
    private readonly webPush: WebPushService,
  ) {}

  async create(rawUserId: string | undefined, dto: CreateNotificationDto) {
    const actorId = rawUserId ? this.userContext.requireUserId(rawUserId) : undefined;
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId ?? null,
        type: dto.type as any,
        title: dto.title,
        message: dto.message,
        payload: dto.payload,
        link: dto.link,
      },
    });
    if (notification.userId) {
      this.notificationStream.publish(notification.userId, notification);
      await this.webPush.send(notification.userId, notification);
    }
    return notification;
  }

  async findAll(rawUserId: string, unreadOnly?: boolean, type?: string) {
    const userId = this.userContext.requireUserId(rawUserId);
    const where: any = { userId };
    if (unreadOnly) where.isRead = false;
    if (type) where.type = type as any;
    const rows = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return this.filterStaleProposalNotifications(userId, rows);
  }

  async markRead(rawUserId: string, id: string) {
    const userId = this.userContext.requireUserId(rawUserId);
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    this.notificationStream.refresh(userId);
    return result;
  }

  async markProposalNotificationsRead(
    proposalId: string,
    types?: NotificationType[],
    userIds?: string[],
  ) {
    const where: any = {
      isRead: false,
      payload: { path: ['proposalId'], equals: proposalId },
    };
    if (types?.length) where.type = { in: types };
    if (userIds?.length) where.userId = { in: userIds };

    return this.prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });
  }

  async markAllRead(rawUserId: string) {
    const userId = this.userContext.requireUserId(rawUserId);
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    this.notificationStream.refresh(userId);
    return result;
  }

  private async filterStaleProposalNotifications<
    T extends { id: string; type: NotificationType; payload: unknown },
  >(userId: string, rows: T[]) {
    const proposalIds = Array.from(
      new Set(
        rows
          .map((row) => this.getProposalId(row.payload))
          .filter((id): id is string => Boolean(id)),
      ),
    );
    if (!proposalIds.length) return rows;

    const proposals = await this.prisma.proposal.findMany({
      where: { id: { in: proposalIds } },
      select: {
        id: true,
        status: true,
        currentStepOrder: true,
        workflow: {
          select: {
            isSequential: true,
            steps: { select: { stepOrder: true, isSeniorApprover: true } },
          },
        },
        approvalSteps: {
          select: {
            approverId: true,
            stepOrder: true,
            status: true,
            isSeniorApprover: true,
          },
        },
        participants: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });

    const proposalById = new Map(proposals.map((p) => [p.id, p]));
    const staleIds: string[] = [];

    const filtered = rows.filter((row) => {
      if (
        row.type !== NotificationType.ACTION &&
        row.type !== NotificationType.TASK
      ) {
        return true;
      }

      const proposalId = this.getProposalId(row.payload);
      if (!proposalId) return true;

      const proposal = proposalById.get(proposalId);
      if (!proposal) {
        staleIds.push(row.id);
        return false;
      }

      if (row.type === NotificationType.ACTION) {
        const shouldShow =
          proposal.status === ProposalStatus.PENDING &&
          proposal.approvalSteps.some(
            (step) =>
              step.approverId === userId &&
              step.status === ApprovalStepStatus.PENDING &&
              (!proposal.workflow?.isSequential ||
                step.stepOrder === proposal.currentStepOrder ||
                step.isSeniorApprover),
          );
        if (!shouldShow) staleIds.push(row.id);
        return shouldShow;
      }

      const shouldShow =
        (proposal.status === ProposalStatus.PENDING_PAYMENT ||
          proposal.status === ProposalStatus.APPROVED) &&
        proposal.participants.some(
          (participant) =>
            participant.userId === userId &&
            participant.role === ParticipantRole.EXECUTOR,
        );
      if (!shouldShow) staleIds.push(row.id);
      return shouldShow;
    });

    if (staleIds.length) {
      this.prisma.notification
        .updateMany({
          where: { id: { in: staleIds }, userId },
          data: { isRead: true },
        })
        .catch(() => {});
    }

    return filtered;
  }

  private getProposalId(payload: unknown) {
    if (!payload || typeof payload !== 'object') return undefined;
    const value = (payload as { proposalId?: unknown }).proposalId;
    return typeof value === 'string' ? value : undefined;
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
