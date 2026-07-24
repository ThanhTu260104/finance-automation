"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  CircleOff,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getUsers, userAvatarFullUrl } from "@/lib/api/users";
import {
  createWorkflow,
  getProposalTypes,
  getWorkflows,
  updateWorkflow,
  type ApprovalWorkflow,
  type ProposalType,
  type WorkflowParticipant,
} from "@/lib/api/workflows";

type UserOption = { id: string; fullName: string; email: string; avatarUrl?: string | null };

type WorkflowForm = {
  name: string;
  proposalTypeId: string;
  approver1: string;
  approver2: string;
  watcherIds: string[];
  notifyIds: string[];
  executorIds: string[];
  isSequential: boolean;
  isActive: boolean;
};

type BulkWorkflowForm = {
  proposalTypeIds: string[];
  updateApprovers: boolean;
  updateWatchers: boolean;
  updateNotify: boolean;
  updateExecutors: boolean;
  approver1: string;
  approver2: string;
  watcherIds: string[];
  notifyIds: string[];
  executorIds: string[];
};

const EMPTY_FORM: WorkflowForm = {
  name: "",
  proposalTypeId: "",
  approver1: "",
  approver2: "",
  watcherIds: [],
  notifyIds: [],
  executorIds: [],
  isSequential: true,
  isActive: true,
};

const EMPTY_BULK_FORM: BulkWorkflowForm = {
  proposalTypeIds: [],
  updateApprovers: false,
  updateWatchers: false,
  updateNotify: false,
  updateExecutors: true,
  approver1: "",
  approver2: "",
  watcherIds: [],
  notifyIds: [],
  executorIds: [],
};

export default function SettingsPage() {
  const [types, setTypes] = useState<ProposalType[]>([]);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [form, setForm] = useState<WorkflowForm>(EMPTY_FORM);
  const [bulkForm, setBulkForm] = useState<BulkWorkflowForm>(EMPTY_BULK_FORM);
  const [touched, setTouched] = useState(false);
  const [bulkTouched, setBulkTouched] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const loadAll = () => {
    setLoading(true);
    Promise.all([getWorkflows(), getProposalTypes(), getUsers()])
      .then(([workflowRows, typeRows, userRows]) => {
        setWorkflows(workflowRows);
        setTypes(typeRows);
        setUsers(userRows);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Không thể tải cài đặt");
      })
      .finally(() => setLoading(false));
  };

  const reloadWorkflows = () => {
    setWorkflowsLoading(true);
    return getWorkflows()
      .then(setWorkflows)
      .finally(() => setWorkflowsLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const typeById = useMemo(
    () => new Map(types.map((type) => [type.id, type])),
    [types],
  );

  const filteredWorkflows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workflows.filter((workflow) => {
      const proposalTypeName =
        workflow.proposalType?.name ??
        typeById.get(workflow.proposalTypeId)?.name ??
        "";
      const matchesSearch =
        !q ||
        workflow.name.toLowerCase().includes(q) ||
        proposalTypeName.toLowerCase().includes(q) ||
        workflow.steps.some((step) =>
          step.approver?.fullName.toLowerCase().includes(q),
        ) ||
        workflow.participants?.some((participant) =>
          participant.user?.fullName.toLowerCase().includes(q),
        );
      const matchesType = !typeFilter || workflow.proposalTypeId === typeFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && workflow.isActive) ||
        (statusFilter === "inactive" && !workflow.isActive);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [search, statusFilter, typeById, typeFilter, workflows]);

  const stats = useMemo(
    () => ({
      total: workflows.length,
      active: workflows.filter((workflow) => workflow.isActive).length,
      inactive: workflows.filter((workflow) => !workflow.isActive).length,
      withExecutor: workflows.filter((workflow) =>
        workflow.participants?.some((participant) => participant.role === "EXECUTOR"),
      ).length,
    }),
    [workflows],
  );

  const nameError =
    touched && form.name.trim().length === 0 ? "Vui lòng nhập tên quy trình" : null;
  const typeError =
    touched && !form.proposalTypeId ? "Vui lòng chọn loại đề xuất" : null;
  const approverError =
    touched && !form.approver1 ? "Vui lòng chọn người duyệt cấp 1" : null;

  const closeModal = () => {
    if (saving) return;
    setModalMode(null);
    setEditingWorkflow(null);
    setForm(EMPTY_FORM);
    setTouched(false);
    setSaveError(null);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingWorkflow(null);
    setTouched(false);
    setSaveError(null);
    setModalMode("create");
  };

  const openQuickEdit = (workflow: ApprovalWorkflow) => {
    setEditingWorkflow(workflow);
    setForm(workflowToForm(workflow));
    setTouched(false);
    setSaveError(null);
    setModalMode("edit");
  };

  const openBulkEdit = () => {
    setBulkForm({
      ...EMPTY_BULK_FORM,
      proposalTypeIds: typeFilter ? [typeFilter] : [],
    });
    setBulkTouched(false);
    setBulkError(null);
    setBulkModalOpen(true);
  };

  const closeBulkModal = () => {
    if (bulkSaving) return;
    setBulkModalOpen(false);
    setBulkForm(EMPTY_BULK_FORM);
    setBulkTouched(false);
    setBulkError(null);
  };

  const buildSteps = () => [
    {
      stepOrder: 1,
      label: "Người duyệt cấp 1",
      approverId: form.approver1,
    },
    ...(form.approver2
      ? [
          {
            stepOrder: 2,
            label: "Người duyệt cấp cao",
            approverId: form.approver2,
            isSeniorApprover: true,
          },
        ]
      : []),
  ];

  const handleSaveWorkflow = async () => {
    setTouched(true);
    setSaveError(null);

    if (form.name.trim().length === 0) {
      toast.error("Vui lòng nhập tên quy trình");
      return;
    }
    if (!form.proposalTypeId) {
      toast.error("Vui lòng chọn loại đề xuất");
      return;
    }
    if (!form.approver1) {
      toast.error("Vui lòng chọn người duyệt cấp 1");
      return;
    }

    setSaving(true);
    const isEditing = modalMode === "edit" && editingWorkflow;
    const toastId = toast.loading(
      isEditing ? "Đang lưu quy trình..." : "Đang tạo quy trình...",
    );

    try {
      if (isEditing) {
        await updateWorkflow(editingWorkflow.id, {
          name: form.name.trim(),
          isSequential: form.isSequential,
          isActive: form.isActive,
          steps: buildSteps(),
          watcherIds: form.watcherIds,
          notifyIds: form.notifyIds,
          executorIds: form.executorIds,
        });
      } else {
        await createWorkflow({
          name: form.name.trim(),
          proposalTypeId: form.proposalTypeId,
          isSequential: form.isSequential,
          steps: buildSteps(),
          watcherIds: form.watcherIds,
          notifyIds: form.notifyIds,
          executorIds: form.executorIds,
        });
      }

      await reloadWorkflows();
      toast.success(isEditing ? "Đã lưu quy trình" : "Đã tạo quy trình", {
        id: toastId,
      });
      closeModal();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Lưu quy trình thất bại, vui lòng thử lại";
      toast.error(message, { id: toastId });
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpdate = async () => {
    setBulkTouched(true);
    setBulkError(null);

    const hasAnyUpdate =
      bulkForm.updateApprovers ||
      bulkForm.updateWatchers ||
      bulkForm.updateNotify ||
      bulkForm.updateExecutors;

    if (!hasAnyUpdate) {
      const message = "Vui lòng chọn ít nhất một phần cần chỉnh";
      setBulkError(message);
      toast.error(message);
      return;
    }

    if (bulkForm.updateApprovers && !bulkForm.approver1) {
      const message = "Vui lòng chọn người duyệt cấp 1";
      setBulkError(message);
      toast.error(message);
      return;
    }

    const targetWorkflows = workflows.filter((workflow) =>
      bulkForm.proposalTypeIds.length
        ? bulkForm.proposalTypeIds.includes(workflow.proposalTypeId)
        : true,
    );

    if (targetWorkflows.length === 0) {
      const message = "Không có quy trình nào trong phạm vi đã chọn";
      setBulkError(message);
      toast.error(message);
      return;
    }

    setBulkSaving(true);
    const toastId = toast.loading(
      `Đang cập nhật ${targetWorkflows.length} quy trình...`,
    );

    try {
      await Promise.all(
        targetWorkflows.map((workflow) => {
          const current = workflowToForm(workflow);
          return updateWorkflow(workflow.id, {
            ...(bulkForm.updateApprovers
              ? {
                  steps: [
                    {
                      stepOrder: 1,
                      label: "Người duyệt cấp 1",
                      approverId: bulkForm.approver1,
                    },
                    ...(bulkForm.approver2
                      ? [
                          {
                            stepOrder: 2,
                            label: "Người duyệt cấp cao",
                            approverId: bulkForm.approver2,
                            isSeniorApprover: true,
                          },
                        ]
                      : []),
                  ],
                }
              : {}),
            ...(bulkForm.updateWatchers
              ? { watcherIds: bulkForm.watcherIds }
              : { watcherIds: current.watcherIds }),
            ...(bulkForm.updateNotify
              ? { notifyIds: bulkForm.notifyIds }
              : { notifyIds: current.notifyIds }),
            ...(bulkForm.updateExecutors
              ? { executorIds: bulkForm.executorIds }
              : { executorIds: current.executorIds }),
          });
        }),
      );

      await reloadWorkflows();
      toast.success(`Đã cập nhật ${targetWorkflows.length} quy trình`, {
        id: toastId,
      });
      closeBulkModal();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Chỉnh nhanh hàng loạt thất bại, vui lòng thử lại";
      setBulkError(message);
      toast.error(message, { id: toastId });
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Cài đặt quy trình phê duyệt"
        description="Theo dõi đầy đủ quy trình, bước duyệt và người liên quan ngay tại danh sách"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openBulkEdit}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-surface-muted"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Chỉnh nhanh hàng loạt
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Thêm quy trình
            </button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Settings2} label="Tổng quy trình" value={stats.total} />
        <SummaryCard icon={BadgeCheck} label="Đang hoạt động" value={stats.active} tone="emerald" />
        <SummaryCard icon={CircleOff} label="Tạm tắt" value={stats.inactive} tone="slate" />
        <SummaryCard icon={Wallet} label="Có người thực hiện" value={stats.withExecutor} tone="sky" />
      </div>

      <Card padding="sm" className="mb-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên quy trình, loại đề xuất, người duyệt..."
              className="w-full rounded-xl border border-border py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-border px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
            title="Lọc theo loại đề xuất"
          >
            <option value="">Tất cả loại đề xuất</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | "active" | "inactive")
            }
            className="rounded-xl border border-border px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
            title="Lọc theo trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm tắt</option>
          </select>
        </div>
      </Card>

      {loading ? (
        <Card>
          <LoadingRow label="Đang tải quy trình phê duyệt..." />
        </Card>
      ) : filteredWorkflows.length === 0 ? (
        <Card>
          <div className="py-14 text-center text-sm text-slate-400">
            Không tìm thấy quy trình phù hợp
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              proposalType={workflow.proposalType ?? typeById.get(workflow.proposalTypeId)}
              onEdit={() => openQuickEdit(workflow)}
              loading={workflowsLoading}
            />
          ))}
        </div>
      )}

      {modalMode && (
        <WorkflowModal
          mode={modalMode}
          form={form}
          users={users}
          types={types}
          nameError={nameError}
          typeError={typeError}
          approverError={approverError}
          saveError={saveError}
          saving={saving}
          editingWorkflow={editingWorkflow}
          onClose={closeModal}
          onSave={handleSaveWorkflow}
          onChange={setForm}
        />
      )}

      {bulkModalOpen && (
        <BulkWorkflowModal
          form={bulkForm}
          users={users}
          types={types}
          workflows={workflows}
          touched={bulkTouched}
          error={bulkError}
          saving={bulkSaving}
          onClose={closeBulkModal}
          onSave={handleBulkUpdate}
          onChange={setBulkForm}
        />
      )}
    </div>
  );
}

function workflowToForm(workflow: ApprovalWorkflow): WorkflowForm {
  return {
    name: workflow.name,
    proposalTypeId: workflow.proposalTypeId,
    approver1:
      workflow.steps.find((step) => step.stepOrder === 1)?.approverId ??
      workflow.steps[0]?.approverId ??
      "",
    approver2:
      workflow.steps.find((step) => step.isSeniorApprover)?.approverId ??
      workflow.steps.find((step) => step.stepOrder === 2)?.approverId ??
      "",
    watcherIds: participantIds(workflow, "WATCHER"),
    notifyIds: participantIds(workflow, "NOTIFY"),
    executorIds: participantIds(workflow, "EXECUTOR"),
    isSequential: workflow.isSequential,
    isActive: workflow.isActive,
  };
}

function participantIds(
  workflow: ApprovalWorkflow,
  role: WorkflowParticipant["role"],
) {
  return (
    workflow.participants
      ?.filter((participant) => participant.role === role)
      .map((participant) => participant.userId ?? participant.user?.id ?? "")
      .filter(Boolean) ?? []
  );
}

function participantNames(
  workflow: ApprovalWorkflow,
  role: WorkflowParticipant["role"],
) {
  return (
    workflow.participants
      ?.filter((participant) => participant.role === role)
      .map((participant) => participant.user?.fullName ?? "Không rõ")
      .filter(Boolean) ?? []
  );
}

function WorkflowCard({
  workflow,
  proposalType,
  onEdit,
  loading,
}: {
  workflow: ApprovalWorkflow;
  proposalType?: ProposalType;
  onEdit: () => void;
  loading?: boolean;
}) {
  const approverNames = [...workflow.steps]
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((step) => step.approver?.fullName ?? "Chưa chọn người duyệt");
  const executorNames = participantNames(workflow, "EXECUTOR");
  const watcherNames = participantNames(workflow, "WATCHER");
  const notifyNames = participantNames(workflow, "NOTIFY");

  return (
    <Card padding="sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800">
              {workflow.name}
            </h2>
            <StatusBadge active={workflow.isActive} />
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {workflow.isSequential ? "Duyệt tuần tự" : "Duyệt song song"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Loại đề xuất:{" "}
            <span className="font-semibold text-slate-700">
              {proposalType?.name ?? "Chưa xác định"}
            </span>
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2 2xl:grid-cols-4">
            <WorkflowPeopleSummary
              label="Duyệt"
              names={approverNames}
              emptyText="Chưa có bước duyệt"
              tone="slate"
            />
            <WorkflowPeopleSummary
              label="Thực hiện"
              names={executorNames}
              emptyText="Chưa chọn"
              tone="primary"
            />
            <WorkflowPeopleSummary
              label="Theo dõi"
              names={watcherNames}
              emptyText="Chưa chọn"
              tone="slate"
            />
            <WorkflowPeopleSummary
              label="Thông báo"
              names={notifyNames}
              emptyText="Chưa chọn"
              tone="sky"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary-200 px-3 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 disabled:opacity-60"
          >
            <Pencil className="h-4 w-4" />
            Sửa
          </button>
        </div>
      </div>
    </Card>
  );
}

function WorkflowPeopleSummary({
  label,
  names,
  emptyText,
  tone,
}: {
  label: string;
  names: string[];
  emptyText: string;
  tone: "primary" | "sky" | "slate";
}) {
  const visibleNames = names.slice(0, 2);
  const hiddenCount = names.length - visibleNames.length;
  const toneClass = {
    primary: "bg-primary-50 text-primary-700",
    sky: "bg-sky-50 text-sky-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <div className={`min-w-0 rounded-xl px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <div className="mt-1 flex min-h-6 flex-wrap gap-1.5">
        {visibleNames.length === 0 ? (
          <span className="truncate text-xs font-semibold opacity-70">
            {emptyText}
          </span>
        ) : (
          <>
            {visibleNames.map((name, index) => (
              <span
                key={`${label}-${name}-${index}`}
                className="max-w-full truncate rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold"
                title={name}
              >
                {name}
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold">
                +{hiddenCount}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BulkWorkflowModal({
  form,
  users,
  types,
  workflows,
  touched,
  error,
  saving,
  onClose,
  onSave,
  onChange,
}: {
  form: BulkWorkflowForm;
  users: UserOption[];
  types: ProposalType[];
  workflows: ApprovalWorkflow[];
  touched: boolean;
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (form: BulkWorkflowForm) => void;
}) {
  const targetCount = workflows.filter((workflow) =>
    form.proposalTypeIds.length
      ? form.proposalTypeIds.includes(workflow.proposalTypeId)
      : true,
  ).length;
  const hasAnyUpdate =
    form.updateApprovers ||
    form.updateWatchers ||
    form.updateNotify ||
    form.updateExecutors;
  const approverError =
    touched && form.updateApprovers && !form.approver1
      ? "Vui lòng chọn người duyệt cấp 1"
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Chỉnh nhanh hàng loạt
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Chọn phạm vi rồi cập nhật một lượt cho các quy trình cùng loại đề xuất.
            </p>
          </div>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-4">
            <SectionHeading
              title="Phạm vi áp dụng"
              description="Chọn toàn bộ quy trình hoặc chỉ các quy trình thuộc một hay nhiều loại đề xuất."
            />
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <MultiProposalTypePicker
                types={types}
                selected={form.proposalTypeIds}
                onChange={(ids) => onChange({ ...form, proposalTypeIds: ids })}
              />
              <div className="rounded-xl bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700">
                Sẽ cập nhật {targetCount} quy trình
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading
              title="Chọn phần cần chỉnh"
              description="Chỉ những phần được bật mới được ghi đè vào các quy trình trong phạm vi."
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <BulkToggle
                checked={form.updateApprovers}
                label="Cấp phê duyệt"
                onChange={(checked) => onChange({ ...form, updateApprovers: checked })}
              />
              <BulkToggle
                checked={form.updateExecutors}
                label="Người thực hiện"
                onChange={(checked) => onChange({ ...form, updateExecutors: checked })}
              />
              <BulkToggle
                checked={form.updateWatchers}
                label="Người theo dõi"
                onChange={(checked) => onChange({ ...form, updateWatchers: checked })}
              />
              <BulkToggle
                checked={form.updateNotify}
                label="Người nhận thông báo"
                onChange={(checked) => onChange({ ...form, updateNotify: checked })}
              />
            </div>
            {touched && !hasAnyUpdate && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Vui lòng chọn ít nhất một phần cần chỉnh
              </p>
            )}
          </section>

          {form.updateApprovers && (
            <section className="space-y-4">
              <SectionHeading title="Cấp phê duyệt mới" />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Người duyệt cấp 1" error={approverError} required>
                  <UserSelect users={users} value={form.approver1} onChange={(value) => onChange({ ...form, approver1: value })} placeholder="Chọn người duyệt..." hasError={!!approverError} />
                </Field>
                <Field label="Người duyệt cấp cao">
                  <UserSelect users={users} value={form.approver2} onChange={(value) => onChange({ ...form, approver2: value })} placeholder="Không có" allowEmpty />
                </Field>
              </div>
            </section>
          )}

          {(form.updateExecutors || form.updateWatchers || form.updateNotify) && (
            <section className="space-y-4">
              <SectionHeading
                title="Người liên quan mới"
                description="Nếu bật một phần mà để trống danh sách, phần đó sẽ được xóa khỏi các quy trình được chọn."
              />
              <div className="grid gap-4 md:grid-cols-2">
                {form.updateExecutors && (
                  <div className="md:col-span-2">
                    <MultiUserPicker
                      label="Người thực hiện"
                      users={users}
                      selected={form.executorIds}
                      onChange={(ids) => onChange({ ...form, executorIds: ids })}
                    />
                  </div>
                )}
                {form.updateWatchers && (
                  <MultiUserPicker
                    label="Người theo dõi"
                    users={users}
                    selected={form.watcherIds}
                    onChange={(ids) => onChange({ ...form, watcherIds: ids })}
                  />
                )}
                {form.updateNotify && (
                  <MultiUserPicker
                    label="Người nhận thông báo"
                    users={users}
                    selected={form.notifyIds}
                    onChange={(ids) => onChange({ ...form, notifyIds: ids })}
                  />
                )}
              </div>
            </section>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border px-6 py-4">
          <div className="min-h-5 text-sm text-red-600">
            {error && (
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                {error}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || targetCount === 0}
              className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Đang cập nhật..." : "Cập nhật hàng loạt"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-surface-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-border"
      />
      {label}
    </label>
  );
}

function WorkflowModal({
  mode,
  form,
  users,
  types,
  nameError,
  typeError,
  approverError,
  saveError,
  saving,
  editingWorkflow,
  onClose,
  onSave,
  onChange,
}: {
  mode: "create" | "edit";
  form: WorkflowForm;
  users: UserOption[];
  types: ProposalType[];
  nameError: string | null;
  typeError: string | null;
  approverError: string | null;
  saveError: string | null;
  saving: boolean;
  editingWorkflow: ApprovalWorkflow | null;
  onClose: () => void;
  onSave: () => void;
  onChange: (form: WorkflowForm) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              {mode === "edit" ? "Sửa nhanh quy trình" : "Thêm quy trình duyệt"}
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {mode === "edit"
                ? "Cập nhật bước duyệt và người liên quan ngay tại trang cài đặt."
                : "Tạo quy trình mới và gắn với một loại đề xuất."}
            </p>
          </div>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-4">
            <SectionHeading title="Thông tin chung" />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tên quy trình" error={nameError} required>
                <input
                  value={form.name}
                  onChange={(event) => onChange({ ...form, name: event.target.value })}
                  className={inputClass(!!nameError)}
                  placeholder="VD: Duyệt chi phí công tác"
                />
              </Field>
              <Field label="Loại đề xuất" error={typeError} required>
                <select
                  value={form.proposalTypeId}
                  disabled={mode === "edit"}
                  onChange={(event) =>
                    onChange({ ...form, proposalTypeId: event.target.value })
                  }
                  className={inputClass(!!typeError)}
                >
                  <option value="">Chọn loại đề xuất...</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isSequential}
                  onChange={(event) =>
                    onChange({ ...form, isSequential: event.target.checked })
                  }
                  className="h-4 w-4 rounded border-border"
                />
                Duyệt tuần tự
              </label>
              {mode === "edit" && (
                <label className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      onChange({ ...form, isActive: event.target.checked })
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  Đang hoạt động
                </label>
              )}
              {editingWorkflow && (
                <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
                  <Clock3 className="h-4 w-4" />
                  {editingWorkflow.steps.length} bước duyệt hiện tại
                </span>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading
              title="Cấp duyệt"
              description="Cấp cao là tuỳ chọn; nếu có, người này có thể duyệt để chuyển sang thực hiện nhanh."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Người duyệt cấp 1" error={approverError} required>
                <UserSelect users={users} value={form.approver1} onChange={(value) => onChange({ ...form, approver1: value })} placeholder="Chọn người duyệt..." hasError={!!approverError} />
              </Field>
              <Field label="Người duyệt cấp cao">
                <UserSelect users={users} value={form.approver2} onChange={(value) => onChange({ ...form, approver2: value })} placeholder="Không có" allowEmpty />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading
              title="Người liên quan"
              description="Người thực hiện sẽ là người nhận nhắc thanh toán/thực hiện sau khi đề xuất được duyệt."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <MultiUserPicker
                label="Người theo dõi"
                users={users}
                selected={form.watcherIds}
                onChange={(ids) => onChange({ ...form, watcherIds: ids })}
              />
              <MultiUserPicker
                label="Người nhận thông báo"
                users={users}
                selected={form.notifyIds}
                onChange={(ids) => onChange({ ...form, notifyIds: ids })}
              />
              <div className="md:col-span-2">
                <MultiUserPicker
                  label="Người thực hiện"
                  users={users}
                  selected={form.executorIds}
                  onChange={(ids) => onChange({ ...form, executorIds: ids })}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border px-6 py-4">
          <div className="min-h-5 text-sm text-red-600">
            {saveError && (
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                {saveError}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Đang lưu..." : "Lưu quy trình"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return [
    "mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm transition",
    "focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500",
    "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
    hasError ? "border-red-400" : "border-border",
  ].join(" ");
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
      {label}
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
    </div>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
      {children}
      {error && (
        <span className="mt-1 flex items-center gap-1 text-xs font-normal text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </span>
      )}
    </label>
  );
}

function UserAvatar({ user, size = "md" }: { user: UserOption; size?: "sm" | "md" }) {
  const url = userAvatarFullUrl(user.avatarUrl);
  const initials = user.fullName.trim().split(/\s+/).slice(-2).map((part) => part[0]?.toUpperCase()).join("") || "?";
  const sizeClass = size === "sm" ? "h-6 w-6 text-[9px]" : "h-9 w-9 text-xs";
  return url ? (
    <img src={url} alt="" className={`${sizeClass} shrink-0 rounded-full border border-slate-200 object-cover`} />
  ) : (
    <span className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-primary-50 font-bold text-primary-700`}>{initials}</span>
  );
}

function UserSelect({
  users,
  value,
  onChange,
  placeholder,
  allowEmpty = false,
  hasError = false,
}: {
  users: UserOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  allowEmpty?: boolean;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedUser = users.find((user) => user.id === value);
  const filtered = users.filter((user) => {
    const term = query.trim().toLowerCase();
    return !term || user.fullName.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
  });

  return (
    <div className="relative mt-1.5" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex min-h-11 w-full items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-left transition focus:outline-none focus:ring-2 focus:ring-primary-500/30 ${hasError ? "border-red-400" : "border-border"}`}
      >
        {selectedUser ? <UserAvatar user={selectedUser} /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Users className="h-4 w-4" /></span>}
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm ${selectedUser ? "font-medium text-slate-800" : "text-slate-400"}`}>{selectedUser?.fullName ?? placeholder}</span>
          {selectedUser && <span className="block truncate text-xs font-normal text-slate-400">{selectedUser.email}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-[100010] mt-1 w-full overflow-hidden rounded-xl border border-border bg-white shadow-xl">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên hoặc email..." className="w-full rounded-lg border border-border py-2 pl-8 pr-2 text-sm outline-none focus:border-primary-500" />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {allowEmpty && (
              <button type="button" onClick={() => { onChange(""); setOpen(false); setQuery(""); }} className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50">{placeholder}</button>
            )}
            {filtered.map((user) => (
              <button key={user.id} type="button" onClick={() => { onChange(user.id); setOpen(false); setQuery(""); }} className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-surface-muted ${user.id === value ? "bg-primary-50" : ""}`}>
                <UserAvatar user={user} />
                <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{user.fullName}</span><span className="block truncate text-xs text-slate-400">{user.email}</span></span>
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-5 text-center text-sm text-slate-400">Không tìm thấy tài khoản</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function MultiUserPicker({
  label,
  users,
  selected,
  onChange,
}: {
  label: string;
  users: UserOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => user.fullName.toLowerCase().includes(q));
  }, [query, users]);

  const selectedUsers = users.filter((user) => selected.includes(user.id));
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Users className="h-3.5 w-3.5" />
          {selected.length} đã chọn
        </span>
      </div>

      {selectedUsers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedUsers.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700"
            >
              <UserAvatar user={user} size="sm" />
              {user.fullName}
              <button
                type="button"
                onClick={() => toggle(user.id)}
                className="rounded-full hover:bg-primary-100"
                aria-label={`Bỏ ${user.fullName}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm theo tên..."
          className="w-full rounded-xl border border-border py-2 pl-8 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
        />
      </div>

      <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-border">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-slate-400">
            Không tìm thấy người dùng phù hợp
          </p>
        ) : (
          filtered.map((user) => (
            <label
              key={user.id}
              className="flex cursor-pointer items-center gap-2.5 border-b border-border px-3 py-2 text-sm last:border-b-0 hover:bg-surface-muted/60"
            >
              <input
                type="checkbox"
                checked={selected.includes(user.id)}
                onChange={() => toggle(user.id)}
                className="h-4 w-4 rounded border-border"
              />
              <UserAvatar user={user} />
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-700">{user.fullName}</span>
                <span className="block truncate text-xs text-slate-400">{user.email}</span>
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

function MultiProposalTypePicker({
  types,
  selected,
  onChange,
}: {
  types: ProposalType[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return types;
    return types.filter((type) => type.name.toLowerCase().includes(q));
  }, [query, types]);

  const selectedTypes = types.filter((type) => selected.includes(type.id));
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Loại đề xuất áp dụng</span>
        <span className="text-xs text-slate-400">
          {selected.length ? `${selected.length} đã chọn` : "Tất cả"}
        </span>
      </div>

      {selectedTypes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedTypes.map((type) => (
            <span
              key={type.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700"
            >
              {type.name}
              <button
                type="button"
                onClick={() => toggle(type.id)}
                className="rounded-full hover:bg-primary-100"
                aria-label={`Bỏ ${type.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm loại đề xuất..."
          className="w-full rounded-xl border border-border py-2 pl-8 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
        />
      </div>

      <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-border">
        {types.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-slate-400">
            Chưa có loại đề xuất để chọn
          </p>
        ) : (
          <>
            <label className="flex cursor-pointer items-center gap-2.5 border-b border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted/60">
              <input
                type="checkbox"
                checked={selected.length === 0}
                onChange={() => onChange([])}
                className="h-4 w-4 rounded border-border"
              />
              Tất cả quy trình
            </label>
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-slate-400">
                Không tìm thấy loại đề xuất phù hợp
              </p>
            ) : (
              filtered.map((type) => (
                <label
                  key={type.id}
                  className="flex cursor-pointer items-center gap-2.5 border-b border-border px-3 py-2 text-sm last:border-b-0 hover:bg-surface-muted/60"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(type.id)}
                    onChange={() => toggle(type.id)}
                    className="h-4 w-4 rounded border-border"
                  />
                  {type.name}
                </label>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Hoạt động
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
      <CircleOff className="h-3.5 w-3.5" />
      Tạm tắt
    </span>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "primary" | "emerald" | "sky" | "slate";
}) {
  const toneClass = {
    primary: "bg-primary-50 text-primary-600",
    emerald: "bg-emerald-50 text-emerald-600",
    sky: "bg-sky-50 text-sky-600",
    slate: "bg-slate-100 text-slate-600",
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3.5">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xl font-semibold leading-tight text-slate-800">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}
