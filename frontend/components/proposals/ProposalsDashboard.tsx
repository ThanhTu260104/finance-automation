"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  Inbox,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProposalStatusBadge } from "@/components/proposals/ProposalStatusBadge";
import {
  getProposalStats,
  getProposals,
  type Proposal,
  type ProposalStats,
  type ProposalStatus,
  type ProposalView,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_VIEW_TABS,
} from "@/lib/api/proposals";
import { getDepartments } from "@/lib/api/departments";
import { getUsers, type User } from "@/lib/api/users";
import { hasPermission } from "@/lib/permissions";
import { getProposalTypes } from "@/lib/api/workflows";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useUser } from "@/lib/context/UserContext";

const APPROVED_STATUSES: ProposalStatus[] = [
  "APPROVED",
  "PENDING_PAYMENT",
  "PAID",
];

const PROPOSALS_PAGE_SIZE = 10;

type ExportFilters = {
  dateFrom: string;
  dateTo: string;
  status: ProposalStatus | "";
  proposalTypeId: string;
  departmentId: string;
  creatorId: string;
  executorId: string;
  amountMin: string;
  amountMax: string;
};

type DepartmentExportSummary = {
  "Dự án": string;
  "Tổng đề xuất": number;
  "Chờ duyệt": number;
  "Đã duyệt": number;
  "Chờ thanh toán": number;
  "Đã thanh toán": number;
  "Tổng tiền đề xuất": number;
  "Tổng đã duyệt": number;
  "Tổng chi phí đã chi": number;
};

type ProposalQueryParams = Parameters<typeof getProposals>[0];

function toDateInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function firstDayOfMonth() {
  const now = new Date();
  return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
}

function parseAmount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function validateFilterRange(
  dateFrom: string,
  dateTo: string,
  amountMin?: number,
  amountMax?: number,
) {
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return "Ngày bắt đầu không được lớn hơn ngày kết thúc";
  }
  if (Number.isNaN(amountMin) || Number.isNaN(amountMax)) {
    return "Khoảng tiền không hợp lệ";
  }
  if (
    amountMin !== undefined &&
    amountMax !== undefined &&
    amountMin > amountMax
  ) {
    return "Số tiền từ không được lớn hơn số tiền đến";
  }
  return null;
}

function getExecutorNames(proposal: Proposal) {
  return proposal.participants
    .filter((participant) => participant.role === "EXECUTOR")
    .map((participant) => participant.user.fullName)
    .join(", ");
}

function getRejectReason(proposal: Proposal) {
  return (
    proposal.approvalSteps.find(
      (step) => step.status === "REJECTED" && step.comment,
    )?.comment ?? ""
  );
}

function getAmount(proposal: Proposal) {
  return proposal.paymentAmount ? Number(proposal.paymentAmount) : 0;
}

function optionName<T extends { id: string; name: string }>(
  items: T[],
  id: string,
  fallback = "Tất cả",
) {
  return items.find((item) => item.id === id)?.name ?? fallback;
}

export function ProposalsDashboard({
  initialView = "all",
  initialStatus = "",
}: {
  initialView?: ProposalView;
  initialStatus?: ProposalStatus | "";
}) {
  const { currentUser, loading: userLoading } = useUser();
  const canCreateProposal = hasPermission(
    currentUser?.role?.permissions,
    "proposal.create",
  );
  const canViewAllProposals = hasPermission(
    currentUser?.role?.permissions,
    "proposal.view_all",
  );
  const [view, setView] = useState<ProposalView>(initialView);
  const [stats, setStats] = useState<ProposalStats | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "">(initialStatus);
  const [typeFilter, setTypeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("");
  const [executorFilter, setExecutorFilter] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [types, setTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const listRequestIdRef = useRef(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState<ExportFilters>({
    dateFrom: firstDayOfMonth(),
    dateTo: toDateInputValue(new Date()),
    status: "",
    proposalTypeId: "",
    departmentId: "",
    creatorId: "",
    executorId: "",
    amountMin: "",
    amountMax: "",
  });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading || !currentUser?.id) return;

    let cancelled = false;

    Promise.all([
      getProposalTypes(),
      getDepartments(),
      getUsers(),
      getProposalStats(),
    ])
      .then(([proposalTypes, departmentRows, userRows, statRows]) => {
        if (cancelled) return;
        const assignedDepartmentIds = new Set(
          (
            currentUser.departments?.length
              ? currentUser.departments
              : currentUser.department
                ? [currentUser.department]
                : []
          ).map((department) => department.id),
        );
        const visibleDepartments = canViewAllProposals
          ? departmentRows
          : departmentRows.filter((department) =>
              assignedDepartmentIds.has(department.id),
            );
        const visibleUsers = canViewAllProposals
          ? userRows
          : userRows.filter((user) => {
              const userDepartments = user.departments?.length
                ? user.departments
                : user.department
                  ? [user.department]
                  : [];
              return userDepartments.some((department) =>
                assignedDepartmentIds.has(department.id),
              );
            });
        setTypes(proposalTypes);
        setDepartments(visibleDepartments);
        setUsers(visibleUsers);
        setStats(statRows);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setStats(null);
        setError(
          err instanceof Error ? err.message : "Không thể tải dữ liệu thống kê",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [canViewAllProposals, currentUser, userLoading]);

  const effectiveDisplayedStatus =
    statusFilter === "DRAFT" || statusFilter === "CANCELLED"
      ? ""
      : statusFilter;

  const buildQueryParams = useCallback(
    ({
      sourceView = view,
      searchValue = search,
      status = statusFilter,
      proposalTypeId = typeFilter,
      departmentId = departmentFilter,
      from = dateFrom,
      to = dateTo,
      creatorId = creatorFilter,
      executorId = executorFilter,
      min = amountMin,
      max = amountMax,
    }: {
      sourceView?: ProposalView;
      searchValue?: string;
      status?: ProposalStatus | "";
      proposalTypeId?: string;
      departmentId?: string;
      from?: string;
      to?: string;
      creatorId?: string;
      executorId?: string;
      min?: string;
      max?: string;
    } = {}): ProposalQueryParams => {
      const amountMinValue = parseAmount(min);
      const amountMaxValue = parseAmount(max);
      const normalizedStatus =
        sourceView === "draft" ||
        sourceView === "cancelled" ||
        status === "DRAFT" ||
        status === "CANCELLED"
          ? undefined
          : status || undefined;

      return {
        view: sourceView,
        search: searchValue.trim() || undefined,
        status: normalizedStatus,
        proposalTypeId: proposalTypeId || undefined,
        departmentId: departmentId || undefined,
        creatorId: creatorId || undefined,
        executorId: executorId || undefined,
        dateFrom: from || undefined,
        dateTo: to || undefined,
        amountMin: amountMinValue,
        amountMax: amountMaxValue,
      };
    },
    [
      amountMax,
      amountMin,
      creatorFilter,
      dateFrom,
      dateTo,
      departmentFilter,
      executorFilter,
      search,
      statusFilter,
      typeFilter,
      view,
    ],
  );

  const loadProposals = useCallback(async () => {
    const requestId = ++listRequestIdRef.current;
    if (userLoading) return;
    if (!currentUser?.id) {
      setProposals([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    const amountMinValue = parseAmount(amountMin);
    const amountMaxValue = parseAmount(amountMax);
    const validationError = validateFilterRange(
      dateFrom,
      dateTo,
      amountMinValue,
      amountMaxValue,
    );

    if (validationError) {
      setError(validationError);
      setProposals([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const list = await getProposals({
        ...buildQueryParams(),
        page: 1,
        limit: PROPOSALS_PAGE_SIZE,
      });
      if (requestId !== listRequestIdRef.current) return;
      setProposals(list);
      setPage(1);
      setHasMore(list.length === PROPOSALS_PAGE_SIZE);
      setError(null);
    } catch (err) {
      if (requestId !== listRequestIdRef.current) return;
      setProposals([]);
      setHasMore(false);
      setError(
        err instanceof Error ? err.message : "Không thể tải danh sách đề xuất",
      );
    } finally {
      setLoading(false);
    }
  }, [
    amountMax,
    amountMin,
    buildQueryParams,
    currentUser?.id,
    dateFrom,
    dateTo,
    userLoading,
  ]);

  useEffect(() => {
    setHasMore(false);
    const timer = setTimeout(loadProposals, 250);
    return () => clearTimeout(timer);
  }, [loadProposals]);

  useEffect(() => {
    const refresh = () => void loadProposals();
    window.addEventListener("finance:proposal-change", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("finance:proposal-change", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadProposals]);

  const loadMoreProposals = useCallback(async () => {
    if (
      loading ||
      loadingMoreRef.current ||
      !hasMore ||
      !currentUser?.id
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const requestId = listRequestIdRef.current;
    const nextPage = page + 1;

    try {
      const list = await getProposals({
        ...buildQueryParams(),
        page: nextPage,
        limit: PROPOSALS_PAGE_SIZE,
      });
      if (requestId !== listRequestIdRef.current) return;

      setProposals((current) => {
        const existingIds = new Set(current.map((proposal) => proposal.id));
        return [
          ...current,
          ...list.filter((proposal) => !existingIds.has(proposal.id)),
        ];
      });
      setPage(nextPage);
      setHasMore(list.length === PROPOSALS_PAGE_SIZE);
      setError(null);
    } catch (err) {
      if (requestId !== listRequestIdRef.current) return;
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải thêm danh sách đề xuất",
      );
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [buildQueryParams, currentUser?.id, hasMore, loading, page]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMoreProposals();
      },
      { rootMargin: "300px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreProposals]);

  const displayedStatusFilter: ProposalStatus | "" =
    view === "draft"
      ? "DRAFT"
      : view === "cancelled"
        ? "CANCELLED"
        : effectiveDisplayedStatus;

  const statusOptions = useMemo(
    () =>
      (Object.entries(PROPOSAL_STATUS_LABELS) as [ProposalStatus, string][]).filter(
        ([value]) =>
          view === "draft" ||
          view === "cancelled" ||
          (value !== "DRAFT" && value !== "CANCELLED"),
      ),
    [view],
  );

  const hasActiveFilters = Boolean(
    search ||
      effectiveDisplayedStatus ||
      typeFilter ||
      departmentFilter ||
      dateFrom ||
      dateTo ||
      creatorFilter ||
      executorFilter ||
      amountMin ||
      amountMax,
  );

  const activeFilterCount = [
    search,
    effectiveDisplayedStatus,
    typeFilter,
    departmentFilter,
    dateFrom,
    dateTo,
    creatorFilter,
    executorFilter,
    amountMin,
    amountMax,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setTypeFilter("");
    setDepartmentFilter("");
    setDateFrom("");
    setDateTo("");
    setCreatorFilter("");
    setExecutorFilter("");
    setAmountMin("");
    setAmountMax("");
  };

  const openExportModal = () => {
    setExportError(null);
    setExportFilters({
      dateFrom: dateFrom || firstDayOfMonth(),
      dateTo: dateTo || toDateInputValue(new Date()),
      status: effectiveDisplayedStatus,
      proposalTypeId: typeFilter,
      departmentId: departmentFilter,
      creatorId: creatorFilter,
      executorId: executorFilter,
      amountMin,
      amountMax,
    });
    setExportOpen(true);
  };

  const statCards = useMemo(
    () =>
      stats
        ? [
            { label: "Tôi đề xuất", value: stats.mine, icon: FileText, tone: "primary" as const },
            { label: "Đang chờ duyệt", value: stats.pending, icon: Clock, tone: "amber" as const },
            { label: "Chờ thanh toán", value: stats.pendingPayment, icon: CreditCard, tone: "sky" as const },
            { label: "Đã thanh toán", value: stats.paid, icon: CheckCircle2, tone: "emerald" as const },
            { label: "Đã từ chối", value: stats.rejected, icon: XCircle, tone: "rose" as const },
            { label: "Tôi cần duyệt", value: stats.needApproval, icon: UserCheck, tone: "sky" as const },
          ]
        : [],
    [stats],
  );

  const handleExportExcel = async () => {
    const amountMinValue = parseAmount(exportFilters.amountMin);
    const amountMaxValue = parseAmount(exportFilters.amountMax);
    const validationError = validateFilterRange(
      exportFilters.dateFrom,
      exportFilters.dateTo,
      amountMinValue,
      amountMaxValue,
    );

    if (validationError) {
      setExportError(validationError);
      return;
    }

    const exportView =
      exportFilters.status === "DRAFT"
        ? "draft"
        : exportFilters.status === "CANCELLED"
          ? "cancelled"
          : view;

    setExporting(true);
    setExportError(null);
    try {
      const rows = await getProposals(
        buildQueryParams({
          sourceView: exportView,
          searchValue: "",
          status: exportFilters.status,
          proposalTypeId: exportFilters.proposalTypeId,
          departmentId: exportFilters.departmentId,
          from: exportFilters.dateFrom,
          to: exportFilters.dateTo,
          creatorId: exportFilters.creatorId,
          executorId: exportFilters.executorId,
          min: exportFilters.amountMin,
          max: exportFilters.amountMax,
        }),
      );

      const totalAmount = rows.reduce((total, proposal) => total + getAmount(proposal), 0);
      const totalApprovedAmount = rows
        .filter((proposal) => APPROVED_STATUSES.includes(proposal.status))
        .reduce((total, proposal) => total + getAmount(proposal), 0);
      const totalPaidAmount = rows
        .filter((proposal) => proposal.status === "PAID")
        .reduce((total, proposal) => total + getAmount(proposal), 0);

      const summaryRows = [
        { "Chỉ tiêu": "Từ ngày", "Giá trị": exportFilters.dateFrom || "Tất cả" },
        { "Chỉ tiêu": "Đến ngày", "Giá trị": exportFilters.dateTo || "Tất cả" },
        {
          "Chỉ tiêu": "Dự án",
          "Giá trị": optionName(departments, exportFilters.departmentId),
        },
        {
          "Chỉ tiêu": "Trạng thái",
          "Giá trị": exportFilters.status
            ? PROPOSAL_STATUS_LABELS[exportFilters.status]
            : "Tất cả",
        },
        {
          "Chỉ tiêu": "Loại đề xuất",
          "Giá trị": optionName(types, exportFilters.proposalTypeId),
        },
        {
          "Chỉ tiêu": "Người tạo",
          "Giá trị":
            users.find((user) => user.id === exportFilters.creatorId)?.fullName ??
            "Tất cả",
        },
        {
          "Chỉ tiêu": "Người thực hiện",
          "Giá trị":
            users.find((user) => user.id === exportFilters.executorId)?.fullName ??
            "Tất cả",
        },
        { "Chỉ tiêu": "Tổng đề xuất", "Giá trị": rows.length },
        {
          "Chỉ tiêu": "Chờ duyệt",
          "Giá trị": rows.filter((proposal) => proposal.status === "PENDING").length,
        },
        {
          "Chỉ tiêu": "Đã duyệt",
          "Giá trị": rows.filter((proposal) => APPROVED_STATUSES.includes(proposal.status)).length,
        },
        {
          "Chỉ tiêu": "Chờ thanh toán",
          "Giá trị": rows.filter((proposal) => proposal.status === "PENDING_PAYMENT").length,
        },
        { "Chỉ tiêu": "Tổng tiền đề xuất", "Giá trị": totalAmount },
        { "Chỉ tiêu": "Tổng đã duyệt", "Giá trị": totalApprovedAmount },
        { "Chỉ tiêu": "Tổng chi phí đã chi", "Giá trị": totalPaidAmount },
        { "Chỉ tiêu": "Thời điểm xuất", "Giá trị": formatDateTime(new Date()) },
      ];

      const detailRows = rows.map((proposal, index) => ({
        STT: index + 1,
        "Mã đề xuất": proposal.code,
        "Tên đề xuất": proposal.title,
        "Người đề xuất": proposal.creator.fullName,
        Email: proposal.creator.email,
        "Người thực hiện": getExecutorNames(proposal),
        "Dự án": proposal.department?.name ?? "",
        "Loại đề xuất": proposal.proposalType.name,
        "Ngày đề xuất": formatDateTime(proposal.createdAt),
        "Thời gian duyệt cuối": formatDateTime(
          proposal.approvalSteps
            .filter((step) => step.status === "APPROVED" && step.actedAt)
            .map((step) => step.actedAt as string)
            .sort()
            .at(-1) ?? null,
        ),
        "Thời gian thực hiện thanh toán": formatDateTime(proposal.paidAt),
        "Số tiền": getAmount(proposal),
        "Trạng thái": PROPOSAL_STATUS_LABELS[proposal.status],
        "Lý do từ chối": getRejectReason(proposal),
        "Lý do hủy": proposal.cancellationReason ?? "",
      }));

      const departmentRows = Array.from(
        rows.reduce(
          (map, proposal) => {
            const departmentName = proposal.department?.name ?? "Chưa có dự án";
            const current =
              map.get(departmentName) ??
              {
                "Dự án": departmentName,
                "Tổng đề xuất": 0,
                "Chờ duyệt": 0,
                "Đã duyệt": 0,
                "Chờ thanh toán": 0,
                "Đã thanh toán": 0,
                "Tổng tiền đề xuất": 0,
                "Tổng đã duyệt": 0,
                "Tổng chi phí đã chi": 0,
              };

            current["Tổng đề xuất"] += 1;
            current["Tổng tiền đề xuất"] += getAmount(proposal);
            if (proposal.status === "PENDING") current["Chờ duyệt"] += 1;
            if (APPROVED_STATUSES.includes(proposal.status)) {
              current["Đã duyệt"] += 1;
              current["Tổng đã duyệt"] += getAmount(proposal);
            }
            if (proposal.status === "PENDING_PAYMENT") current["Chờ thanh toán"] += 1;
            if (proposal.status === "PAID") {
              current["Đã thanh toán"] += 1;
              current["Tổng chi phí đã chi"] += getAmount(proposal);
            }

            map.set(departmentName, current);
            return map;
          },
          new Map<string, DepartmentExportSummary>(),
        ).values(),
      );

      const workbook = XLSX.utils.book_new();
      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      const detailSheet = XLSX.utils.json_to_sheet(detailRows);
      const departmentSheet = XLSX.utils.json_to_sheet(departmentRows);

      summarySheet["!cols"] = [{ wch: 28 }, { wch: 32 }];
      detailSheet["!cols"] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 34 },
        { wch: 24 },
        { wch: 28 },
        { wch: 28 },
        { wch: 22 },
        { wch: 26 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 32 },
        { wch: 32 },
      ];
      departmentSheet["!cols"] = [
        { wch: 28 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 16 },
        { wch: 14 },
        { wch: 18 },
        { wch: 18 },
        { wch: 20 },
      ];

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Tong quan");
      XLSX.utils.book_append_sheet(workbook, detailSheet, "Chi tiet de xuat");
      XLSX.utils.book_append_sheet(workbook, departmentSheet, "Chi phi phong ban");
      XLSX.writeFile(
        workbook,
        `bao-cao-de-xuat_${exportFilters.dateFrom || "all"}_${exportFilters.dateTo || "all"}.xlsx`,
      );
      setExportOpen(false);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Không thể xuất Excel",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Quản lý đề xuất thanh toán"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openExportModal}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-surface-muted"
            >
              <Download className="h-4 w-4" />
              Xuất Excel
            </button>
            {canCreateProposal ? (
              <Link
                href="/proposals/new"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
                Thêm đề xuất
              </Link>
            ) : null}
          </div>
        }
      />

      {statCards.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      )}

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </Card>
      )}

      <Card className="mb-4" padding="sm">
        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-surface-muted p-1">
          {PROPOSAL_VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setView(tab.id);
                if (tab.id === "draft" || tab.id === "cancelled") {
                  setStatusFilter("");
                }
              }}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                view === tab.id
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                title="Xóa từ khóa tìm kiếm"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <input
              className="w-full rounded-xl border border-border py-2.5 pl-9 pr-9 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
              placeholder="Tìm tên đề xuất, mã..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-surface-muted"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Bộ lọc nâng cao
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700">
                {activeFilterCount}
              </span>
            )}
            {advancedOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {advancedOpen && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <CompactSelect
                label="Trạng thái"
                value={displayedStatusFilter}
                disabled={view === "draft" || view === "cancelled"}
                onChange={(value) => setStatusFilter(value as ProposalStatus | "")}
              >
                <option value="">Tất cả trạng thái</option>
                {statusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </CompactSelect>

              <CompactSelect
                label="Loại đề xuất"
                value={typeFilter}
                onChange={setTypeFilter}
              >
                <option value="">Tất cả loại đề xuất</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </CompactSelect>

              <CompactSelect
                label="Dự án"
                value={departmentFilter}
                onChange={setDepartmentFilter}
              >
                <option value="">Tất cả dự án</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </CompactSelect>

              <CompactSelect
                label="Người tạo"
                value={creatorFilter}
                onChange={setCreatorFilter}
              >
                <option value="">Tất cả người tạo</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </CompactSelect>

              <CompactSelect
                label="Người thực hiện"
                value={executorFilter}
                onChange={setExecutorFilter}
              >
                <option value="">Tất cả người thực hiện</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </CompactSelect>

              <CompactInput
                label="Từ ngày"
                type="date"
                value={dateFrom}
                onChange={setDateFrom}
              />
              <CompactInput
                label="Đến ngày"
                type="date"
                value={dateTo}
                onChange={setDateTo}
              />
              <div className="grid grid-cols-2 gap-2">
                <CompactInput
                  label="Tiền từ"
                  type="number"
                  min="0"
                  value={amountMin}
                  onChange={setAmountMin}
                />
                <CompactInput
                  label="Tiền đến"
                  type="number"
                  min="0"
                  value={amountMax}
                  onChange={setAmountMax}
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-primary-600"
              >
                <X className="h-3.5 w-3.5" /> Xóa tất cả bộ lọc
              </button>
            )}
          </div>
        )}
      </Card>

      <div className="space-y-3 md:hidden" aria-busy={loading}>
        {loading ? (
          <Card><div className="flex items-center justify-center gap-2 py-5 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải đề xuất...</div></Card>
        ) : proposals.length === 0 ? (
          <Card><p className="py-5 text-center text-sm text-slate-500">Không có đề xuất phù hợp</p></Card>
        ) : proposals.map((proposal) => (
          <Link key={proposal.id} href={`/proposals/${proposal.id}`} className="block rounded-2xl border border-border bg-white p-4 shadow-sm active:bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{proposal.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">{proposal.code}</p>
              </div>
              <ProposalStatusBadge status={proposal.status} />
            </div>
            <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between gap-3"><span className="text-slate-500">Người đề xuất</span><span className="truncate text-right font-medium text-slate-700">{proposal.creator.fullName}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Dự án</span><span className="truncate text-right text-slate-700">{proposal.department?.name || '-'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-500">Số tiền</span><span className="font-semibold text-slate-900">{proposal.paymentAmount ? formatCurrency(Number(proposal.paymentAmount)) : '—'}</span></div>
            </div>
          </Link>
        ))}
      </div>

      <Card padding="sm" className="hidden overflow-x-auto md:block" aria-busy={loading}>
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Tên đề xuất</th>
              <th className="px-4 py-3 font-medium">Người đề xuất</th>
              <th className="px-4 py-3 font-medium">Dự án</th>
              <th className="px-4 py-3 font-medium">Loại</th>
              <th className="px-4 py-3 font-medium">Ngày đề xuất</th>
              <th className="px-4 py-3 text-right font-medium">Số tiền</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                      Đang tải danh sách đề xuất...
                    </div>
                    <div className="grid w-full gap-2 animate-pulse">
                      <div className="h-3 rounded-full bg-slate-100" />
                      <div className="h-3 w-5/6 rounded-full bg-slate-100" />
                      <div className="h-3 w-2/3 rounded-full bg-slate-100" />
                    </div>
                  </div>
                </td>
              </tr>
            ) : proposals.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  <Inbox className="mx-auto h-8 w-8 text-slate-300" />
                  {hasActiveFilters
                    ? "Không tìm thấy đề xuất phù hợp"
                    : "Chưa có đề xuất nào"}
                </td>
              </tr>
            ) : (
              proposals.map((proposal, index) => (
                <tr key={proposal.id} className="transition-colors hover:bg-surface-muted/50">
                  <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/proposals/${proposal.id}`}
                      className="font-medium text-slate-800 hover:text-primary-600"
                    >
                      {proposal.title}
                    </Link>
                    <p className="text-xs text-slate-400">{proposal.code}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <p
                      className="max-w-[180px] truncate font-medium"
                      title={proposal.creator.fullName}
                    >
                      {proposal.creator.fullName}
                    </p>
                    <p
                      className="max-w-[180px] truncate text-xs text-slate-400"
                      title={proposal.creator.email}
                    >
                      {proposal.creator.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span
                      className="block max-w-[220px] truncate"
                      title={proposal.department?.name ?? undefined}
                    >
                      {proposal.department?.name || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {proposal.proposalType.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(proposal.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                    {proposal.paymentAmount
                      ? formatCurrency(Number(proposal.paymentAmount))
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ProposalStatusBadge status={proposal.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <div
        ref={loadMoreSentinelRef}
        className="flex min-h-16 items-center justify-center py-3 text-sm text-slate-500"
      >
        {loadingMore ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
            Đang tải thêm đề xuất...
          </span>
        ) : !loading && proposals.length > 0 && !hasMore ? (
          <span>Đã hiển thị tất cả đề xuất</span>
        ) : null}
      </div>

      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-800">
                  Xuất Excel đề xuất
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  File gồm 3 sheet: Tổng quan, Chi tiết đề xuất, Chi phí dự án.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExportOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-surface-muted hover:text-slate-600"
                title="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <CompactInput
                label="Từ ngày"
                type="date"
                value={exportFilters.dateFrom}
                onChange={(value) =>
                  setExportFilters((prev) => ({ ...prev, dateFrom: value }))
                }
              />
              <CompactInput
                label="Đến ngày"
                type="date"
                value={exportFilters.dateTo}
                onChange={(value) =>
                  setExportFilters((prev) => ({ ...prev, dateTo: value }))
                }
              />
              <CompactSelect
                label="Dự án"
                value={exportFilters.departmentId}
                onChange={(value) =>
                  setExportFilters((prev) => ({ ...prev, departmentId: value }))
                }
              >
                <option value="">Tất cả dự án</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </CompactSelect>
              <CompactSelect
                label="Trạng thái"
                value={exportFilters.status}
                onChange={(value) =>
                  setExportFilters((prev) => ({
                    ...prev,
                    status: value as ProposalStatus | "",
                  }))
                }
              >
                <option value="">Tất cả trạng thái</option>
                {(Object.entries(PROPOSAL_STATUS_LABELS) as [ProposalStatus, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </CompactSelect>
              <CompactSelect
                label="Loại đề xuất"
                value={exportFilters.proposalTypeId}
                onChange={(value) =>
                  setExportFilters((prev) => ({
                    ...prev,
                    proposalTypeId: value,
                  }))
                }
              >
                <option value="">Tất cả loại đề xuất</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </CompactSelect>
              <CompactSelect
                label="Người tạo"
                value={exportFilters.creatorId}
                onChange={(value) =>
                  setExportFilters((prev) => ({ ...prev, creatorId: value }))
                }
              >
                <option value="">Tất cả người tạo</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </CompactSelect>
              <CompactSelect
                label="Người thực hiện"
                value={exportFilters.executorId}
                onChange={(value) =>
                  setExportFilters((prev) => ({ ...prev, executorId: value }))
                }
              >
                <option value="">Tất cả người thực hiện</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </CompactSelect>
              <div className="grid grid-cols-2 gap-2">
                <CompactInput
                  label="Tiền từ"
                  type="number"
                  min="0"
                  value={exportFilters.amountMin}
                  onChange={(value) =>
                    setExportFilters((prev) => ({ ...prev, amountMin: value }))
                  }
                />
                <CompactInput
                  label="Tiền đến"
                  type="number"
                  min="0"
                  value={exportFilters.amountMax}
                  onChange={(value) =>
                    setExportFilters((prev) => ({ ...prev, amountMax: value }))
                  }
                />
              </div>
            </div>

            {exportError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {exportError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setExportOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-surface-muted"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Xuất file
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompactInput({
  label,
  value,
  onChange,
  type = "text",
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500">
        {label}
      </span>
      <input
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
      />
    </label>
  );
}

function CompactSelect({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500">
        {label}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        {children}
      </select>
    </label>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "amber" | "emerald" | "rose" | "sky";
}) {
  const toneClass = {
    primary: "bg-primary-50 text-primary-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    sky: "bg-sky-50 text-sky-600",
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3.5">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold leading-tight text-slate-800">{value}</p>
        <p className="truncate text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}
