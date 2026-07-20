"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getWorkflows, updateWorkflow, type ApprovalWorkflow } from "@/lib/api/workflows";
import { getUsers } from "@/lib/api/users";
import { Loader2, Search, X, AlertCircle, Users } from "lucide-react";

type UserOption = { id: string; fullName: string };

type FormState = {
  name: string;
  approver1: string;
  approver2: string;
  watcherIds: string[];
  notifyIds: string[];
  executorIds: string[];
};

export default function EditWorkflowPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [workflow, setWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    approver1: "",
    approver2: "",
    watcherIds: [],
    notifyIds: [],
    executorIds: [],
  });

  useEffect(() => {
    Promise.all([getWorkflows(), getUsers()])
      .then(([workflows, allUsers]) => {
        const current = workflows.find((w) => w.id === params.id);
        if (!current) throw new Error("Workflow không tồn tại");

        setWorkflow(current);
        setUsers(allUsers);

        setForm({
          name: current.name,
          approver1: current.steps.find((s) => s.stepOrder === 1)?.approverId || "",
          approver2:
            current.steps.find((s) => s.isSeniorApprover)?.approverId ||
            current.steps.find((s) => s.stepOrder === 2)?.approverId ||
            "",
          // Quan trọng: map theo userId, không phải p.id của participant
          watcherIds: current.participants?.filter((p) => p.role === "WATCHER").map((p) => p.userId ?? "") || [],
          notifyIds: current.participants?.filter((p) => p.role === "NOTIFY").map((p) => p.userId ?? "") || [],
          executorIds: current.participants?.filter((p) => p.role === "EXECUTOR").map((p) => p.userId ?? "") || [],
        });
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Không thể tải workflow"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const nameError = touched && form.name.trim().length === 0 ? "Vui lòng nhập tên quy trình" : null;
  const approver1Error = touched && !form.approver1 ? "Vui lòng chọn người duyệt cấp 1" : null;
  const isValid = form.name.trim().length > 0 && !!form.approver1;

  const handleUpdate = async () => {
    setTouched(true);
    setSaveError(null);
    if (form.name.trim().length === 0) {
      toast.error("Vui lòng nhập tên quy trình");
      return;
    }
    if (!form.approver1) {
      toast.error("Vui lòng chọn người duyệt cấp 1");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Đang lưu quy trình...");
    const steps = [
      { stepOrder: 1, label: "Người duyệt cấp 1", approverId: form.approver1 },
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

    try {
      await updateWorkflow(params.id, {
        name: form.name.trim(),
        steps,
        watcherIds: form.watcherIds,
        notifyIds: form.notifyIds,
        executorIds: form.executorIds,
      });
      toast.success("Đã lưu quy trình duyệt", { id: toastId });
      router.push("/settings");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Lưu thay đổi thất bại, vui lòng thử lại";
      toast.error(message, { id: toastId });
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Chỉnh sửa quy trình" />
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang tải dữ liệu quy trình...
          </div>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Chỉnh sửa quy trình" />
        <Card>
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="text-sm font-medium text-foreground">{loadError}</p>
            <button
              onClick={() => router.push("/settings")}
              className="mt-1 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Quay lại danh sách
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader title={`Chỉnh sửa: ${workflow?.name}`} />

      {/* Thông tin chung */}
      <Card>
        <SectionHeading title="Thông tin chung" description="Tên hiển thị của quy trình duyệt." />
        <div className="mt-4">
          <Field label="Tên quy trình" error={nameError}>
            <input
              className={inputClass(!!nameError)}
              value={form.name}
              placeholder="VD: Duyệt chi phí công tác"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
        </div>
      </Card>

      {/* Cấp duyệt */}
      <Card>
        <SectionHeading title="Cấp duyệt" description="Thứ tự người phê duyệt cho quy trình này." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Người duyệt cấp 1" error={approver1Error} required>
            <select
              className={inputClass(!!approver1Error)}
              value={form.approver1}
              onChange={(e) => setForm({ ...form, approver1: e.target.value })}
            >
              <option value="">Chọn người duyệt...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Người duyệt cấp cao"
            hint="Tuỳ chọn — chỉ cần người này duyệt là đề xuất được thực hiện, không cần chờ cấp 1."
          >
            <select
              className={inputClass(false)}
              value={form.approver2}
              onChange={(e) => setForm({ ...form, approver2: e.target.value })}
            >
              <option value="">Không có</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      {/* Người liên quan */}
      <Card>
        <SectionHeading title="Người liên quan" description="Những người theo dõi, nhận thông báo, hoặc thực hiện sau khi duyệt." />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <MultiUserPicker
            label="Người theo dõi"
            users={users}
            selected={form.watcherIds}
            onChange={(ids) => setForm({ ...form, watcherIds: ids })}
          />
          <MultiUserPicker
            label="Người nhận thông báo"
            users={users}
            selected={form.notifyIds}
            onChange={(ids) => setForm({ ...form, notifyIds: ids })}
          />
          <div className="md:col-span-2">
            <MultiUserPicker
              label="Người thực hiện"
              users={users}
              selected={form.executorIds}
              onChange={(ids) => setForm({ ...form, executorIds: ids })}
            />
          </div>
        </div>
      </Card>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-h-5 text-sm text-red-600">
            {saveError && (
              <span className="flex items-center gap-1.5"> 
                <AlertCircle className="h-4 w-4" />
                {saveError}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/settings")}
              disabled={saving}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              onClick={handleUpdate}
              disabled={saving}
              className="flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Shared building blocks ---------- */

function inputClass(hasError: boolean) {
  return [
    "w-full rounded-xl border px-3 py-2.5 text-sm mt-1.5 transition-colors",
    "focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500",
    hasError ? "border-red-400" : "border-border",
  ].join(" ");
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
      {children}
      {error ? (
        <span className="mt-1 flex items-center gap-1 text-xs font-normal text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-xs font-normal text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

/**
 * Searchable checkbox list — replaces the native <select multiple>,
 * which requires ctrl/cmd-click and gives no visibility into who's selected.
 */
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
    return users.filter((u) => u.fullName.toLowerCase().includes(q));
  }, [users, query]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const selectedUsers = users.filter((u) => selected.includes(u.id));

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {selected.length} đã chọn
        </span>
      </div>

      {/* Selected chips */}
      {selectedUsers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedUsers.map((u) => (
            <span
              key={u.id}
              className="flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700"
            >
              {u.fullName}
              <button
                type="button"
                onClick={() => toggle(u.id)}
                aria-label={`Bỏ ${u.fullName}`}
                className="rounded-full hover:bg-primary-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên..."
          className="w-full rounded-xl border border-border py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
        />
      </div>

      {/* List */}
      <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-border">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">Không tìm thấy người dùng phù hợp</p>
        ) : (
          filtered.map((u) => {
            const checked = selected.includes(u.id);
            return (
              <label
                key={u.id}
                className="flex cursor-pointer items-center gap-2.5 border-b border-border px-3 py-2 text-sm last:border-b-0 hover:bg-muted"
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(u.id)} className="h-4 w-4 rounded border-border" />
                {u.fullName}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
