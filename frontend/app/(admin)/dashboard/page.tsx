"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileClock,
  FileText,
  Inbox,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProposalStatusBadge } from "@/components/proposals/ProposalStatusBadge";
import api, {
  getDashboardSummary,
  type DashboardPeriod,
} from "@/lib/api/client";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { useUser } from "@/lib/context/UserContext";

type RecentProposal = {
  id: string;
  code: string;
  title: string;
  status: string;
  createdAt: string;
  creator: { fullName: string };
  proposalType: { name: string };
};

// Turn "Nguyễn Văn Tuấn" into "NT" for the little avatar circles —
// keeps the lists scannable without needing real profile photos.
function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function EmptyState({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser, loading: userLoading } = useUser();
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [selectedMonth, setSelectedMonth] = useState(() =>
    toMonthInputValue(new Date()),
  );
  const [selectedWeekDate, setSelectedWeekDate] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [summary, setSummary] = useState<Awaited<
    ReturnType<typeof getDashboardSummary>
  > | null>(null);
  const [recent, setRecent] = useState<RecentProposal[]>([]);
  const [pending, setPending] = useState<RecentProposal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const dashboardParams = useMemo(
    () => ({
      period,
      date: period === "month" ? selectedMonth : selectedWeekDate,
    }),
    [period, selectedMonth, selectedWeekDate],
  );
  const periodLabel = period === "month" ? "tháng đã chọn" : "tuần đã chọn";

  useEffect(() => {
    if (userLoading) return;

    let cancelled = false;

    async function loadDashboard() {
      setError(null);

      const [summaryResult, recentResult, pendingResult] = await Promise.allSettled([
        getDashboardSummary(dashboardParams),
        api.get<RecentProposal[]>("/admin/recent-proposals", {
          params: dashboardParams,
        }),
        currentUser?.id
          ? api.get<RecentProposal[]>("/admin/pending-approvals", {
              params: { userId: currentUser.id, ...dashboardParams },
            })
          : Promise.resolve({ data: [] as RecentProposal[] }),
      ]);

      if (cancelled) return;

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value);
      } else {
        setSummary(null);
      }

      if (recentResult.status === "fulfilled") {
        // Admin không cần thấy các đề xuất còn ở dạng Nháp — chưa gửi
        // duyệt thì chưa có gì để theo dõi ở màn hình tổng quan này.
        setRecent(
          recentResult.value.data.filter(
            (p) => p.status !== "DRAFT" && p.status !== "CANCELLED",
          ),
        );
      } else {
        setRecent([]);
      }

      if (pendingResult.status === "fulfilled") {
        setPending(pendingResult.value.data);
      } else {
        setPending([]);
      }

      const failedResult = [summaryResult, recentResult, pendingResult].find(
        (result) => result.status === "rejected",
      );

      if (failedResult?.status === "rejected") {
        setError(
          failedResult.reason instanceof Error
            ? failedResult.reason.message
            : "Không thể tải dữ liệu dashboard",
        );
      }
    }

    loadDashboard().catch((err) => {
      if (!cancelled) {
        setError(
          err instanceof Error ? err.message : "Không thể tải dữ liệu dashboard",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, dashboardParams, userLoading]);

  const stats = [
    {
      label: "Chờ duyệt (toàn hệ thống)",
      value: summary?.pendingInvoices ?? "—",
      icon: FileClock,
      tint: "bg-sky-50 text-sky-600",
    },
    {
      label: "Đã duyệt tháng này",
      value: summary?.reportsGenerated ?? "—",
      icon: CheckCircle2,
      tint: "bg-success-light text-success",
    },
    {
      // Lấy trực tiếp từ độ dài danh sách "Tôi cần duyệt" bên dưới
      // để số liệu và danh sách luôn khớp nhau (tránh lệch với
      // getProposalStats() nếu 2 API tính khác logic).
      label: "Tôi cần duyệt",
      value: pending.length,
      icon: Inbox,
      tint: "bg-amber-50 text-amber-600",
      highlight: true,
    },
    {
      label: "Tổng tiền đã duyệt",
      value: summary ? formatCurrency(summary.revenue) : "—",
      icon: Wallet,
      tint: "bg-primary-50 text-primary-600",
    },
  ];

  const dashboardStats = [
    {
      label: `Chờ duyệt (${periodLabel})`,
      value: summary?.pendingInvoices ?? "—",
      icon: FileClock,
      tint: "bg-sky-50 text-sky-600",
    },
    {
      label: `Đã duyệt ${periodLabel}`,
      value: summary?.reportsGenerated ?? "—",
      icon: CheckCircle2,
      tint: "bg-success-light text-success",
    },
    {
      label: `Tôi cần duyệt (${periodLabel})`,
      value: pending.length,
      icon: Inbox,
      tint: "bg-amber-50 text-amber-600",
      highlight: true,
    },
    {
      label: `Tổng tiền đã duyệt (${periodLabel})`,
      value: summary ? formatCurrency(summary.revenue) : "—",
      icon: Wallet,
      tint: "bg-primary-50 text-primary-600",
    },
  ];

  return (
    <div>
      <PageHeader
        title={
          currentUser?.fullName
            ? `Chào ${currentUser.fullName.split(" ").pop()}`
            : "Tổng quan"
        }
        description="Toàn cảnh đề xuất thanh toán trong hệ thống"
      />

      <Card padding="sm" className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <CalendarDays className="h-4 w-4 text-primary-600" />
            Kỳ thống kê
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-lg bg-surface-muted p-1">
              {(["week", "month"] as DashboardPeriod[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    period === item
                      ? "bg-white text-primary-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {item === "week" ? "Theo tuần" : "Theo tháng"}
                </button>
              ))}
            </div>
            {period === "month" ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
              />
            ) : (
              <input
                type="date"
                value={selectedWeekDate}
                onChange={(event) => setSelectedWeekDate(event.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
              />
            )}
          </div>
        </div>
      </Card>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </Card>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((item) => (
          <Card
            key={item.label}
            padding="sm"
            className={
              item.highlight
                ? "border-amber-200 bg-amber-50/30"
                : undefined
            }
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${item.tint}`}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">
                  {item.label}
                </p>
                <p className="mt-1 truncate text-2xl font-bold text-slate-800">
                  {item.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-slate-800">
              <Inbox className="h-4 w-4 text-amber-500" />
              Tôi cần duyệt
            </h2>
            {pending.length > 0 && (
              <Link
                href="/proposals?filter=pending-me"
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Xem tất cả
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {pending.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="Không có đề xuất cần duyệt" />
          ) : (
            <ul className="space-y-1">
              {pending.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/proposals/${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-sm transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">
                        {p.title}
                      </p>
                      <p className="text-xs text-slate-400">{p.code}</p>
                    </div>
                    <ProposalStatusBadge status={p.status as never} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-slate-800">
              <Clock className="h-4 w-4 text-slate-400" />
              Đề xuất gần đây
            </h2>
            {recent.length > 0 && (
              <Link
                href="/proposals"
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Xem tất cả
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {recent.length === 0 ? (
            <EmptyState icon={FileText} text="Chưa có đề xuất nào" />
          ) : (
            <ul className="space-y-1">
              {recent.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/proposals/${p.id}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                      {initials(p.creator.fullName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {p.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {p.creator.fullName} · {formatDateTime(p.createdAt)}
                      </p>
                    </div>
                    <ProposalStatusBadge status={p.status as never} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function toDateInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function toMonthInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}
