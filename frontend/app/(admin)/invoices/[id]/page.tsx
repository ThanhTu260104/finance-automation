"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import {
  duplicateInvoice,
  getInvoice,
  submitInvoice,
} from "@/lib/api/invoices";
import {
  INVOICE_TYPE_LABELS,
  type Invoice,
} from "@/lib/types/invoice";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getInvoice(params.id)
      .then(setInvoice)
      .catch(() => setError("Không tải được hóa đơn"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <p className="text-sm text-slate-500">Đang tải...</p>;
  }

  if (error || !invoice) {
    return <p className="text-sm text-danger">{error || "Không tìm thấy"}</p>;
  }

  const readOnly = !["DRAFT", "PENDING"].includes(invoice.status);

  return (
    <div>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`${INVOICE_TYPE_LABELS[invoice.type]} · ${invoice.customerName}`}
        action={
          <div className="flex items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} />
            {!readOnly && (
              <Link
                href={`/invoices/${invoice.id}/edit`}
                className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-surface-muted"
              >
                <Pencil className="h-4 w-4" />
                Chỉnh sửa
              </Link>
            )}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Ngày lập</p>
          <p className="mt-1 font-semibold text-slate-800">
            {formatDate(invoice.issueDate)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Hạn thanh toán</p>
          <p className="mt-1 font-semibold text-slate-800">
            {formatDate(invoice.dueDate)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Tổng thanh toán</p>
          <p className="mt-1 text-xl font-bold text-primary-700">
            {formatCurrency(invoice.totalAmount)}
          </p>
        </Card>
      </div>

      <Card>
        <InvoiceForm
          mode="edit"
          invoice={invoice}
          readOnly={readOnly}
          onSubmit={async () => {}}
          onDuplicate={async () => {
            const copy = await duplicateInvoice(invoice.id);
            router.push(`/invoices/${copy.id}/edit`);
          }}
          onSubmitDraft={
            invoice.status === "DRAFT"
              ? async () => {
                  const updated = await submitInvoice(invoice.id);
                  setInvoice(updated);
                }
              : undefined
          }
        />
      </Card>
    </div>
  );
}
