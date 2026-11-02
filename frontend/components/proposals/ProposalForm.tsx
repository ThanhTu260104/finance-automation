"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  Banknote,
  Building2,
  CalendarClock,
  ChevronDown,
  FileText,
  Landmark,
  Loader2,
  Paperclip,
  Send,
} from "lucide-react";
import { getProposalTypes, type ProposalType } from "@/lib/api/workflows";
import {
  createProposal,
  type CreateProposalPayload,
} from "@/lib/api/proposals";
import { uploadProposalFiles } from "@/lib/api/attachments";
import { useUser } from "@/lib/context/UserContext";
import {
  ProposalFileUpload,
  createLocalFiles,
  type LocalFileItem,
} from "@/components/proposals/ProposalFileUpload";
import { ProposalFileReview } from "@/components/proposals/ProposalFileReview";
import { ProposalWorkflowPanel } from "@/components/proposals/ProposalWorkflowPanel";
import { formatVndInput, normalizeVndInput } from "@/lib/utils/format";

// Small section header used to break the long form into readable groups.
function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5 pb-1">
      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary-50 text-primary-600">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow focus-within:shadow-md">
      {children}
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100";
const selectClass = `${fieldClass} appearance-none pr-9`;
const labelClass = "mb-1.5 block font-medium text-slate-700";

function RequiredMark() {
  return <span className="text-danger">*</span>;
}

function isBlank(value: string) {
  return value.trim().length === 0;
}

export function ProposalForm() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [types, setTypes] = useState<ProposalType[]>([]);
  const [loading, setLoading] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState("");
  const [localFiles, setLocalFiles] = useState<LocalFileItem[]>([]);

  const [form, setForm] = useState({
    proposalTypeId: "",
    title: "",
    departmentId: "",
    content: "",
    paymentAmount: "",
    paymentContent: "",
    paymentMethod: "BANK_TRANSFER" as "CASH" | "BANK_TRANSFER",
    cashRecipient: "",
    accountHolder: "",
    bankName: "",
    accountNumber: "",
    desiredDeadline: "",
    regulationDeadline: "",
  });

  const availableDepartments = useMemo(() => {
    if (currentUser?.departments?.length) return currentUser.departments;
    if (currentUser?.department) return [currentUser.department];
    return [];
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;
    getProposalTypes(undefined, { includeWorkflows: false })
      .then((typeList) => {
        if (!mounted) return;
        setTypes(typeList);
        if (typeList[0]) {
          setForm((current) => ({
            ...current,
            proposalTypeId: current.proposalTypeId || typeList[0].id,
          }));
        }
        return getProposalTypes();
      })
      .then((typesWithWorkflows) => {
        if (mounted && typesWithWorkflows) setTypes(typesWithWorkflows);
      })
      .catch(() => {
        if (mounted) setError("Không thể tải danh sách loại đề xuất. Vui lòng thử lại.");
      });
    return () => {
      mounted = false;
    };
  }, []);


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
  }, [availableDepartments]);

  const financeTypes = types.filter((t) => t.group === "FINANCE");
  const procurementTypes = types.filter((t) => t.group === "PROCUREMENT");
  const selectedType = types.find((t) => t.id === form.proposalTypeId);
  const selectedWorkflow = selectedType?.workflows?.[0];

  const addFiles = (kind: LocalFileItem["kind"], files: File[]) => {
    setLocalFiles((prev) => [...prev, ...createLocalFiles(kind, files)]);
  };

  const removeFile = (id: string) => {
    setLocalFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const buildPayload = (saveAsDraft: boolean): CreateProposalPayload => ({
    proposalTypeId: form.proposalTypeId,
    title: form.title.trim(),
    departmentId: form.departmentId || undefined,
    content: form.content || undefined,
    paymentAmount: form.paymentAmount
      ? Number(form.paymentAmount)
      : undefined,
    paymentContent: form.paymentContent || undefined,
    paymentMethod: form.paymentMethod,
    cashRecipient: form.paymentMethod === "CASH" ? form.cashRecipient : "",
    accountHolder: form.paymentMethod === "BANK_TRANSFER" ? form.accountHolder : "",
    bankName: form.paymentMethod === "BANK_TRANSFER" ? form.bankName : "",
    accountNumber: form.paymentMethod === "BANK_TRANSFER" ? form.accountNumber : "",
    desiredDeadline: form.desiredDeadline || undefined,
    regulationDeadline: form.regulationDeadline || undefined,
    saveAsDraft,
  });

  const validateBeforeSave = (saveAsDraft: boolean) => {
    if (!form.proposalTypeId) {
      return "Vui lòng chọn loại đề xuất";
    }
    setError("");
    if (!form.title.trim()) {
      return "Vui lòng nhập tên đề xuất";
    }
    if (!form.departmentId) {
      return (
        availableDepartments.length === 0
          ? "Tài khoản chưa được gán dự án"
          : "Vui lòng chọn dự án"
      );
    }

    if (!saveAsDraft) {
      const paymentAmount = Number(form.paymentAmount);
      if (isBlank(form.paymentContent)) {
        return "Vui lòng nhập nội dung thanh toán";
      }
      if (
        isBlank(form.paymentAmount) ||
        Number.isNaN(paymentAmount) ||
        paymentAmount <= 0
      ) {
        return "Vui lòng nhập số tiền thanh toán lớn hơn 0";
      }
      if (form.paymentMethod === "CASH") {
        if (isBlank(form.cashRecipient)) return "Vui lòng nhập nơi/người nhận tiền";
      } else {
        if (isBlank(form.accountHolder)) return "Vui lòng nhập tên chủ tài khoản";
        if (isBlank(form.bankName)) return "Vui lòng nhập ngân hàng - chi nhánh";
        if (isBlank(form.accountNumber)) return "Vui lòng nhập số tài khoản";
      }
      if (isBlank(form.content)) {
        return "Vui lòng nhập nội dung mô tả";
      }
    }

    return null;
  };

  const handleSave = async (saveAsDraft: boolean) => {
    setError("");
    const validationError = validateBeforeSave(saveAsDraft);
    if (validationError) {
      toast.error(validationError);
      setError(validationError);
      return;
    }
    setLoading(saveAsDraft ? "draft" : "submit");
    const toastId = toast.loading(
      saveAsDraft ? "Đang lưu nháp đề xuất..." : "Đang gửi đề xuất...",
    );
    try {
      const proposal = await createProposal(buildPayload(saveAsDraft));
      if (localFiles.length > 0) {
        const grouped: Parameters<typeof uploadProposalFiles>[1] = {};
        for (const f of localFiles) {
          (grouped[f.kind] ??= []).push(f.file);
        }
        await uploadProposalFiles(proposal.id, grouped);
      }
      toast.success(
        saveAsDraft ? "Đã lưu nháp đề xuất" : "Đã gửi đề xuất để duyệt",
        { id: toastId },
      );
      router.push(`/proposals/${proposal.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể tạo đề xuất", {
        id: toastId,
      });
      setError(e instanceof Error ? e.message : "Lỗi tạo đề xuất");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-danger-light px-4 py-3 text-sm text-danger">
              <AlertCircle className="h-4 w-4 flex-none" />
              {error}
            </div>
          )}

          {/* Basic info */}
          <Card>
            <SectionHeader icon={FileText} title="Thông tin đề xuất" />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className={labelClass}>
                  Loại đề xuất <RequiredMark />
                </span>
                <div className="relative">
                  <select
                    className={selectClass}
                    value={form.proposalTypeId}
                    required
                    onChange={(e) =>
                      setForm((f) => ({ ...f, proposalTypeId: e.target.value }))
                    }
                  >
                    <optgroup label="Nhóm Tài chính - Kế toán">
                      {financeTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Nhóm Mua sắm">
                      {procurementTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </label>

              <label className="block text-sm">
                <span className={labelClass}>
                  Dự án <RequiredMark />
                </span>
                <div className="relative">
                  <select
                    className={selectClass}
                    value={form.departmentId}
                    required
                    disabled={availableDepartments.length <= 1}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, departmentId: e.target.value }))
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
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </label>

              <label className="block text-sm md:col-span-2">
                <span className={labelClass}>
                  Tên đề xuất <RequiredMark />
                </span>
                <input
                  className={fieldClass}
                  value={form.title}
                  required
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Nhập tên đề xuất"
                />
              </label>
            </div>
          </Card>

          {/* Deadlines */}
          <Card>
            <SectionHeader icon={CalendarClock} title="Thời hạn duyệt" />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className={labelClass}>Thời hạn mong muốn</span>
                <input
                  type="date"
                  className={fieldClass}
                  value={form.desiredDeadline}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, desiredDeadline: e.target.value }))
                  }
                />
              </label>

              <label className="block text-sm">
                <span className={labelClass}>Thời hạn theo quy định</span>
                <input
                  type="date"
                  className={fieldClass}
                  value={form.regulationDeadline}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      regulationDeadline: e.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </Card>

          {/* Payment info */}
          <Card>
            <SectionHeader icon={Landmark} title="Thông tin thanh toán" />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm md:col-span-2">
                <span className={labelClass}>
                  Nội dung thanh toán <RequiredMark />
                </span>
                <input
                  className={fieldClass}
                  value={form.paymentContent}
                  required
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paymentContent: e.target.value }))
                  }
                  placeholder="VD: Thanh toán chi phí văn phòng phẩm quý III"
                />
              </label>

              <label className="block text-sm">
                <span className={labelClass}>
                  Số tiền thanh toán <RequiredMark />
                </span>
                <div className="relative">
                  <Banknote className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    className={`${fieldClass} pl-9 pr-10`}
                    value={formatVndInput(form.paymentAmount)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, paymentAmount: normalizeVndInput(e.target.value) }))
                    }
                    placeholder="0"
                    aria-label="Số tiền thanh toán bằng VND"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                    ₫
                  </span>
                </div>
              </label>

              <label className="block text-sm md:col-span-2">
                <span className={labelClass}>Phương thức thanh toán <RequiredMark /></span>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setForm((f) => ({ ...f, paymentMethod: "CASH" }))} className={`rounded-xl border px-4 py-2.5 font-medium ${form.paymentMethod === "CASH" ? "border-primary-500 bg-primary-50 text-primary-700" : "border-border text-slate-600"}`}>Tiền mặt</button>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, paymentMethod: "BANK_TRANSFER" }))} className={`rounded-xl border px-4 py-2.5 font-medium ${form.paymentMethod === "BANK_TRANSFER" ? "border-primary-500 bg-primary-50 text-primary-700" : "border-border text-slate-600"}`}>Chuyển khoản</button>
                </div>
              </label>

              {form.paymentMethod === "CASH" ? (
              <label className="block text-sm md:col-span-2">
                <span className={labelClass}>Nơi/người nhận tiền <RequiredMark /></span>
                <input className={fieldClass} value={form.cashRecipient} required onChange={(e) => setForm((f) => ({ ...f, cashRecipient: e.target.value }))} placeholder="VD: Trần Văn A - Phòng Kế toán" />
              </label>
              ) : <>
              <label className="block text-sm">
                <span className={labelClass}>
                  Tên chủ tài khoản <RequiredMark />
                </span>
                <input
                  className={fieldClass}
                  value={form.accountHolder}
                  required
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accountHolder: e.target.value }))
                  }
                />
              </label>

              <label className="block text-sm">
                <span className={labelClass}>
                  Ngân hàng - Chi nhánh <RequiredMark />
                </span>
                <input
                  className={fieldClass}
                  value={form.bankName}
                  required
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bankName: e.target.value }))
                  }
                />
              </label>

              <label className="block text-sm">
                <span className={labelClass}>
                  Số tài khoản <RequiredMark />
                </span>
                <input
                  className={fieldClass}
                  value={form.accountNumber}
                  required
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accountNumber: e.target.value }))
                  }
                />
              </label>
              </>}
            </div>

          </Card>

          {/* Description & attachments */}
          <Card>
            <SectionHeader icon={Paperclip} title="Nội dung & tài liệu" />
            <label className="block text-sm">
              <span className={labelClass}>
                Nội dung mô tả <RequiredMark />
              </span>
              <textarea
                rows={4}
                className={`${fieldClass} resize-none`}
                value={form.content}
                required
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                placeholder="Mô tả ngắn về đề xuất..."
              />
            </label>

            <ProposalFileUpload
              label="Nội dung tài liệu"
              kind="CONTENT"
              files={localFiles}
              onAdd={(files) => addFiles("CONTENT", files)}
              onRemove={removeFile}
            />
          </Card>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "draft" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Lưu nháp
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "submit" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Gửi duyệt
            </button>
            <span className="text-xs text-slate-400">
              Bản nháp có thể chỉnh sửa sau, các trường * bắt buộc khi gửi duyệt
            </span>
          </div>
        </div>

        <aside className="rounded-2xl border border-border bg-surface p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Building2 className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Quy trình xét duyệt
            </h3>
          </div>
          <ProposalWorkflowPanel workflow={selectedWorkflow} />
        </aside>
      </div>

      <ProposalFileReview localFiles={localFiles} />
    </div>
  );
}
