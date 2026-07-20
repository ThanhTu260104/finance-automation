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
  Copy,
  CreditCard,
  FileText,
  FolderKanban,
  Landmark,
  Pencil,
  Send,
  Trash2,
  User,
  Wallet,
  XCircle,
  XOctagon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProposalStatusBadge } from "@/components/proposals/ProposalStatusBadge";
import {
  approveProposal,
  cancelProposal,
  deleteProposal,
  duplicateProposal,
  getProposal,
  markProposalPaid,
  rejectProposal,
  submitProposal,
  type Proposal,
} from "@/lib/api/proposals";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";
import { useUser } from "@/lib/context/UserContext";
import { ProposalFileReview } from "@/components/proposals/ProposalFileReview";

const PARTICIPANT_LABELS: Record<string, string> = {
  WATCHER: "Theo dõi",
  NOTIFY: "Nhận thông báo",
  EXECUTOR: "Thực hiện",
};

const PARTICIPANT_DOT: Record<string, string> = {
  WATCHER: "bg-slate-400",
  NOTIFY: "bg-sky-500",
  EXECUTOR: "bg-primary-600",
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

function isSeniorWorkflowStep(proposal: Proposal, stepOrder: number) {
  return (
    proposal.workflow?.steps.some(
      (s) => s.stepOrder === stepOrder && s.isSeniorApprover,
    ) ?? false
  );
}

// A small, self-contained info row: icon + label + value.
// Keeping this as a tiny component keeps the summary grid consistent
// and makes it trivial to add more fields later.
function InfoRow({
  icon: Icon,
  label,
  children,
  emphasis,
  span2,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  emphasis?: boolean;
  span2?: boolean;
}) {
  return (
    <div className={`flex gap-3 ${span2 ? "sm:col-span-2" : ""}`}>
      <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p
          className={`mt-0.5 break-words text-sm ${
            emphasis ? "text-base font-semibold text-primary-700" : "text-slate-800"
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
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [reasonModal, setReasonModal] = useState<"reject" | "cancel" | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const reload = () =>
    getProposal(params.id).then(setProposal).finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, [params.id]);

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
        isSeniorWorkflowStep(proposal, s.stepOrder)),
  );

  const isCreator = proposal.creator.id === currentUser?.id;
  const canEdit = isCreator && ["DRAFT", "PENDING"].includes(proposal.status);
  const isPaymentExecutor = proposal.participants.some(
    (participant) =>
      participant.role === "EXECUTOR" && participant.user.id === currentUser?.id,
  );
  const canMarkPaid =
    ["PENDING_PAYMENT", "APPROVED"].includes(proposal.status) &&
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
    <div className="space-y-4">
      <Link
        href="/proposals"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Danh sách đề xuất
      </Link>

      <PageHeader
        title={proposal.title}
        description={`${proposal.code} · ${proposal.proposalType.name}${
          proposal.workflow?.name ? ` · ${proposal.workflow.name}` : ""
        }`}
        action={<ProposalStatusBadge status={proposal.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* General information */}
          <Card>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Thông tin chung
            </h3>
            <dl className="grid gap-5 sm:grid-cols-2">
              <InfoRow icon={User} label="Người đề xuất">
                {proposal.creator.fullName}
              </InfoRow>
              <InfoRow icon={Building2} label="Phòng ban">
                {proposal.department?.name ?? "—"}
              </InfoRow>
              <InfoRow icon={FolderKanban} label="Dự án">
                {proposal.projectName ?? "—"}
              </InfoRow>
              <InfoRow icon={Calendar} label="Ngày tạo">
                {formatDateTime(proposal.createdAt)}
              </InfoRow>
              <InfoRow icon={CalendarClock} label="Hạn mong muốn">
                {proposal.desiredDeadline
                  ? formatDate(proposal.desiredDeadline)
                  : "—"}
              </InfoRow>
              <InfoRow icon={CalendarClock} label="Hạn theo quy định">
                {proposal.regulationDeadline
                  ? formatDate(proposal.regulationDeadline)
                  : "—"}
              </InfoRow>
            </dl>

            {proposal.content && (
              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  Nội dung mô tả
                </p>
                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                  {proposal.content}
                </p>
              </div>
            )}

            {proposal.status === "CANCELLED" && proposal.cancellationReason && (
              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  Lý do hủy đề xuất
                </p>
                <p className="whitespace-pre-wrap rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm leading-relaxed text-rose-700">
                  {proposal.cancellationReason}
                </p>
              </div>
            )}
          </Card>

          {/* Payment information — only shown when relevant so the page
              doesn't pad out every proposal with empty bank fields */}
          {shouldShowPaymentSection && (
            <Card>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Thông tin thanh toán
              </h3>

              {proposal.status === "PAID" && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Đã thanh toán</p>
                    <p className="mt-0.5 text-sm text-emerald-700">
                      Kế toán đã xác nhận hoàn tất thanh toán cho đề xuất này.
                    </p>
                    {proposal.paidAt && (
                      <p className="mt-1.5 text-sm font-medium text-emerald-800">
                        Thời gian thực hiện thanh toán: {formatDateTime(proposal.paidAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {["PENDING_PAYMENT", "APPROVED"].includes(proposal.status) && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-800">
                  <Clock className="mt-0.5 h-5 w-5 flex-none text-sky-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Chờ thanh toán</p>
                    <p className="mt-0.5 text-sm text-sky-700">
                      Đề xuất đã được duyệt và đang chờ kế toán xác nhận thanh toán.
                    </p>
                  </div>
                </div>
              )}

              {/* Nhóm 1: số tiền + nội dung thanh toán — 2 cột đều nhau */}
              <dl className="grid gap-5 sm:grid-cols-3">
                <InfoRow icon={Wallet} label="Số tiền" emphasis>
                  {proposal.paymentAmount
                    ? formatCurrency(Number(proposal.paymentAmount))
                    : "—"}
                </InfoRow>
                <InfoRow icon={FileText} label="Nội dung thanh toán">
                  {proposal.paymentContent ?? "—"}
                </InfoRow>
                <InfoRow icon={CreditCard} label="Phương thức">
                  {proposal.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"}
                </InfoRow>
              </dl>

              {/* Nhóm 2: thông tin tài khoản nhận — 3 cột đều nhau,
                  tách riêng bằng đường kẻ để nhóm ý nghĩa rõ ràng */}
              {proposal.paymentMethod === "CASH" ? (
              <dl className="mt-5 border-t border-border pt-5">
                <InfoRow icon={User} label="Nơi/người nhận tiền">
                  {proposal.cashRecipient || "—"}
                </InfoRow>
              </dl>
              ) : (
              <dl className="mt-5 grid gap-5 border-t border-border pt-5 sm:grid-cols-3">
                <InfoRow icon={User} label="Chủ tài khoản">
                  {proposal.accountHolder ?? "—"}
                </InfoRow>
                <InfoRow icon={Landmark} label="Ngân hàng">
                  {proposal.bankName ?? "—"}
                </InfoRow>
                <InfoRow icon={CreditCard} label="Số tài khoản">
                  {proposal.accountNumber ?? "—"}
                </InfoRow>
              </dl>
              )}
            </Card>
          )}

          {(proposal.attachments?.length ?? 0) > 0 && (
            <ProposalFileReview attachments={proposal.attachments} />
          )}

          {proposal.participants.length > 0 && (
            <Card padding="sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Người liên quan
              </h3>
              <ul className="space-y-2">
                {proposal.participants.map((p) => (
                  <li
                    key={`${p.role}-${p.user.id}`}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <span
                      className={`h-1.5 w-1.5 flex-none rounded-full ${
                        PARTICIPANT_DOT[p.role] ?? "bg-slate-400"
                      }`}
                    />
                    <span className="font-medium text-slate-800">
                      {p.user.fullName}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span>{PARTICIPANT_LABELS[p.role] ?? p.role}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {canApprove && (
            <Card padding="sm" className="border-primary-200 bg-primary-50/40">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-700">
                  Ghi chú duyệt
                </span>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
                  placeholder="Thêm ý kiến khi phê duyệt (không bắt buộc)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
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
                Đã thanh toán
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

            <button
              type="button"
              disabled={actionPending !== null}
              onClick={async () => {
                setActionPending("duplicate");
                const toastId = toast.loading("Đang nhân bản đề xuất...");
                try {
                  const copy = await duplicateProposal(proposal.id);
                  toast.success("Đã nhân bản đề xuất", { id: toastId });
                  router.push(`/proposals/${copy.id}/edit`);
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "Không thể nhân bản đề xuất",
                    { id: toastId },
                  );
                } finally {
                  setActionPending(null);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary-200 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-60"
            >
              <Copy className="h-4 w-4" />
              Nhân bản
            </button>

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
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-danger/30 px-4 py-2 text-sm text-danger hover:bg-danger-light disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Xóa nháp
              </button>
            )}
          </div>
        </div>

        {/* Approval workflow timeline */}
        <Card className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Quy trình duyệt</h3>
            {totalSteps > 0 && (
              <span className="text-xs font-medium text-slate-400">
                {doneSteps}/{totalSteps} bước
              </span>
            )}
          </div>

          {totalSteps > 0 && (
            <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${(doneSteps / totalSteps) * 100}%` }}
              />
            </div>
          )}

          <ol className="relative">
            {totalSteps === 0 ? (
              <p className="text-sm text-slate-500">Chưa gửi duyệt</p>
            ) : (
              proposal.approvalSteps.map((step, idx) => {
                const isCurrent =
                  step.status === "PENDING" &&
                  (step.stepOrder === proposal.currentStepOrder ||
                    isSeniorWorkflowStep(proposal, step.stepOrder));
                const senior = isSeniorWorkflowStep(proposal, step.stepOrder);
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
                  <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {!isLast && (
                      <span
                        className="absolute left-[11px] top-6 h-full w-px bg-border"
                        aria-hidden
                      />
                    )}
                    <StatusIcon
                      className={`z-10 mt-0.5 h-[22px] w-[22px] flex-none bg-white ${iconColor}`}
                    />
                    <div
                      className={`min-w-0 flex-1 rounded-xl px-3 py-2 text-sm ${
                        isCurrent
                          ? "border border-primary-200 bg-primary-50"
                          : ""
                      }`}
                    >
                      <p className="font-medium text-slate-800">
                        Bước {step.stepOrder} · {step.approver.fullName}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-slate-500">
                          {step.status}
                        </span>
                        {senior && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Duyệt cấp cao
                          </span>
                        )}
                      </div>
                      {step.comment && (
                        <p className="mt-1.5 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
                          {step.comment}
                        </p>
                      )}
                      {step.actedAt && (
                        <p className="mt-1.5 text-xs font-medium text-slate-500">
                          Thời gian xử lý: {formatDateTime(step.actedAt)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ol>
        </Card>
      </div>

      {reasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
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
