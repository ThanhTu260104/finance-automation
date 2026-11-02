"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, Pencil, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import {
  deleteInvoice,
  duplicateInvoice,
  getInvoices,
} from "@/lib/api/invoices";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_TYPE_LABELS,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/types/invoice";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export function InvoiceListClient() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getInvoices({
        search: search || undefined,
        status: status || undefined,
        limit: 50,
      });
      setInvoices(result.data);
      setTotal(result.total);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể tải danh sách hóa đơn",
      );
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa hóa đơn nháp này?")) return;
    setActionId(id);
    const toastId = toast.loading("Đang xóa hóa đơn nháp...");
    try {
      await deleteInvoice(id);
      await load();
      toast.success("Đã xóa hóa đơn nháp", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa hóa đơn", {
        id: toastId,
      });
    } finally {
      setActionId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    setActionId(id);
    const toastId = toast.loading("Đang nhân bản hóa đơn...");
    try {
      const copy = await duplicateInvoice(id);
      toast.success("Đã nhân bản hóa đơn", { id: toastId });
      window.location.href = `/invoices/${copy.id}/edit`;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể nhân bản hóa đơn",
        { id: toastId },
      );
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Hóa đơn"
        description={`${total} hóa đơn trong hệ thống`}
        action={
          <Link
            href="/invoices/new"
            className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            + Tạo hóa đơn
          </Link>
        }
      />

      <Card className="mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm số HĐ, tên khách hàng..."
              className="w-full rounded-xl border border-border bg-surface-muted py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:bg-surface"
            />
          </div>
          <select
            aria-label="Trạng thái"
            value={status}
            onChange={(e) => setStatus(e.target.value as InvoiceStatus | "")}
            className="rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary-500"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="space-y-3 md:hidden">
        {loading ? (
          <Card><p className="py-4 text-center text-sm text-slate-500">Đang tải...</p></Card>
        ) : invoices.length === 0 ? (
          <Card><p className="py-4 text-center text-sm text-slate-500">Chưa có hóa đơn.</p></Card>
        ) : invoices.map((invoice) => (
          <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="block rounded-2xl border border-border bg-white p-4 shadow-sm active:bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-primary-700">{invoice.invoiceNumber}</p>
                <p className="mt-1 truncate text-sm font-medium text-slate-800">{invoice.customerName}</p>
              </div>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>{INVOICE_TYPE_LABELS[invoice.type]}</span>
              <span className="text-right">{formatDate(invoice.issueDate)}</span>
              <span className="col-span-2 text-right text-sm font-semibold text-slate-900">{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </Link>
        ))}
      </div>

      <Card padding="sm" className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-surface-muted text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Số HĐ</th>
                <th className="px-4 py-3 font-medium">Khách hàng</th>
                <th className="px-4 py-3 font-medium">Loại</th>
                <th className="px-4 py-3 font-medium">Ngày lập</th>
                <th className="px-4 py-3 font-medium">Tổng tiền</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Đang tải...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Chưa có hóa đơn.{" "}
                    <Link href="/invoices/new" className="text-primary-600 hover:underline">
                      Tạo hóa đơn đầu tiên
                    </Link>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="hover:text-primary-600"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {invoice.customerName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {INVOICE_TYPE_LABELS[invoice.type]}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(invoice.issueDate)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={invoice.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="rounded-lg p-2 text-slate-500 hover:bg-surface-muted hover:text-primary-600"
                          title="Chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {["DRAFT", "PENDING"].includes(invoice.status) && (
                          <Link
                            href={`/invoices/${invoice.id}/edit`}
                            className="rounded-lg p-2 text-slate-500 hover:bg-surface-muted hover:text-primary-600"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        )}
                        <button
                          type="button"
                          disabled={actionId === invoice.id}
                          onClick={() => handleDuplicate(invoice.id)}
                          className="rounded-lg  p-2 text-slate-500 hover:bg-surface-muted hover:text-primary-600"
                          title="Nhân bản"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        {invoice.status === "DRAFT" && (
                          <button
                            type="button"
                            disabled={actionId === invoice.id}
                            onClick={() => handleDelete(invoice.id)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-danger-light hover:text-danger"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
