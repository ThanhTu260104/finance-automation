import { Ban, CheckCircle2, Circle, Clock, CreditCard, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PROPOSAL_STATUS_LABELS, type ProposalStatus } from "@/lib/api/proposals";

const styles: Record<ProposalStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PENDING: "bg-warning-light text-warning",
  APPROVED: "bg-success-light text-success",
  PENDING_PAYMENT: "bg-sky-50 text-sky-700",
  PAID: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-danger-light text-danger",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const icons: Record<ProposalStatus, typeof Circle> = {
  DRAFT: Circle,
  PENDING: Clock,
  APPROVED: CheckCircle2,
  PENDING_PAYMENT: CreditCard,
  PAID: CheckCircle2,
  REJECTED: XCircle,
  CANCELLED: Ban,
};

export function ProposalStatusBadge({
  status,
  className,
}: {
  status: ProposalStatus;
  className?: string;
}) {
  const Icon = icons[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        styles[status],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {PROPOSAL_STATUS_LABELS[status]}
    </span>
  );
}
