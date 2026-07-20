"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Plus, Pencil, Search, X, AlertCircle, Loader2, Shield } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { createRole, getRoles, updateRole, type Role } from "@/lib/api/roles";
import { useUser } from "@/lib/context/UserContext";
import {
  defaultPermissionsForRole,
  summarizePermissions,
  type AppPermission,
} from "@/lib/permissions";

export default function RolesPage() {
  const { refreshUsers } = useUser();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    permissions: [] as AppPermission[],
    sortOrder: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    return getRoles()
      .then((data) => {
        setRoles(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setRoles([]);
      });
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q)
    );
  }, [roles, query]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      code: "",
      name: "",
      description: "",
      permissions: [],
      sortOrder: 0,
    });
    setError(null);
    setShowForm(true);
  };

  const openEdit = (r: Role) => {
    setEditingId(r.id);
    setForm({
      code: r.code,
      name: r.name,
      description: r.description || "",
      permissions: r.permissions ?? [],
      sortOrder: r.sortOrder,
    });
    setError(null);
    setShowForm(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowForm(false);
    setEditingId(null);
    setForm({
      code: "",
      name: "",
      description: "",
      permissions: [],
      sortOrder: 0,
    });
    setError(null);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error("Vui lòng nhập mã chức vụ");
      setError("Vui lòng nhập mã chức vụ");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên chức vụ");
      setError("Vui lòng nhập tên chức vụ");
      return;
    }
    setError(null);
    setSaving(true);
    const isEditing = Boolean(editingId);
    const toastId = toast.loading(
      isEditing ? "Đang lưu chức vụ..." : "Đang tạo chức vụ...",
    );
    try {
      if (editingId) {
        await updateRole(editingId, {
          name: form.name.trim(),
          description: form.description.trim(),
          permissions: form.permissions,
          sortOrder: form.sortOrder,
        });
      } else {
        await createRole({
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
          permissions:
            form.permissions.length > 0
              ? form.permissions
              : defaultPermissionsForRole(form.code.trim()),
          sortOrder: form.sortOrder,
        });
      }
      toast.success(isEditing ? "Đã lưu chức vụ" : "Đã tạo chức vụ", {
        id: toastId,
      });
      setShowForm(false);
      setEditingId(null);
      setForm({
        code: "",
        name: "",
        description: "",
        permissions: [],
        sortOrder: 0,
      });
      await load();
      refreshUsers().catch(() => {});
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Lưu chức vụ thất bại, vui lòng thử lại";
      toast.error(message, { id: toastId });
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Danh mục chức vụ"
        description="Quản lý chức vụ và phân quyền"
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Tạo chức vụ
          </button>
        }
      />

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên hoặc mã..."
          className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
      </div>

      {/* Modal */}
      {showForm &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeModal} />

            <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-white">
                <h3 className="text-lg font-semibold text-slate-800">
                  {editingId ? "Sửa chức vụ" : "Tạo chức vụ"}
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

              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Mã chức vụ */}
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Mã chức vụ</span>
                    <input
                      placeholder="VD: MANAGER"
                      className={[
                        "w-full rounded-xl border py-2.5 px-3 text-sm transition-colors mt-1.5",
                        "focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500",
                        error && !form.code ? "border-red-400" : "border-border",
                      ].join(" ")}
                      value={form.code}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          code: e.target.value,
                          ...(!editingId
                            ? {
                                permissions: defaultPermissionsForRole(
                                  e.target.value.trim().toUpperCase(),
                                ),
                              }
                            : {}),
                        })
                      }
                      disabled={!!editingId}
                    />
                  </label>

                  {/* Tên chức vụ */}
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Tên chức vụ</span>
                    <input
                      placeholder="VD: Quản lý"
                      className={[
                        "w-full rounded-xl border py-2.5 px-3 text-sm transition-colors mt-1.5",
                        "focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500",
                        error && !form.name ? "border-red-400" : "border-border",
                      ].join(" ")}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </label>
                </div>

                {/* Mô tả */}
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Mô tả</span>
                  <textarea
                    placeholder="Nhập mô tả chức vụ..."
                    className="w-full rounded-xl border border-border py-2.5 px-3 text-sm transition-colors mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </label>

                {/* Thứ tự sắp xếp */}
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Thứ tự sắp xếp</span>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full rounded-xl border border-border py-2.5 px-3 text-sm transition-colors mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 })}
                  />
                </label>

                <div className="space-y-3 border-t border-border pt-4">
                  <span className="block text-sm font-medium text-slate-700">Phân quyền</span>
                  <div className="rounded-xl border border-border bg-surface-muted/50 px-4 py-3 text-sm text-slate-600">
                    {editingId
                      ? "Quyền truy cập trang và thao tác của vai trò được cấu hình ở nút \"Thiết lập quyền\" ngoài danh sách."
                      : "Vai trò mới sẽ tự áp dụng bộ quyền mẫu theo mã chức vụ. Sau khi tạo xong bạn có thể vào \"Thiết lập quyền\" để chỉnh chi tiết."}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4 sticky bottom-0 bg-white">
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
            Đang tải chức vụ...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Mã</th>
                <th className="px-4 py-3 font-medium">Tên chức vụ</th>
                <th className="px-4 py-3 font-medium">Mô tả</th>
                <th className="px-4 py-3 font-medium">Quyền</th>
                <th className="px-4 py-3 font-medium">Phân quyền trang</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-surface-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                        <Shield className="h-4 w-4" />
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-600">{r.code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{r.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-500">
                      {r.description ? 
                        (r.description.length > 40 
                          ? r.description.substring(0, 40) + "..." 
                          : r.description) 
                        : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {r.canCreateProposal && (
                        <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                          Tạo
                        </span>
                      )}
                      {r.canApprove && (
                        <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Phê duyệt
                        </span>
                      )}
                      {!r.canCreateProposal && !r.canApprove && (
                        <span className="text-xs text-slate-400">Không</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-600">
                        {summarizePermissions(r.permissions)}
                      </p>
                      <Link
                        href={`/roles/${r.id}/permissions`}
                        className="inline-flex items-center rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-primary-300 hover:text-primary-600"
                      >
                        Thiết lập quyền
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(r)}
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
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    {roles.length === 0 ? "Chưa có chức vụ nào" : "Không tìm thấy chức vụ phù hợp"}
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
