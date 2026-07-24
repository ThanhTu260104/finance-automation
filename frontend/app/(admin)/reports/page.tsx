"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  ReceiptText,
  Wallet,
  Download,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProposalStatusBadge } from "@/components/proposals/ProposalStatusBadge";
import api, { type DashboardPeriod } from "@/lib/api/client";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

type DepartmentReportSummary = {
  totalProposals: number;
  pendingProposals: number;
  approvedProposals: number;
  pendingPaymentProposals: number;
  paidProposals: number;
  rejectedProposals: number;
  totalApprovedAmount: number;
  totalPaidAmount: number;
};

type DepartmentReportProposal = {
  id: string;
  code: string;
  title: string;
  status: string;
  createdAt: string;
  paymentAmount?: number | null;
  proposalType: { name: string };
  creator: { fullName: string };
  department?: { name: string } | null;
};

type DepartmentReport = {
  period: DashboardPeriod;
  periodStart: string;
  periodEnd: string;
  departmentId?: string | null;
  summary: DepartmentReportSummary;
  monthlyPaid: Array<{ month: number; amount: number }>;
  proposals: DepartmentReportProposal[];
};

function toDateInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function toMonthInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
}) {
  return (
    <Card padding="sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${tint}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold text-slate-800">
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function ReportsPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [selectedMonth, setSelectedMonth] = useState(() =>
    toMonthInputValue(new Date()),
  );
  const [selectedWeekDate, setSelectedWeekDate] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [report, setReport] = useState<DepartmentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [realtimeVersion, setRealtimeVersion] = useState(0);

  const exportPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageHeight = (canvas.height * pageWidth) / canvas.width;
      const image = canvas.toDataURL("image/png");
      let position = 0;
      pdf.addImage(image, "PNG", 0, position, pageWidth, imageHeight);
      let remaining = imageHeight - pageHeight;
      while (remaining > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(image, "PNG", 0, position, pageWidth, imageHeight);
        remaining -= pageHeight;
      }
      pdf.save(`bao-cao-${period}-${period === "month" ? selectedMonth : selectedWeekDate}.pdf`);
    } catch (error) { setError(error instanceof Error ? error.message : "Không thể xuất PDF"); }
    finally { setExporting(false); }
  };

  const params = useMemo(
    () => ({
      period,
      date: period === "month" ? selectedMonth : selectedWeekDate,
      ...(departmentId ? { departmentId } : {}),
    }),
    [departmentId, period, selectedMonth, selectedWeekDate],
  );
  const periodLabel =
    period === "day"
      ? "ngày đã chọn"
      : period === "week"
        ? "tuần đã chọn"
        : "tháng đã chọn";

  const selectedDepartmentName =
    departments.find((department) => department.id === departmentId)?.name ??
    "Tất cả dự án được phép xem";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [departmentResult, reportResult] = await Promise.all([
          api.get<Array<{ id: string; name: string }>>("/admin/report-departments"),
          api.get<DepartmentReport>("/admin/department-report", { params }),
        ]);
        if (cancelled) return;
        setDepartments(departmentResult.data);
        setReport(reportResult.data);
      } catch (err) {
        if (cancelled) return;
        setReport(null);
        setError(
          err instanceof Error ? err.message : "Không thể tải báo cáo",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params, realtimeVersion]);

  useEffect(() => {
    const refresh = () => setRealtimeVersion((value) => value + 1);
    window.addEventListener("finance:proposal-change", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("finance:proposal-change", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const summary = report?.summary;
  const stats = [
    {
      label: `Tổng đề xuất (${periodLabel})`,
      value: summary?.totalProposals ?? 0,
      icon: ReceiptText,
      tint: "bg-sky-50 text-sky-600",
    },
    {
      label: "Chờ duyệt",
      value: summary?.pendingProposals ?? 0,
      icon: Clock3,
      tint: "bg-amber-50 text-amber-600",
    },
    {
      label: "Đã duyệt",
      value: summary?.approvedProposals ?? 0,
      icon: CheckCircle2,
      tint: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Chờ thanh toán",
      value: summary?.pendingPaymentProposals ?? 0,
      icon: CreditCard,
      tint: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Tổng đã duyệt",
      value: formatCurrency(summary?.totalApprovedAmount ?? 0),
      icon: Wallet,
      tint: "bg-primary-50 text-primary-600",
    },
    {
      label: "Tổng chi phí đã chi",
      value: formatCurrency(summary?.totalPaidAmount ?? 0),
      icon: BarChart3,
      tint: "bg-rose-50 text-rose-600",
    },
  ];
  const monthlyPaid =
    report?.monthlyPaid ??
    Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      amount: 0,
    }));
  const chartMax = Math.max(1, ...monthlyPaid.map((item) => item.amount));
  const chartYear = report?.periodStart
    ? new Date(report.periodStart).getFullYear()
    : new Date().getFullYear();

  return (
    <div>
      <PageHeader
        title="Báo cáo"
        description="Báo cáo theo dự án và kỳ ngày, tuần hoặc tháng"
        action={<button type="button" onClick={exportPdf} disabled={exporting || loading} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{exporting ? "Đang xuất..." : "Xuất PDF có biểu đồ"}</button>}
      />

      <div ref={reportRef} className="bg-white">

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <Card padding="sm" className="mb-6">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_auto] lg:items-end">
          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Building2 className="h-4 w-4 text-primary-600" />
              Dự án
            </span>
            <select
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
            >
              <option value="">Tất cả dự án được phép xem</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
              <CalendarDays className="h-4 w-4 text-primary-600" />
              Kỳ báo cáo
            </span>
            <div className="flex w-full rounded-lg bg-surface-muted p-1 sm:inline-flex sm:w-auto">
              {(["day", "week", "month"] as DashboardPeriod[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition sm:flex-none ${
                    period === item
                      ? "bg-white text-primary-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {item === "day"
                    ? "Theo ngày"
                    : item === "week"
                      ? "Theo tuần"
                      : "Theo tháng"}
                </button>
              ))}
            </div>
          </div>

          {period === "month" ? (
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 lg:w-auto"
            />
          ) : (
            <input
              type="date"
              value={selectedWeekDate}
              onChange={(event) => setSelectedWeekDate(event.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 lg:w-auto"
            />
          )}
        </div>
      </Card>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </Card>
      )}

      <Card className="mb-6">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-slate-800">
              <BarChart3 className="h-4 w-4 text-primary-600" />
              Chi phí đã chi theo tháng
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {selectedDepartmentName} · năm {chartYear}
            </p>
          </div>
          <div className="text-sm font-semibold text-primary-700">
            Tổng năm:{" "}
            {formatCurrency(
              monthlyPaid.reduce((total, item) => total + item.amount, 0),
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:hidden">
          {monthlyPaid.map((item) => (
            <div key={item.month} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
              <p className="text-xs font-medium text-slate-400">Tháng {item.month}</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-800">{formatCurrency(item.amount)}</p>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <div className="flex min-w-[780px] items-end gap-3 border-b border-slate-200 px-2 pb-4 pt-8">
            {monthlyPaid.map((item) => {
              const height = Math.max(
                item.amount > 0 ? 18 : 4,
                (item.amount / chartMax) * 220,
              );
              return (
                <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-[240px] w-full items-end justify-center">
                    <div
                      className="w-full max-w-10 rounded-t-lg bg-primary-600 transition-all"
                      style={{ height }}
                      title={`Tháng ${item.month}: ${formatCurrency(item.amount)}`}
                    />
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    T{item.month}
                  </div>
                  <div className="h-8 text-center text-[11px] font-semibold tabular-nums text-slate-700">
                    {item.amount > 0 ? formatCurrency(item.amount) : "0 ₫"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card padding="sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">Các đề xuất</h2>
            <p className="text-xs text-slate-400">
              {selectedDepartmentName} · {periodLabel}
            </p>
          </div>
          {loading && <span className="text-xs text-slate-400">Đang tải...</span>}
        </div>

        <div className="space-y-3 md:hidden">
          {(report?.proposals.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Chưa có đề xuất trong kỳ này</p>
          ) : report?.proposals.map((proposal) => (
            <Link key={proposal.id} href={`/proposals/${proposal.id}`} className="block rounded-xl border border-border p-3.5 active:bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 font-semibold text-slate-800">{proposal.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{proposal.code} · {proposal.proposalType.name}</p>
                </div>
                <ProposalStatusBadge status={proposal.status as never} />
              </div>
              <div className="mt-3 grid gap-1.5 border-t border-slate-100 pt-3 text-xs">
                <div className="flex justify-between gap-3"><span className="text-slate-400">Người tạo</span><span className="truncate font-medium text-slate-600">{proposal.creator.fullName}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-400">Dự án</span><span className="truncate text-slate-600">{proposal.department?.name || "—"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-400">Ngày tạo</span><span className="text-slate-600">{formatDateTime(proposal.createdAt)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-400">Số tiền</span><span className="font-semibold text-slate-800">{proposal.paymentAmount ? formatCurrency(Number(proposal.paymentAmount)) : "—"}</span></div>
              </div>
            </Link>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-3 font-medium">Mã</th>
              <th className="px-3 py-3 font-medium">Tên đề xuất</th>
              <th className="px-3 py-3 font-medium">Dự án</th>
              <th className="px-3 py-3 font-medium">Người tạo</th>
              <th className="px-3 py-3 font-medium">Ngày tạo</th>
              <th className="px-3 py-3 text-right font-medium">Số tiền</th>
              <th className="px-3 py-3 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(report?.proposals.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-400">
                  Chưa có đề xuất trong kỳ này
                </td>
              </tr>
            ) : (
              report?.proposals.map((proposal) => (
                <tr key={proposal.id} className="hover:bg-surface-muted/50">
                  <td className="px-3 py-3 text-xs text-slate-400">
                    {proposal.code}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/proposals/${proposal.id}`}
                      className="font-medium text-slate-800 hover:text-primary-600"
                    >
                      {proposal.title}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {proposal.proposalType.name}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {proposal.department?.name || "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {proposal.creator.fullName}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {formatDateTime(proposal.createdAt)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-800">
                    {proposal.paymentAmount
                      ? formatCurrency(Number(proposal.paymentAmount))
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <ProposalStatusBadge status={proposal.status as never} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </Card>
      </div>
    </div>
  );
}
