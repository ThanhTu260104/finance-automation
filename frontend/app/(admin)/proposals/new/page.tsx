"use client";

import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProposalForm } from "@/components/proposals/ProposalForm";

export default function NewProposalPage() {
  return (
    <div>
      <PageHeader
        title="Thêm mới đề xuất"
        description="Tạo đề xuất thanh toán / mua sắm và gửi duyệt theo quy trình"
      />
      <Card>
        <ProposalForm />
      </Card>
    </div>
  );
}
