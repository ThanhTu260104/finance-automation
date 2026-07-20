"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Building2, Plus, Pencil, Search, X, AlertCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { createDepartment, getDepartments, updateDepartment, type Department } from "@/lib/api/departments";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => getDepartments().then(setDepartments);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, query]);

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setError(null);
    setShowForm(true);
  };

  const openEdit = (d: Department) => {
    setEditingId(d.id);
    setName(d.name);
    setError(null);
    setShowForm(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowForm(false);
    setEditingId(null);
    setName("");
    setError(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên phòng ban");
      setError("Vui lòng nhập tên phòng ban");
      return;
    }
    setError(null);
    setSaving(true);
    const isEditing = Boolean(editingId);
    const toastId = toast.loading(
      isEditing ? "Đang lưu phòng ban..." : "Đang tạo phòng ban...",
    );
    try {
      if (editingId) {
        await updateDepartment(editingId, { name: name.trim() });
      } else {
        await createDepartment({ name: name.trim() });
      }
      toast.success(isEditing ? "Đã lưu phòng ban" : "Đã tạo phòng ban", {
        id: toastId,
      });
      setShowForm(false);
      setEditingId(null);
      setName("");
      await load();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Lưu phòng ban thất bại, vui lòng thử lại";
      toast.error(message, { id: toastId });
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Danh mục phòng ban"
        description="Quản lý phòng ban"
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Tạo phòng ban
          </button>
        }
      />

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên phòng ban..."
          className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
      </div>

      {/* Modal */}
      {showForm &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeModal} />

            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  {editingId ? "Sửa phòng ban" : "Tạo phòng ban"}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  title="Đóng modal"
                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-6 py-5">
                <label className="block text-sm font-medium text-slate-700">
                  Tên phòng ban
                  <div className="relative mt-1.5">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      autoFocus
                      placeholder="VD: Phòng Kế toán"
                      className={[
                        "w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500",
                        error ? "border-red-400" : "border-border",
                      ].join(" ")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    />
                  </div>
                  {error && (
                    <span className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {error}
                    </span>
                  )}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex min-w-[96px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? "Đang lưu..." : editingId ? "Lưu" : "Tạo"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Table */}
      <Card padding="sm" className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            Đang tải phòng ban...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Tên phòng ban</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d) => (
                <tr key={d.id} className="transition-colors hover:bg-surface-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-slate-800">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(d)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-primary-300 hover:text-primary-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-center text-sm text-slate-400">
                    {departments.length === 0 ? "Chưa có phòng ban nào" : "Không tìm thấy phòng ban phù hợp"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
