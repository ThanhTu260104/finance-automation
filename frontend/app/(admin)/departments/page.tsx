"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Building2, Plus, Pencil, Search, X, AlertCircle, Loader2, LockKeyhole, LockOpen, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { createDepartment, deleteDepartment, getDepartments, updateDepartment, type Department } from "@/lib/api/departments";
import { ExcelImportDialog } from "@/components/ui/ExcelImportDialog";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"active" | "locked">("active");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const importExcel = async (file: File) => {
    setImporting(true);
    const toastId = toast.loading("Đang import dự án...");
    try {
      const workbook = XLSX.read(await file.arrayBuffer());
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
      const existing = new Set(departments.map((item) => item.name.trim().toLowerCase()));
      let success = 0, skipped = 0;
      for (const row of rows) {
        const name = String(row["Tên dự án"] || row["Tên"] || row["name"] || "").trim();
        if (!name || existing.has(name.toLowerCase())) { skipped++; continue; }
        const created = await createDepartment({ name });
        const status = String(row["Trạng thái"] || row["Status"] || "Hoạt động").trim().toLowerCase();
        if (["đã khóa", "khóa", "inactive", "locked", "0"].includes(status)) {
          await updateDepartment(created.id, { isActive: false });
        }
        existing.add(name.toLowerCase()); success++;
      }
      await load();
      toast.success(`Import xong: ${success} thành công, ${skipped} bỏ qua`, { id: toastId });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Import thất bại", { id: toastId }); }
    finally { setImporting(false); }
  };

  const load = () => getDepartments({ includeInactive: true }).then(setDepartments);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return departments.filter((d) => d.isActive === (statusTab === "active") && (!q || d.name.toLowerCase().includes(q)));
  }, [departments, query, statusTab]);

  const toggleStatus = async (department: Department) => {
    const nextActive = !department.isActive;
    if (!window.confirm(`${nextActive ? "Mở khóa" : "Khóa"} dự án “${department.name}”?`)) return;
    setProcessingId(department.id);
    try {
      await updateDepartment(department.id, { isActive: nextActive });
      toast.success(nextActive ? "Đã mở khóa dự án" : "Đã khóa dự án");
      await load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Không thể cập nhật dự án"); }
    finally { setProcessingId(null); }
  };

  const remove = async (department: Department) => {
    if (!window.confirm(`Xóa vĩnh viễn dự án “${department.name}”? Thao tác này không thể hoàn tác.`)) return;
    setProcessingId(department.id);
    try { await deleteDepartment(department.id); toast.success("Đã xóa dự án"); await load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Không thể xóa dự án"); }
    finally { setProcessingId(null); }
  };

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
      toast.error("Vui lòng nhập tên dự án");
      setError("Vui lòng nhập tên dự án");
      return;
    }
    setError(null);
    setSaving(true);
    const isEditing = Boolean(editingId);
    const toastId = toast.loading(
      isEditing ? "Đang lưu dự án..." : "Đang tạo dự án...",
    );
    try {
      if (editingId) {
        await updateDepartment(editingId, { name: name.trim() });
      } else {
        await createDepartment({ name: name.trim() });
      }
      toast.success(isEditing ? "Đã lưu dự án" : "Đã tạo dự án", {
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
          : "Lưu dự án thất bại, vui lòng thử lại";
      toast.error(message, { id: toastId });
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Danh mục dự án"
        description="Quản lý danh mục dự án"
        action={<div className="flex flex-wrap gap-2">
          <ExcelImportDialog
            title="dự án"
            templateFileName="mau-import-du-an-phong-ban.xlsx"
            templateRow={{ "Tên dự án": "Dự án mẫu", "Trạng thái": "Hoạt động" }}
            onImport={importExcel}
          />
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Tạo dự án
          </button>
        </div>}
      />

      <div className="mb-4 inline-flex rounded-xl bg-surface-muted p-1">
        <button onClick={() => setStatusTab("active")} className={`rounded-lg px-4 py-2 text-sm font-medium ${statusTab === "active" ? "bg-white text-primary-700 shadow-sm" : "text-slate-500"}`}>Đang hoạt động ({departments.filter((d) => d.isActive).length})</button>
        <button onClick={() => setStatusTab("locked")} className={`rounded-lg px-4 py-2 text-sm font-medium ${statusTab === "locked" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>Đã khóa ({departments.filter((d) => !d.isActive).length})</button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên dự án..."
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
              <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
                <h3 className="text-lg font-semibold text-slate-800">
                  {editingId ? "Sửa dự án" : "Tạo dự án"}
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

              <div className="space-y-4 px-4 py-5 sm:px-6">
                <label className="block text-sm font-medium text-slate-700">
                  Tên dự án
                  <div className="relative mt-1.5">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      autoFocus
                      placeholder="VD: Dự án Văn phòng"
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

              <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-4 sm:gap-3 sm:px-6">
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
            Đang tải dự án...
          </div>
        ) : (
          <>
          <div className="space-y-3 p-2 sm:hidden">
            {filtered.map((d) => (
              <article key={d.id} className="rounded-xl border border-border bg-white p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><Building2 className="h-4 w-4" /></div>
                  <span className="min-w-0 flex-1 break-words font-semibold text-slate-800">{d.name}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <button onClick={() => openEdit(d)} disabled={processingId === d.id} className="inline-flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-2 text-xs font-medium text-slate-600"><Pencil className="h-3.5 w-3.5" />Sửa</button>
                  <button onClick={() => toggleStatus(d)} disabled={processingId === d.id} className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-200 px-2 py-2 text-xs font-medium text-amber-700">{d.isActive ? <LockKeyhole className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}{d.isActive ? "Khóa" : "Mở"}</button>
                  <button onClick={() => remove(d)} disabled={processingId === d.id} className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 px-2 py-2 text-xs font-medium text-red-600"><Trash2 className="h-3.5 w-3.5" />Xóa</button>
                </div>
              </article>
            ))}
            {filtered.length === 0 && <div className="py-8 text-center text-sm text-slate-400">Không có dự án phù hợp</div>}
          </div>
          <table className="hidden w-full text-sm sm:table">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Tên dự án</th>
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
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button onClick={() => openEdit(d)} disabled={processingId === d.id} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-primary-300 hover:text-primary-600 disabled:opacity-50"><Pencil className="h-3.5 w-3.5" />Sửa</button>
                      <button onClick={() => toggleStatus(d)} disabled={processingId === d.id} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50">{d.isActive ? <LockKeyhole className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}{d.isActive ? "Khóa" : "Mở khóa"}</button>
                      <button onClick={() => remove(d)} disabled={processingId === d.id} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-center text-sm text-slate-400">
                    {departments.length === 0 ? "Chưa có dự án nào" : statusTab === "active" ? "Không có dự án đang hoạt động phù hợp" : "Không có dự án đã khóa phù hợp"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </>
        )}
      </Card>
    </div>
  );
}
