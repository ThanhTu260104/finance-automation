"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getProposal,
  updateProposal,
  type Proposal,
} from "@/lib/api/proposals";
import { getProposalTypes } from "@/lib/api/workflows";
import { uploadProposalAttachment } from "@/lib/api/attachments";
import { ProposalFileUpload } from "@/components/proposals/ProposalFileUpload";
import { ProposalFileReview } from "@/components/proposals/ProposalFileReview";
import { useUser } from "@/lib/context/UserContext";
import type { AttachmentKind } from "@/lib/api/attachments";
import { formatVndInput, normalizeVndInput } from "@/lib/utils/format";

function RequiredMark() {
  return <span className="text-danger">*</span>;
}

function isBlank(value: string) {
  return value.trim().length === 0;
}

export default function EditProposalPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useUser();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [types, setTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({
    title: "",
    projectName: "",
    content: "",
    paymentAmount: "",
    paymentContent: "",
    paymentMethod: "BANK_TRANSFER" as "CASH" | "BANK_TRANSFER",
    cashRecipient: "",
    accountHolder: "",
    bankName: "",
    accountNumber: "",
    departmentId: "",
  });
  const [saving, setSaving] = useState(false);
  const [localFiles, setLocalFiles] = useState<
    import("@/components/proposals/ProposalFileUpload").LocalFileItem[]
  >([]);

  const reloadProposal = () =>
    getProposal(params.id).then(setProposal);

  const handleUpload = async (kind: AttachmentKind, files: File[]) => {
    if (files.length === 0) return;
    const toastId = toast.loading("Đang tải tệp lên...");
    try {
      for (const file of files) {
        await uploadProposalAttachment(params.id, kind, file);
      }
      await reloadProposal();
      toast.success("Đã tải tệp lên", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải tệp lên", {
        id: toastId,
      });
    }
  };

  useEffect(() => {
    Promise.all([
      getProposal(params.id),
      getProposalTypes(),
    ]).then(([p, t]) => {
      setProposal(p);
      setTypes(t);
      setForm({
        title: p.title,
        projectName: p.projectName ?? "",
        content: p.content ?? "",
        paymentAmount: p.paymentAmount ? String(p.paymentAmount) : "",
        paymentContent: p.paymentContent ?? "",
        paymentMethod: p.paymentMethod ?? "BANK_TRANSFER",
        cashRecipient: p.cashRecipient ?? "",
        accountHolder: p.accountHolder ?? "",
        bankName: p.bankName ?? "",
        accountNumber: p.accountNumber ?? "",
        departmentId: p.department?.id ?? "",
      });
    });
  }, [params.id]);

  const availableDepartments = useMemo(() => {
    if (currentUser?.departments?.length) return currentUser.departments;
    if (currentUser?.department) return [currentUser.department];
    return [];
  }, [currentUser]);

  useEffect(() => {
    setForm((f) => {
      if (availableDepartments.length === 1) {
        return { ...f, departmentId: availableDepartments[0].id };
      }
      if (
        f.departmentId &&
        availableDepartments.some((department) => department.id === f.departmentId)
      ) {
        return f;
      }
      return { ...f, departmentId: "" };
    });
  }, [availableDepartments, proposal?.department?.id]);

  if (!proposal) {
    return <p className="text-sm text-slate-500">Đang tải...</p>;
  }

  if (!["DRAFT", "PENDING"].includes(proposal.status)) {
    return (
      <p className="text-sm text-slate-500">
        Không thể chỉnh sửa.{" "}
        <a href={`/proposals/${proposal.id}`} className="text-primary-600">
          Xem chi tiết
        </a>
      </p>
    );
  }

  const handleSave = async (saveAsDraft?: boolean) => {
    if (!form.title.trim()) {
      toast.error("Vui lòng nhập tên đề xuất");
      return;
    }
    if (!form.departmentId) {
      toast.error(
        availableDepartments.length === 0
          ? "Tài khoản chưa được gán dự án"
          : "Vui lòng chọn dự án",
      );
      return;
    }
    if (saveAsDraft === false) {
      const paymentAmount = Number(form.paymentAmount);
      if (isBlank(form.paymentContent)) {
        toast.error("Vui lòng nhập nội dung thanh toán");
        return;
      }
      if (
        isBlank(form.paymentAmount) ||
        Number.isNaN(paymentAmount) ||
        paymentAmount <= 0
      ) {
        toast.error("Vui lòng nhập số tiền thanh toán lớn hơn 0");
        return;
      }
      if (form.paymentMethod === "CASH") {
        if (isBlank(form.cashRecipient)) {
          toast.error("Vui lòng nhập nơi/người nhận tiền");
          return;
        }
      } else {
        if (isBlank(form.accountHolder) || isBlank(form.bankName) || isBlank(form.accountNumber)) {
          toast.error("Vui lòng nhập đầy đủ thông tin chuyển khoản");
          return;
        }
      }
      if (isBlank(form.content)) {
        toast.error("Vui lòng nhập nội dung mô tả");
        return;
      }
    }
    setSaving(true);
    const toastId = toast.loading(
      saveAsDraft === true
        ? "Đang lưu nháp đề xuất..."
        : saveAsDraft === false
          ? "Đang lưu và gửi đề xuất..."
          : "Đang lưu thay đổi...",
    );
    try {
      const updated = await updateProposal(params.id, {
        title: form.title.trim(),
        projectName: form.projectName || undefined,
        content: form.content || undefined,
        departmentId: form.departmentId || undefined,
        paymentAmount: form.paymentAmount
          ? Number(form.paymentAmount)
          : undefined,
        paymentContent: form.paymentContent || undefined,
        paymentMethod: form.paymentMethod,
        cashRecipient: form.paymentMethod === "CASH" ? form.cashRecipient : "",
        accountHolder: form.paymentMethod === "BANK_TRANSFER" ? form.accountHolder : "",
        bankName: form.paymentMethod === "BANK_TRANSFER" ? form.bankName : "",
        accountNumber: form.paymentMethod === "BANK_TRANSFER" ? form.accountNumber : "",
        ...(saveAsDraft !== undefined ? { saveAsDraft } : {}),
      });
      toast.success(
        saveAsDraft === true
          ? "Đã lưu nháp đề xuất"
          : saveAsDraft === false
            ? "Đã lưu và gửi đề xuất"
            : "Đã lưu thay đổi",
        { id: toastId },
      );
      router.push(`/proposals/${updated.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể lưu đề xuất", {
        id: toastId,
      });
    } finally {
      setSaving(false);
    }
  };

  const isDraft = proposal.status === "DRAFT";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Chỉnh sửa ${proposal.code}`}
        description={types.find((t) => t.id === proposal.proposalTypeId)?.name}
      />
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 font-medium">
              Tên đề xuất <RequiredMark />
            </span>
            <input
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm"
              value={form.title}
              required
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 font-medium">Dự án</span>
            <input
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm"
              value={form.projectName}
              onChange={(e) =>
                setForm({ ...form, projectName: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 font-medium">
              Dự án <RequiredMark />
            </span>
            <select
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm"
              value={form.departmentId}
              required
              disabled={availableDepartments.length <= 1}
              onChange={(e) =>
                setForm({ ...form, departmentId: e.target.value })
              }
            >
              <option value="">
                {availableDepartments.length === 0
                  ? "Chưa được gán dự án"
                  : "Chọn dự án"}
              </option>
              {availableDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <ProposalFileUpload
            label="Hợp đồng / Báo giá"
            kind="CONTRACT"
            files={localFiles}
            onAdd={(files) => handleUpload("CONTRACT", files)}
            onRemove={() => {}}
          />
          <ProposalFileUpload
            label="Hóa đơn tài chính"
            kind="INVOICE"
            files={localFiles}
            onAdd={(files) => handleUpload("INVOICE", files)}
            onRemove={() => {}}
          />
          <label className="block text-sm">
            <span className="mb-1 font-medium">
              Số tiền <RequiredMark />
            </span>
            <input
              type="text"
              inputMode="numeric"
              required
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm"
              value={formatVndInput(form.paymentAmount)}
              onChange={(e) =>
                setForm({ ...form, paymentAmount: normalizeVndInput(e.target.value) })
              }
              placeholder="0"
              aria-label="Số tiền bằng VND"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 font-medium">
              Nội dung thanh toán <RequiredMark />
            </span>
            <input
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm"
              value={form.paymentContent}
              required
              onChange={(e) =>
                setForm({ ...form, paymentContent: e.target.value })
              }
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium">Phương thức thanh toán <RequiredMark /></span>
            <select className="w-full rounded-xl border border-border px-3 py-2.5 text-sm" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as "CASH" | "BANK_TRANSFER" })}>
              <option value="CASH">Tiền mặt</option>
              <option value="BANK_TRANSFER">Chuyển khoản</option>
            </select>
          </label>
          {form.paymentMethod === "CASH" ? (
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium">Nơi/người nhận tiền <RequiredMark /></span>
            <input className="w-full rounded-xl border border-border px-3 py-2.5 text-sm" value={form.cashRecipient} required onChange={(e) => setForm({ ...form, cashRecipient: e.target.value })} />
          </label>
          ) : <>
          <label className="block text-sm">
            <span className="mb-1 font-medium">
              Tên chủ tài khoản <RequiredMark />
            </span>
            <input
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm"
              value={form.accountHolder}
              required
              onChange={(e) =>
                setForm({ ...form, accountHolder: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 font-medium">
              Ngân hàng - Chi nhánh <RequiredMark />
            </span>
            <input
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm"
              value={form.bankName}
              required
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 font-medium">
              Số tài khoản <RequiredMark />
            </span>
            <input
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm"
              value={form.accountNumber}
              required
              onChange={(e) =>
                setForm({ ...form, accountNumber: e.target.value })
              }
            />
          </label>
          </>}
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 font-medium">
              Nội dung mô tả <RequiredMark />
            </span>
            <textarea
              rows={4}
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm"
              value={form.content}
              required
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </label>
          <ProposalFileUpload
            label="Tài liệu nội dung đính kèm"
            kind="CONTENT"
            files={localFiles}
            onAdd={(files) => handleUpload("CONTENT", files)}
            onRemove={() => {}}
          />
        </div>
        <div className="mt-4 flex gap-2">
          {isDraft && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
              >
                Lưu nháp
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Lưu & gửi duyệt
              </button>
            </>
          )}
          {!isDraft && (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave()}
              className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Lưu thay đổi
            </button>
          )}
        </div>
      </Card>

      <ProposalFileReview attachments={proposal.attachments} />
    </div>
  );
}
