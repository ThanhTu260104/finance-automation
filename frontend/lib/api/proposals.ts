import api from "@/lib/api/client";
import type { ProposalAttachment } from "@/lib/api/attachments";

export type ProposalStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "PENDING_PAYMENT"
  | "PAID"
  | "REJECTED"
  | "CANCELLED";

export type ProposalView =
  | "all"
  | "draft"
  | "cancelled"
  | "mine"
  | "approve"
  | "watch"
  | "notify"
  | "execute";

export type Proposal = {
  id: string;
  code: string;
  title: string;
  status: ProposalStatus;
  proposalTypeId: string;
  proposalType: { id: string; name: string; group: string };
  department?: { id: string; name: string } | null;
  creator: { id: string; fullName: string; email: string };
  projectName?: string | null;
  content?: string | null;
  paymentAmount?: number | null;
  paymentContent?: string | null;
  paymentMethod?: "CASH" | "BANK_TRANSFER";
  cashRecipient?: string | null;
  cancellationReason?: string | null;
  accountHolder?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  contractRef?: string | null;
  invoiceRef?: string | null;
  desiredDeadline?: string | null;
  regulationDeadline?: string | null;
  currentStepOrder: number;
  participants: Array<{
    role: string;
    user: { id: string; fullName: string; email: string };
  }>;
  approvalSteps: Array<{
    id: string;
    stepOrder: number;
    status: string;
    comment?: string | null;
    actedAt?: string | null;
    approver: { id: string; fullName: string; email: string };
  }>;
  attachments?: ProposalAttachment[];
  workflow?: {
    id: string;
    name: string;
    isSequential?: boolean;
    steps: Array<{
      stepOrder: number;
      label?: string | null;
      isSeniorApprover?: boolean;
      approver: { id: string; fullName: string };
    }>;
  } | null;
  createdAt: string;
  paidAt?: string | null;
  updatedAt: string;
};

export type ProposalStats = {
  mine: number;
  pending: number;
  approved: number;
  pendingPayment: number;
  paid: number;
  rejected: number;
  needApproval: number;
};

export type CreateProposalPayload = {
  proposalTypeId: string;
  title: string;
  departmentId?: string;
  projectName?: string;
  content?: string;
  paymentAmount?: number;
  paymentContent?: string;
  paymentMethod?: "CASH" | "BANK_TRANSFER";
  cashRecipient?: string;
  accountHolder?: string;
  bankName?: string;
  accountNumber?: string;
  contractRef?: string;
  invoiceRef?: string;
  desiredDeadline?: string;
  regulationDeadline?: string;
  watcherIds?: string[];
  notifyIds?: string[];
  executorIds?: string[];
  saveAsDraft?: boolean;
};

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  DRAFT: "Nháp",
  PENDING: "Đang chờ duyệt",
  APPROVED: "Đã phê duyệt",
  PENDING_PAYMENT: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
};

export const PROPOSAL_VIEW_TABS: { id: ProposalView; label: string }[] = [
  { id: "all", label: "Tất cả đề xuất" },
  
  { id: "mine", label: "Tôi đề xuất" },
  { id: "approve", label: "Tôi phê duyệt" },
  { id: "watch", label: "Tôi theo dõi" },
  { id: "notify", label: "Tôi nhận thông báo" },
  { id: "execute", label: "Tôi thực hiện" },
  { id: "draft", label: "Nháp" },
  { id: "cancelled", label: "Đã hủy" }
];

export async function getProposalStats(): Promise<ProposalStats> {
  const { data } = await api.get<ProposalStats>("/proposals/stats");
  return data;
}

export async function getProposals(params?: {
  page?: number;
  limit?: number;
  view?: ProposalView;
  status?: ProposalStatus;
  proposalTypeId?: string;
  departmentId?: string;
  creatorId?: string;
  executorId?: string;
  projectName?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
}): Promise<Proposal[]> {
  const { data } = await api.get<Proposal[]>("/proposals", { params });
  return data;
}

export async function getProposalProjects(): Promise<string[]> {
  const { data } = await api.get<string[]>("/proposals/projects");
  return data;
}

export async function getProposal(id: string): Promise<Proposal> {
  const { data } = await api.get<Proposal>(`/proposals/${id}`);
  return data;
}

export async function createProposal(
  payload: CreateProposalPayload,
): Promise<Proposal> {
  const { data } = await api.post<Proposal>("/proposals", payload);
  return data;
}

export async function updateProposal(
  id: string,
  payload: Partial<CreateProposalPayload>,
): Promise<Proposal> {
  const { data } = await api.patch<Proposal>(`/proposals/${id}`, payload);
  return data;
}

export async function duplicateProposal(id: string): Promise<Proposal> {
  const { data } = await api.post<Proposal>(`/proposals/${id}/duplicate`);
  return data;
}

export async function deleteProposal(id: string): Promise<void> {
  await api.delete(`/proposals/${id}`);
}

export async function cancelProposal(
  id: string,
  reason: string,
): Promise<Proposal> {
  const { data } = await api.post<Proposal>(`/proposals/${id}/cancel`, {
    reason,
  });
  return data;
}

export async function submitProposal(id: string): Promise<Proposal> {
  const { data } = await api.post<Proposal>(`/proposals/${id}/submit`);
  return data;
}

export async function approveProposal(
  id: string,
  comment?: string,
): Promise<Proposal> {
  const { data } = await api.post<Proposal>(`/proposals/${id}/approve`, {
    comment,
  });
  return data;
}

export async function rejectProposal(
  id: string,
  comment: string,
): Promise<Proposal> {
  const { data } = await api.post<Proposal>(`/proposals/${id}/reject`, {
    comment,
  });
  return data;
}

export async function markProposalPaid(id: string): Promise<Proposal> {
  const { data } = await api.post<Proposal>(`/proposals/${id}/mark-paid`);
  return data;
}
