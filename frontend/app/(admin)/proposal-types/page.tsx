"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  BadgeCheck,
  CircleOff,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  ShoppingCart,
  Tags,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  createProposalType,
  getProposalTypes,
  updateProposalType,
  type ProposalGroup,
  type ProposalType,
} from "@/lib/api/workflows";

type ProposalTypeForm = {
  code: string;
  name: string;
  group: ProposalGroup;
  isActive: boolean;
  sortOrder: string;
};

const EMPTY_FORM: ProposalTypeForm = {
  code: "",
  name: "",
  group: "FINANCE",
  isActive: true,
  sortOrder: "0",
};

const GROUP_META: Record<
  ProposalGroup,
  { label: string; description: string; icon: React.ComponentType<{ className?: string }> }
> = {
  FINANCE: {
    label: "Tài chính - Kế toán",
    description: "Các đề xuất thanh toán, tạm ứng, hoàn ứng, chi phí vận hành.",
    icon: Landmark,
  },
  PROCUREMENT: {
    label: "Mua sắm",
    description: "Các đề xuất mua hàng, thiết bị, dịch vụ hoặc vật tư.",
    icon: ShoppingCart,
  },
};

export default function ProposalTypesPage() {
  const [types, setTypes] = useState<ProposalType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProposalTypeForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState<ProposalType | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const load = () => {
    setLoading(true);
    return getProposalTypes(undefined, { includeInactive: true })
      .then(setTypes)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(
    () => ({
      total: types.length,
      active: types.filter((type) => type.isActive).length,
      finance: types.filter((type) => type.group === "FINANCE").length,
      procurement: types.filter((type) => type.group === "PROCUREMENT").length,
    }),
    [types],
  );

  const closeModal = () => {
    if (saving) return;
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const closeStatusConfirm = () => {
    if (statusSaving) return;
    setStatusTarget(null);
  };

  const openEdit = (type: ProposalType) => {
    setEditingId(type.id);
    setForm({
      code: type.code,
      name: type.name,
      group: type.group,
      isActive: type.isActive,
      sortOrder: String(type.sortOrder ?? 0),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên loại đề xuất");
      return;
    }

    const sortOrder = Number(form.sortOrder || 0);
    if (!Number.isFinite(sortOrder)) {
      toast.error("Thứ tự hiển thị không hợp lệ");
      return;
    }

    setSaving(true);
    const isEditing = Boolean(editingId);
    const toastId = toast.loading(
      isEditing ? "Đang lưu loại đề xuất..." : "Đang tạo loại đề xuất...",
    );

    try {
      const payload = {
        code: (form.code.trim() || generateProposalTypeCode(form.group, form.name)).toUpperCase(),
        name: form.name.trim(),
        group: form.group,
        isActive: form.isActive,
        sortOrder,
      };

      if (editingId) {
        await updateProposalType(editingId, payload);
      } else {
        await createProposalType(payload);
      }

      toast.success(
        isEditing ? "Đã lưu loại đề xuất" : "Đã tạo loại đề xuất",
        { id: toastId },
      );
      closeModal();
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể lưu loại đề xuất",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;

    const nextActive = !statusTarget.isActive;
    setStatusSaving(true);
    const toastId = toast.loading(
      nextActive ? "Đang bật loại đề xuất..." : "Đang tạm tắt loại đề xuất...",
    );

    try {
      await updateProposalType(statusTarget.id, { isActive: nextActive });
      toast.success(
        nextActive ? "Đã bật loại đề xuất" : "Đã tạm tắt loại đề xuất",
        { id: toastId },
      );
      setStatusTarget(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật trạng thái",
        { id: toastId },
      );
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Danh mục loại đề xuất"
        description="Quản lý tên, nhóm và trạng thái sử dụng của từng loại đề xuất"
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Tạo loại đề xuất
          </button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Tags} label="Tổng loại" value={stats.total} />
        <SummaryCard icon={BadgeCheck} label="Đang hoạt động" value={stats.active} tone="emerald" />
        <SummaryCard icon={Landmark} label="Tài chính" value={stats.finance} tone="sky" />
        <SummaryCard icon={ShoppingCart} label="Mua sắm" value={stats.procurement} tone="amber" />
      </div>

      {loading ? (
        <Card>
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
            Đang tải loại đề xuất...
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {(["FINANCE", "PROCUREMENT"] as ProposalGroup[]).map((group) => {
            const meta = GROUP_META[group];
            const Icon = meta.icon;
            const rows = types
              .filter((type) => type.group === group)
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

            return (
              <Card key={group} padding="sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-800">{meta.label}</h2>
                      <p className="mt-0.5 text-sm text-slate-500">{meta.description}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {rows.length} loại
                  </span>
                </div>

                {rows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-slate-400">
                    Chưa có loại đề xuất trong nhóm này
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rows.map((type) => (
                      <div
                        key={type.id}
                        className={`grid gap-3 rounded-2xl border px-4 py-3.5 transition sm:grid-cols-[1fr_auto] ${
                          type.isActive
                            ? "border-border bg-white hover:border-primary-200 hover:bg-primary-50/30"
                            : "border-slate-200 bg-slate-50/80"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              type.isActive
                                ? "bg-primary-50 text-primary-600"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            <Tags className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-slate-800">
                              {type.name}
                            </h3>
                            <p className="mt-0.5 text-sm text-slate-500">
                              {type.isActive
                                ? "Đang dùng khi tạo đề xuất"
                                : "Đã tạm tắt, người dùng không chọn được"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <StatusToggleButton
                            active={type.isActive}
                            onClick={() => setStatusTarget(type)}
                          />
                          <button
                            type="button"
                            onClick={() => openEdit(type)}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-slate-600 transition hover:border-primary-300 hover:text-primary-700"
                          >
                            <Pencil className="h-4 w-4" />
                            Sửa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {showForm &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeModal} />
            <div className="relative z-[100000] w-full max-w-xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    {editingId ? "Sửa loại đề xuất" : "Tạo loại đề xuất"}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Thông tin này dùng để chọn quy trình khi tạo đề xuất.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  title="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                <Label text="Tên loại">
                  <input
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    className={inputClass}
                    placeholder="VD: Đề xuất tạm ứng"
                  />
                </Label>
                <Label text="Nhóm">
                  <select
                    value={form.group}
                    onChange={(event) => setForm({ ...form, group: event.target.value as ProposalGroup })}
                    className={inputClass}
                  >
                    <option value="FINANCE">Tài chính - Kế toán</option>
                    <option value="PROCUREMENT">Mua sắm</option>
                  </select>
                </Label>
                <Label text="Thứ tự">
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
                    className={inputClass}
                  />
                </Label>
                <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-slate-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  Đang hoạt động
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {statusTarget &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={closeStatusConfirm}
            />
            <div className="relative z-[100000] w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="border-b border-border px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  {statusTarget.isActive
                    ? "Tạm tắt loại đề xuất?"
                    : "Bật loại đề xuất?"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {statusTarget.isActive
                    ? "Loại đề xuất này sẽ không còn dùng để tạo đề xuất mới."
                    : "Loại đề xuất này sẽ được bật lại để người dùng chọn khi tạo đề xuất."}
                </p>
              </div>
              <div className="px-6 py-5">
                <div className="rounded-xl border border-border bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Loại đề xuất
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {statusTarget.name}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
                <button
                  type="button"
                  disabled={statusSaving}
                  onClick={closeStatusConfirm}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={statusSaving}
                  onClick={handleToggleStatus}
                  className={`inline-flex min-w-[130px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${
                    statusTarget.isActive
                      ? "bg-slate-700 hover:bg-slate-800"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {statusSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {statusTarget.isActive ? "Tạm tắt" : "Bật lại"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30";

function generateProposalTypeCode(group: ProposalGroup, name: string) {
  const prefix = group === "FINANCE" ? "FINANCE" : "PROCUREMENT";
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return `${prefix}_${slug || "LOAI_DE_XUAT"}`;
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {text}
      {children}
    </label>
  );
}

function StatusToggleButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  const Icon = active ? BadgeCheck : CircleOff;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      <Icon className="h-4 w-4" />
      {active ? "Đang hoạt động" : "Tạm tắt"}
    </button>
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
  tone?: "primary" | "emerald" | "sky" | "amber";
}) {
  const toneClass = {
    primary: "bg-primary-50 text-primary-600",
    emerald: "bg-emerald-50 text-emerald-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
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
