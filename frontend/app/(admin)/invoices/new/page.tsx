"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { createInvoice } from "@/lib/api/invoices";
import type { CreateInvoicePayload } from "@/lib/types/invoice";

export default function NewInvoicePage() {
  const router = useRouter();

  const handleSubmit = async (payload: CreateInvoicePayload) => {
    const invoice = await createInvoice(payload);
    router.push(`/invoices/${invoice.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Tạo hóa đơn mới"
        description="Điền thông tin và lưu nháp hoặc gửi duyệt"
      />
      <Card>
        <InvoiceForm mode="create" onSubmit={handleSubmit} />
      </Card>
    </div>
  );
}
