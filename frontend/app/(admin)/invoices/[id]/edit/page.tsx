"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { getInvoice, updateInvoice } from "@/lib/api/invoices";
import type { CreateInvoicePayload, Invoice } from "@/lib/types/invoice";

export default function EditInvoicePage() {
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

  const handleSubmit = async (payload: CreateInvoicePayload) => {
    const updated = await updateInvoice(params.id, payload);
    router.push(`/invoices/${updated.id}`);
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Đang tải...</p>;
  }

  if (error || !invoice) {
    return <p className="text-sm text-danger">{error || "Không tìm thấy"}</p>;
  }

  if (!["DRAFT", "PENDING"].includes(invoice.status)) {
    return (
      <p className="text-sm text-slate-500">
        Hóa đơn này không thể chỉnh sửa.{" "}
        <a href={`/invoices/${invoice.id}`} className="text-primary-600 hover:underline">
          Xem chi tiết
        </a>
      </p>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Chỉnh sửa ${invoice.invoiceNumber}`}
        description="Cập nhật thông tin hóa đơn"
      />
      <Card>
        <InvoiceForm mode="edit" invoice={invoice} onSubmit={handleSubmit} />
      </Card>
    </div>
  );
}
