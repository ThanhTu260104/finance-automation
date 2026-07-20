import { cn } from "@/lib/utils/cn";
import {
  INVOICE_STATUS_LABELS,
  type InvoiceStatus,
} from "@/lib/types/invoice";

const statusStyles: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-warning-light text-warning",
  APPROVED: "bg-primary-50 text-primary-700",
  PAID: "bg-success-light text-success",
  CANCELLED: "bg-danger-light text-danger",
};

export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        statusStyles[status],
        className,
      )}
    >
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}
