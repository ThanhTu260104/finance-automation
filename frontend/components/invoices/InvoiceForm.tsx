"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { CreateInvoicePayload, Invoice, InvoiceType } from "@/lib/types/invoice";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export type InvoiceFormValues = {
  type: InvoiceType;
  customerName: string;
  customerTaxCode: string;
  customerAddress: string;
  customerEmail: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  taxRate: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
};

type InvoiceFormProps = {
  initialValues?: Partial<InvoiceFormValues>;
  invoice?: Invoice;
  mode: "create" | "edit";
  readOnly?: boolean;
  onSubmit: (payload: CreateInvoicePayload, saveAsDraft: boolean) => Promise<void>;
  onDuplicate?: () => Promise<void>;
  onSubmitDraft?: () => Promise<void>;
};

const emptyItem = () => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
});

const defaultValues: InvoiceFormValues = {
  type: "OUTPUT",
  customerName: "",
  customerTaxCode: "",
  customerAddress: "",
  customerEmail: "",
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  notes: "",
  taxRate: 10,
  items: [emptyItem()],
};

function invoiceToFormValues(invoice: Invoice): InvoiceFormValues {
  return {
    type: invoice.type,
    customerName: invoice.customerName,
    customerTaxCode: invoice.customerTaxCode ?? "",
    customerAddress: invoice.customerAddress ?? "",
    customerEmail: invoice.customerEmail ?? "",
    issueDate: invoice.issueDate.slice(0, 10),
    dueDate: invoice.dueDate?.slice(0, 10) ?? "",
    notes: invoice.notes ?? "",
    taxRate: invoice.taxRate,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
}

export function InvoiceForm({
  initialValues,
  invoice,
  mode,
  readOnly = false,
  onSubmit,
  onDuplicate,
  onSubmitDraft,
}: InvoiceFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<InvoiceFormValues>({
    ...defaultValues,
    ...initialValues,
    ...(invoice ? invoiceToFormValues(invoice) : {}),
  });
  const [loading, setLoading] = useState<"draft" | "submit" | "duplicate" | null>(
    null,
  );
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const subtotal = values.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const taxAmount = subtotal * (values.taxRate / 100);
    return {
      subtotal,
      taxAmount,
      totalAmount: subtotal + taxAmount,
    };
  }, [values.items, values.taxRate]);

  const updateField = <K extends keyof InvoiceFormValues>(
    key: K,
    value: InvoiceFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const updateItem = (
    index: number,
    field: "description" | "quantity" | "unitPrice",
    value: string | number,
  ) => {
    setValues((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "description" ? value : Number(value) || 0,
            }
          : item,
      ),
    }));
  };

  const addItem = () => {
    setValues((prev) => ({
      ...prev,
      items: [...prev.items, emptyItem()],
    }));
  };

  const removeItem = (index: number) => {
    setValues((prev) => ({
      ...prev,
      items:
        prev.items.length === 1
          ? [emptyItem()]
          : prev.items.filter((_, i) => i !== index),
    }));
  };

  const buildPayload = (): CreateInvoicePayload => ({
    type: values.type,
    customerName: values.customerName.trim(),
    customerTaxCode: values.customerTaxCode.trim() || undefined,
    customerAddress: values.customerAddress.trim() || undefined,
    customerEmail: values.customerEmail.trim() || undefined,
    issueDate: values.issueDate || undefined,
    dueDate: values.dueDate || undefined,
    notes: values.notes.trim() || undefined,
    taxRate: values.taxRate,
    items: values.items
      .filter((item) => item.description.trim())
      .map((item) => ({
        description: item.description.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
  });

  const handleSave = async (saveAsDraft: boolean) => {
    setError("");
    if (!values.customerName.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      setError("Vui lòng nhập tên khách hàng");
      return;
    }
    const payload = buildPayload();
    if (payload.items.length === 0) {
      toast.error("Vui lòng thêm ít nhất một dòng hàng hóa/dịch vụ");
      setError("Vui lòng thêm ít nhất một dòng hàng hóa/dịch vụ");
      return;
    }

    setLoading(saveAsDraft ? "draft" : "submit");
    const toastId = toast.loading(
      saveAsDraft ? "Đang lưu nháp hóa đơn..." : "Đang gửi hóa đơn...",
    );
    try {
      await onSubmit({ ...payload, saveAsDraft }, saveAsDraft);
      toast.success(
        saveAsDraft ? "Đã lưu nháp hóa đơn" : "Đã gửi hóa đơn để duyệt",
        { id: toastId },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra", {
        id: toastId,
      });
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(null);
    }
  };

  const handleDuplicate = async () => {
    if (!onDuplicate) return;
    setLoading("duplicate");
    const toastId = toast.loading("Đang nhân bản hóa đơn...");
    try {
      await onDuplicate();
      toast.success("Đã nhân bản hóa đơn", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể nhân bản", {
        id: toastId,
      });
      setError(err instanceof Error ? err.message : "Không thể nhân bản");
    } finally {
      setLoading(null);
    }
  };

  const disabled = readOnly || loading !== null;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Loại HĐ</span>
          <select
            disabled={disabled}
            value={values.type}
            onChange={(e) =>
              updateField("type", e.target.value as InvoiceType)
            }
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary-500"
          >
            <option value="OUTPUT">Đầu ra</option>
            <option value="INPUT">Đầu vào</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Ngày lập <span className="text-danger">*</span>
          </span>
          <input
            type="date"
            disabled={disabled}
            value={values.issueDate}
            onChange={(e) => updateField("issueDate", e.target.value)}
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary-500"
          />
        </label>

        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block font-medium text-slate-700">
            Tên khách hàng <span className="text-danger">*</span>
          </span>
          <input
            disabled={disabled}
            value={values.customerName}
            onChange={(e) => updateField("customerName", e.target.value)}
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary-500"
            placeholder="Công ty TNHH ABC"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Mã số thuế</span>
          <input
            disabled={disabled}
            value={values.customerTaxCode}
            onChange={(e) => updateField("customerTaxCode", e.target.value)}
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary-500"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Email</span>
          <input
            type="email"
            disabled={disabled}
            value={values.customerEmail}
            onChange={(e) => updateField("customerEmail", e.target.value)}
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary-500"
          />
        </label>

        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block font-medium text-slate-700">Địa chỉ</span>
          <input
            disabled={disabled}
            value={values.customerAddress}
            onChange={(e) => updateField("customerAddress", e.target.value)}
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary-500"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Hạn thanh toán</span>
          <input
            type="date"
            disabled={disabled}
            value={values.dueDate}
            onChange={(e) => updateField("dueDate", e.target.value)}
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary-500"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Thuế VAT (%)</span>
          <input
            type="number"
            min={0}
            disabled={disabled}
            value={values.taxRate}
            onChange={(e) =>
              updateField("taxRate", Number(e.target.value) || 0)
            }
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary-500"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-semibold text-slate-800">Chi tiết hàng hóa / dịch vụ</h3>
          {!readOnly && (
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50"
            >
              <Plus className="h-4 w-4" />
              Thêm dòng
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface-muted text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Mô tả</th>
                <th className="w-28 px-4 py-3 font-medium">SL</th>
                <th className="w-36 px-4 py-3 font-medium">Đơn giá</th>
                <th className="w-36 px-4 py-3 font-medium">Thành tiền</th>
                {!readOnly && <th className="w-16 px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {values.items.map((item, index) => (
                <tr key={index} className="border-t border-border">
                  <td className="px-4 py-3">
                    <input
                      disabled={disabled}
                      value={item.description}
                      onChange={(e) =>
                        updateItem(index, "description", e.target.value)
                      }
                      className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary-500"
                      placeholder="Mô tả dịch vụ"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      aria-label="Số lượng"
                      title="Số lượng"
                      type="number"
                      min={0}
                      disabled={disabled}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", e.target.value)
                      }
                      className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      aria-label="Đơn giá"
                      title="Đơn giá"
                      type="number"
                      min={0}
                      disabled={disabled}
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(index, "unitPrice", e.target.value)
                      }
                      className="w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-primary-500"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <button
                        aria-label="Xóa"
                        title="Xóa"
                        type="button"
                        onClick={() => removeItem(index)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-danger-light hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t border-border px-4 py-4">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Tạm tính</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>VAT ({values.taxRate}%)</span>
              <span>{formatCurrency(totals.taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-slate-800">
              <span>Tổng cộng</span>
              <span>{formatCurrency(totals.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Ghi chú</span>
        <textarea
          disabled={disabled}
          value={values.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary-500"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-surface-muted"
        >
          Quay lại
        </button>

        {!readOnly && (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleSave(true)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-surface-muted",
                loading === "draft" && "opacity-70",
              )}
            >
              {loading === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu nháp
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleSave(false)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700",
                loading === "submit" && "opacity-70",
              )}
            >
              {loading === "submit" && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "Tạo & Gửi duyệt" : "Lưu & Gửi duyệt"}
            </button>
          </>
        )}

        {readOnly && invoice?.status === "DRAFT" && onSubmitDraft && (
          <button
            type="button"
            disabled={disabled}
            onClick={async () => {
              setLoading("submit");
              const toastId = toast.loading("Đang gửi hóa đơn...");
              try {
                await onSubmitDraft();
                toast.success("Đã gửi hóa đơn để duyệt", { id: toastId });
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Không thể gửi hóa đơn",
                  { id: toastId },
                );
                setError(
                  err instanceof Error ? err.message : "Không thể gửi hóa đơn",
                );
              } finally {
                setLoading(null);
              }
            }}
            className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Gửi duyệt
          </button>
        )}

        {onDuplicate && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleDuplicate}
            className="inline-flex items-center gap-2 rounded-xl border border-primary-200 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            {loading === "duplicate" && <Loader2 className="h-4 w-4 animate-spin" />}
            Nhân bản HĐ
          </button>
        )}
      </div>
    </div>
  );
}
