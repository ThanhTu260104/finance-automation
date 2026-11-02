"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  FileText,
  Landmark,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  User,
  Wallet,
  XCircle,
  XOctagon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProposalStatusBadge } from "@/components/proposals/ProposalStatusBadge";
import {
  approveProposal,
  addProposalComment,
  cancelProposal,
  deleteProposal,
  getProposal,
  getProposalComments,
  markProposalPaid,
  rejectProposal,
  submitProposal,
  type Proposal,
  type ProposalComment,
} from "@/lib/api/proposals";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";
import { useAdminPageHeader } from "@/lib/context/AdminPageHeaderContext";
import { useUser } from "@/lib/context/UserContext";
import { ProposalFileReview } from "@/components/proposals/ProposalFileReview";
import { userAvatarFullUrl } from "@/lib/api/users";

const PARTICIPANT_LABELS: Record<string, string> = {
  WATCHER: "Theo dõi",
  NOTIFY: "Nhận thông báo",
  EXECUTOR: "Thực hiện",
};

const ACTION_MESSAGES: Record<
  string,
  { loading: string; success: string; error: string }
> = {
  approve: {
    loading: "Đang phê duyệt đề xuất...",
    success: "Đã phê duyệt đề xuất",
    error: "Không thể phê duyệt đề xuất",
  },
  reject: {
    loading: "Đang từ chối đề xuất...",
    success: "Đã từ chối đề xuất",
    error: "Không thể từ chối đề xuất",
  },
  submit: {
    loading: "Đang gửi đề xuất...",
    success: "Đã gửi đề xuất để duyệt",
    error: "Không thể gửi đề xuất",
  },
  "mark-paid": {
    loading: "Đang xác nhận thanh toán...",
    success: "Đã xác nhận đề xuất đã thanh toán",
    error: "Không thể xác nhận thanh toán",
  },
  cancel: {
    loading: "Đang hủy đề xuất...",
    success: "Đã hủy đề xuất",
    error: "Không thể hủy đề xuất",
  },
};

const APPROVAL_STEP_STATUS_LABELS: Record<string, string> = {
  PENDING: "Chưa duyệt",
  APPROVED: "Đã phê duyệt",
  REJECTED: "Đã từ chối",
  SKIPPED: "Bỏ qua",
};

// A small, self-contained info row: icon + label + value.
// Keeping this as a tiny component keeps the summary grid consistent
// and makes it trivial to add more fields later.
function InfoRow({
  icon: Icon,
  label,
  children,
  emphasis,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex gap-2.5 py-1">
      <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-md bg-slate-100 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p
          className={`mt-0.5 break-words text-base leading-snug ${
            emphasis ? "text-lg font-semibold text-primary-700" : "text-slate-800"
          }`}
        >
          {children}
        </p>
      </div>
    </div>
  );
}

export default function ProposalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useUser();
  const { setHeader, clearHeader } = useAdminPageHeader();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [reasonModal, setReasonModal] = useState<"reject" | "cancel" | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [comments, setComments] = useState<ProposalComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSending, setCommentSending] = useState(false);

  const reload = () =>
    getProposal(params.id).then(setProposal).finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, [params.id]);

  useEffect(() => {
    if (!proposal) return;
    const subtitle = `${proposal.code} · ${proposal.proposalType.name}${
      proposal.workflow?.name ? ` · ${proposal.workflow.name}` : ""
    }`;
    setHeader(proposal.title, subtitle);
    return () => clearHeader();
  }, [proposal, setHeader, clearHeader]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const nextProposal = await getProposal(params.id);
        if (!active) return;
        setProposal(nextProposal);
        getProposalComments(params.id)
          .then((rows) => {
            if (active) setComments(rows);
          })
          .catch(() => {});
      } catch {
        // Đề xuất có thể vừa bị xóa hoặc tài khoản không còn quyền xem.
      }
    };
    window.addEventListener("finance:proposal-change", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("finance:proposal-change", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [params.id]);

  useEffect(() => {
    if (!proposal || !currentUser) return;
    const allowed =
      proposal.creator.id === currentUser.id ||
      proposal.approvalSteps.some((step) => step.approver.id === currentUser.id) ||
      proposal.participants.some((participant) => participant.user.id === currentUser.id);
    if (!allowed) return;
    setCommentsLoading(true);
    getProposalComments(proposal.id)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [proposal?.id, currentUser?.id]);

  if (loading || !proposal) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-slate-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-primary-600" />
        Đang tải đề xuất...
      </div>
    );
  }

  const canApprove = proposal.approvalSteps.some(
    (s) =>
      s.approver.id === currentUser?.id &&
      s.status === "PENDING" &&
      (s.stepOrder === proposal.currentStepOrder ||
        s.isSeniorApprover),
  );

  const isCreator = proposal.creator.id === currentUser?.id;
  const canEdit = isCreator && ["DRAFT", "PENDING"].includes(proposal.status);
  const isPaymentExecutor = proposal.participants.some(
    (participant) =>
      participant.role === "EXECUTOR" && participant.user.id === currentUser?.id,
  );
  const canComment =
    proposal.creator.id === currentUser?.id ||
    proposal.approvalSteps.some((step) => step.approver.id === currentUser?.id) ||
    proposal.participants.some((participant) => participant.user.id === currentUser?.id);

  const sendComment = async () => {
    const content = commentText.trim();
    if (!content || commentSending) return;
    setCommentSending(true);
    try {
      const created = await addProposalComment(proposal.id, content);
      setComments((current) => [...current, created]);
      setCommentText("");
      toast.success("Đã gửi ý kiến và thông báo cho người liên quan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể gửi ý kiến");
    } finally {
      setCommentSending(false);
    }
  };
  // Kế toán chỉ được xác nhận thanh toán khi người duyệt cấp cao đã duyệt.
  const seniorSteps = proposal.approvalSteps.filter((s) => s.isSeniorApprover);
  const seniorApproved =
    seniorSteps.length === 0 ||
    seniorSteps.some((s) => s.status === "APPROVED");
  const canMarkPaid =
    ["PENDING_PAYMENT", "APPROVED"].includes(proposal.status) &&
    seniorApproved &&
    isPaymentExecutor;
  const hasPaymentInfo =
    Boolean(proposal.paymentAmount) ||
    Boolean(proposal.paymentContent) ||
    Boolean(proposal.cashRecipient) ||
    Boolean(proposal.accountHolder) ||
    Boolean(proposal.bankName) ||
    Boolean(proposal.accountNumber);
  const shouldShowPaymentSection =
    hasPaymentInfo ||
    ["PENDING_PAYMENT", "APPROVED", "PAID"].includes(proposal.status);

  const totalSteps = proposal.approvalSteps.length;
  const doneSteps = proposal.approvalSteps.filter(
    (s) => s.status === "APPROVED",
  ).length;

  const runAction = async (key: string, fn: () => Promise<Proposal>) => {
    const messages = ACTION_MESSAGES[key] ?? {
      loading: "Đang xử lý...",
      success: "Đã cập nhật đề xuất",
      error: "Không thể cập nhật đề xuất",
    };
    setActionPending(key);
    const toastId = toast.loading(messages.loading);
    try {
      const updated = await fn();
      setProposal(updated);
      toast.success(messages.success, { id: toastId });
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : messages.error, {
        id: toastId,
      });
      return false;
    } finally {
      setActionPending(null);
    }
  };

  const openReasonModal = (type: "reject" | "cancel") => {
    setReasonModal(type);
    setReasonText(type === "reject" ? comment : "");
    setReasonError(null);
  };

  const submitReasonAction = async () => {
    if (!reasonModal || !proposal) return;
    const reason = reasonText.trim();
    if (!reason) {
      setReasonError(
        reasonModal === "reject"
          ? "Vui lòng nhập lý do từ chối"
          : "Vui lòng nhập lý do hủy đề xuất",
      );
      return;
    }

    const success = await runAction(reasonModal, () =>
      reasonModal === "reject"
        ? rejectProposal(proposal.id, reason)
        : cancelProposal(proposal.id, reason),
    );

    if (success) {
      setReasonModal(null);
      setReasonText("");
      setReasonError(null);
      setComment("");
    }
  };

  return (
    <div className="max-w-full space-y-4 overflow-hidden">
      <Link
        href="/proposals"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Danh sách đề xuất
      </Link>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <ProposalStatusBadge status={proposal.status} className="text-sm" />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3 lg:gap-5">
        <div className="min-w-0 space-y-4 lg:order-1 lg:col-span-2">
          {(proposal.attachments?.length ?? 0) > 0 && (
            <ProposalFileReview attachments={proposal.attachments} />
          )}

          {shouldShowPaymentSection && (
            <Card padding="sm">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Thông tin thanh toán</h3>

              {proposal.status === "PAID" && (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">Đã thanh toán</p>
                    {proposal.paidAt && (
                      <p className="mt-0.5 text-emerald-700">{formatDateTime(proposal.paidAt)}</p>
                    )}
                  </div>
                </div>
              )}

              {["PENDING_PAYMENT", "APPROVED"].includes(proposal.status) && (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2 text-sky-800">
                  <Clock className="mt-0.5 h-4 w-4 flex-none text-sky-600" />
                  <p className="text-sm font-medium text-sky-800">Chờ xác nhận thanh toán</p>
                </div>
              )}

              <dl className="divide-y divide-border">
                <InfoRow icon={Wallet} label="Số tiền" emphasis>
                  {proposal.paymentAmount
                    ? formatCurrency(Number(proposal.paymentAmount))
                    : "—"}
                </InfoRow>
                <InfoRow icon={FileText} label="Nội dung thanh toán">
                  {proposal.paymentContent ?? "—"}
                </InfoRow>
                <InfoRow icon={CreditCard} label="Phương thức thanh toán">
                  {proposal.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"}
                </InfoRow>
                {proposal.paymentMethod === "CASH" ? (
                  <InfoRow icon={User} label="Nơi / người nhận tiền">
                    {proposal.cashRecipient || "—"}
                  </InfoRow>
                ) : (
                  <>
                    <InfoRow icon={User} label="Chủ tài khoản">
                      {proposal.accountHolder ?? "—"}
                    </InfoRow>
                    <InfoRow icon={Landmark} label="Ngân hàng">
                      {proposal.bankName ?? "—"}
                    </InfoRow>
                    <InfoRow icon={CreditCard} label="Số tài khoản">
                      {proposal.accountNumber ?? "—"}
                    </InfoRow>
                  </>
                )}
              </dl>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-2 border-t border-border pt-3 min-[390px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center [&>*]:min-w-0 [&>*]:justify-center">
            {canApprove && (
              <>
                <button
                  type="button"
                  disabled={actionPending !== null}
                  onClick={() =>
                    runAction("approve", () =>
                      approveProposal(proposal.id, comment || undefined),
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-success px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Phê duyệt
                </button>
                <button
                  type="button"
                  disabled={actionPending !== null}
                  onClick={() => openReasonModal("reject")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  Từ chối
                </button>
              </>
            )}

            {isCreator && proposal.status === "DRAFT" && (
              <button
                type="button"
                disabled={actionPending !== null}
                onClick={() =>
                  runAction("submit", () => submitProposal(proposal.id))
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Gửi duyệt
              </button>
            )}

            {canMarkPaid && (
              <button
                type="button"
                disabled={actionPending !== null}
                onClick={() =>
                  runAction("mark-paid", () => markProposalPaid(proposal.id))
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <CreditCard className="h-4 w-4" />
                Xác nhận thanh toán
              </button>
            )}

            {canEdit && (
              <Link
                href={`/proposals/${proposal.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Chỉnh sửa
              </Link>
            )}

            {isCreator && ["DRAFT", "PENDING"].includes(proposal.status) && (
              <button
                type="button"
                disabled={actionPending !== null}
                onClick={() => openReasonModal("cancel")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                <XOctagon className="h-4 w-4" />
                Hủy đề xuất
              </button>
            )}

            {isCreator && proposal.status === "DRAFT" && (
              <button
                type="button"
                disabled={actionPending !== null}
                onClick={async () => {
                  if (!confirm("Xóa đề xuất nháp?")) return;
                  setActionPending("delete");
                  const toastId = toast.loading("Đang xóa nháp đề xuất...");
                  try {
                    await deleteProposal(proposal.id);
                    toast.success("Đã xóa nháp đề xuất", { id: toastId });
                    router.push("/proposals");
                  } catch (err) {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Không thể xóa nháp đề xuất",
                      { id: toastId },
                    );
                  } finally {
                    setActionPending(null);
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-danger/30 px-3 py-2 text-sm text-danger hover:bg-danger-light disabled:opacity-60 sm:ml-auto sm:px-4"
              >
                <Trash2 className="h-4 w-4" />
                Xóa nháp
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-3 lg:order-2 lg:col-span-1 lg:sticky lg:top-24 lg:self-start">
        <Card padding="sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Quy trình phê duyệt</h3>
            {totalSteps > 0 && (
              <span className="text-sm font-medium text-slate-400">
                {doneSteps}/{totalSteps} bước
              </span>
            )}
          </div>

          {totalSteps > 0 && (
            <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${(doneSteps / totalSteps) * 100}%` }}
              />
            </div>
          )}

          <ol className="relative">
            {totalSteps === 0 ? (
              <p className="text-base text-slate-500">Chưa gửi duyệt</p>
            ) : (
              proposal.approvalSteps.map((step, idx) => {
                const isCurrent =
                  step.status === "PENDING" &&
                  (step.stepOrder === proposal.currentStepOrder ||
                    step.isSeniorApprover);
                const senior = step.isSeniorApprover;
                const isLast = idx === proposal.approvalSteps.length - 1;

                const StatusIcon =
                  step.status === "APPROVED"
                    ? CheckCircle2
                    : step.status === "REJECTED"
                      ? XCircle
                      : isCurrent
                        ? Clock
                        : Circle;

                const iconColor =
                  step.status === "APPROVED"
                    ? "text-success"
                    : step.status === "REJECTED"
                      ? "text-danger"
                      : isCurrent
                        ? "text-primary-600"
                        : "text-slate-300";

                return (
                  <li key={step.id} className="relative flex gap-2 pb-3 last:pb-0">
                    {!isLast && (
                      <span
                        className="absolute left-[9px] top-5 h-full w-px bg-border"
                        aria-hidden
                      />
                    )}
                    <StatusIcon
                      className={`z-10 mt-0.5 h-[18px] w-[18px] flex-none bg-white ${iconColor}`}
                    />
                    <div
                      className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 ${
                        isCurrent
                          ? "border border-primary-200 bg-primary-50"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ApproverAvatar
                          name={step.approver.fullName}
                          avatarUrl={step.approver.avatarUrl}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-medium text-slate-800">
                            Bước {step.stepOrder} · {step.approver.fullName}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1">
                            <span className="text-sm text-slate-600">
                              {APPROVAL_STEP_STATUS_LABELS[step.status] ?? step.status}
                            </span>
                            {senior && (
                              <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                                Duyệt cấp cao
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {step.comment && (
                        <p className="mt-1 break-words rounded-md bg-slate-50 px-2 py-1 text-sm text-slate-600">
                          {step.comment}
                        </p>
                      )}
                      {step.actedAt && (
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDateTime(step.actedAt)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ol>

          {proposal.participants.length > 0 && (
            <div className="mt-3 border-t border-border pt-3 text-base leading-relaxed text-slate-800">
              <p className="mb-1 text-sm font-semibold text-slate-700">Người liên quan</p>
              <p className="text-slate-700">
                {proposal.participants.map((p, index) => (
                  <span key={`${p.role}-${p.user.id}`}>
                    {index > 0 ? "; " : ""}
                    {p.user.fullName} ({PARTICIPANT_LABELS[p.role] ?? p.role})
                  </span>
                ))}
              </p>
            </div>
          )}
        </Card>

          <Card padding="sm">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Thông tin chung</h3>
            <dl className="divide-y divide-border">
              <InfoRow icon={User} label="Người đề xuất">
                {proposal.creator.fullName}
              </InfoRow>
              <InfoRow icon={Building2} label="Phòng ban">
                {proposal.department?.name ?? "—"}
              </InfoRow>
              {proposal.projectName ? (
                <InfoRow icon={FileText} label="Dự án">
                  {proposal.projectName}
                </InfoRow>
              ) : null}
              <InfoRow icon={Calendar} label="Ngày tạo">
                {formatDateTime(proposal.createdAt)}
              </InfoRow>
              <InfoRow icon={CalendarClock} label="Hạn mong muốn">
                {proposal.desiredDeadline ? formatDate(proposal.desiredDeadline) : "—"}
              </InfoRow>
              <InfoRow icon={CalendarClock} label="Hạn theo quy định">
                {proposal.regulationDeadline
                  ? formatDate(proposal.regulationDeadline)
                  : "—"}
              </InfoRow>
            </dl>

            {proposal.content && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-sm font-medium text-slate-500">Nội dung mô tả</p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-base leading-relaxed text-slate-700">
                  {proposal.content}
                </p>
              </div>
            )}

            {proposal.status === "CANCELLED" && proposal.cancellationReason && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-sm font-medium text-slate-500">Lý do hủy đề xuất</p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg border border-rose-100 bg-rose-50 p-2.5 text-base text-rose-700">
                  {proposal.cancellationReason}
                </p>
              </div>
            )}
          </Card>

          {canApprove && (
            <Card padding="sm" className="border-primary-200 bg-primary-50/40">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Ghi chú duyệt</span>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-base"
                  placeholder="Thêm ý kiến khi phê duyệt (không bắt buộc)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
            </Card>
          )}

        {canComment && (
          <Card padding="sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <MessageSquare className="h-4 w-4 text-primary-600" />
                Ý kiến trao đổi
              </h3>
              {comments.length > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-500">
                  {comments.length}
                </span>
              )}
            </div>

            <div className="max-h-56 space-y-2 overflow-y-auto">
              {commentsLoading ? (
                <div className="py-4 text-center text-base text-slate-400">Đang tải...</div>
              ) : comments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-2 py-4 text-center text-base text-slate-400">
                  Chưa có ý kiến
                </div>
              ) : (
                comments.map((item) => {
                  const mine = item.author.id === currentUser?.id;
                  return (
                    <div key={item.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                      <ApproverAvatar
                        name={item.author.fullName}
                        avatarUrl={item.author.avatarUrl}
                        size="sm"
                      />
                      <div className={`min-w-0 max-w-[88%] ${mine ? "text-right" : ""}`}>
                        <div
                          className={`break-words rounded-xl px-2.5 py-1.5 text-left text-base leading-snug ${
                            mine
                              ? "rounded-tr-sm bg-primary-600 text-white"
                              : "rounded-tl-sm bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.content}
                        </div>
                        <p className="mt-0.5 px-1 text-sm text-slate-400">
                          {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <textarea
                rows={2}
                maxLength={2000}
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendComment();
                  }
                }}
                placeholder="Nhập ý kiến..."
                className="w-full resize-none rounded-lg border border-border px-3 py-2 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <button
                type="button"
                disabled={!commentText.trim() || commentSending}
                onClick={sendComment}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-base font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {commentSending ? "Đang gửi..." : "Gửi ý kiến"}
              </button>
            </div>
          </Card>
        )}
        </div>
      </div>

      {reasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-2 sm:px-4">
          <div className="max-h-[94vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-800">
                {reasonModal === "reject"
                  ? "Nhập lý do từ chối"
                  : "Nhập lý do hủy đề xuất"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Lý do này sẽ được lưu lại để người liên quan tra cứu sau này.
              </p>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Lý do <span className="text-danger">*</span>
              </span>
              <textarea
                rows={4}
                value={reasonText}
                onChange={(event) => {
                  setReasonText(event.target.value);
                  setReasonError(null);
                }}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                placeholder={
                  reasonModal === "reject"
                    ? "Ví dụ: Thiếu chứng từ, cần bổ sung hóa đơn..."
                    : "Ví dụ: Người tạo hủy do nhập sai thông tin..."
                }
              />
            </label>

            {reasonError && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {reasonError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={actionPending !== null}
                onClick={() => {
                  setReasonModal(null);
                  setReasonText("");
                  setReasonError(null);
                }}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={actionPending !== null}
                onClick={submitReasonAction}
                className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {actionPending === reasonModal && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                )}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApproverAvatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
}) {
  const fullUrl = userAvatarFullUrl(avatarUrl);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";
  const dim = size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";

  return fullUrl ? (
    <img
      src={fullUrl}
      alt={`Ảnh ${name}`}
      className={`${dim} shrink-0 rounded-full border border-slate-200 object-cover`}
    />
  ) : (
    <span
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700`}
    >
      {initials}
    </span>
  );
}
