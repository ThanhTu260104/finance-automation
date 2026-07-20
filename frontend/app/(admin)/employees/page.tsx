"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Mail,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  Search,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  X,
  AlertCircle,
  Loader2,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { createUser, deleteUser, setUserActive, updateUser, type User } from "@/lib/api/users";
import { getDepartments } from "@/lib/api/departments";
import { getRoles, type Role as RoleRecord } from "@/lib/api/roles";
import { useUser } from "@/lib/context/UserContext";
import { hasPermission } from "@/lib/permissions";

type Department = { id: string; name: string };
type EmployeeForm = {
  email: string;
  fullName: string;
  password: string;
  roleId: string;
  departmentIds: string[];
  sendWelcomeEmail: boolean;
};

const EMPTY_FORM: EmployeeForm = {
  email: "",
  fullName: "",
  password: "Admin@123",
  roleId: "",
  departmentIds: [],
  sendWelcomeEmail: false,
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  EMPLOYEE: "Nhân viên",
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-purple-50 text-purple-700 ring-purple-600/20",
  MANAGER: "bg-blue-50 text-blue-700 ring-blue-600/20",
  EMPLOYEE: "bg-slate-100 text-slate-600 ring-slate-500/10",
};

const AVATAR_PALETTE = [
  "bg-primary-50 text-primary-700",
  "bg-amber-50 text-amber-700",
  "bg-emerald-50 text-emerald-700",
  "bg-rose-50 text-rose-700",
  "bg-sky-50 text-sky-700",
  "bg-violet-50 text-violet-700",
];

type UserRoleValue = User["role"] | string | null | undefined;

function getDefaultRoleId(roles: RoleRecord[]) {
  return roles.find((r) => r.code === "EMPLOYEE" && r.isActive)?.id ?? roles.find((r) => r.isActive)?.id ?? "";
}

function getRoleCode(role: UserRoleValue) {
  return typeof role === "string" ? role : role?.code ?? "";
}

function getRoleName(role: UserRoleValue) {
  const code = getRoleCode(role);
  if (typeof role === "string") return ROLE_LABEL[role] ?? role;
  return role?.name ?? ROLE_LABEL[code] ?? (code || "-");
}

function hashIndex(str: string, mod: number) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % mod;
}

function getUserDepartments(user: User) {
  if (user.departments?.length) return user.departments;
  return user.department ? [user.department] : [];
}

export default function EmployeesPage() {
  const { users: contextUsers, refreshUsers, loading: usersLoading } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  useEffect(() => {
    Promise.all([getDepartments().then(setDepartments), getRoles().then(setRoles)]).finally(() =>
      setLoading(false),
    );
  }, []);

  useEffect(() => {
    setUsers(contextUsers);
  }, [contextUsers]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesDept =
        !departmentFilter ||
        getUserDepartments(u).some((department) => department.id === departmentFilter);
      return matchesQuery && matchesDept;
    });
  }, [users, query, departmentFilter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      canCreate: users.filter((u) =>
        hasPermission(u.role?.permissions, "proposal.create"),
      ).length,
      canApprove: users.filter((u) =>
        hasPermission(u.role?.permissions, "proposal.approve"),
      ).length,
    }),
    [users],
  );
  const pageLoading = loading || (usersLoading && users.length === 0);

  const openCreateModal = () => {
    setEditingUserId(null);
    setForm({ ...EMPTY_FORM, roleId: getDefaultRoleId(roles) });
    setFormError(null);
    setShowPassword(false);
    setShowForm(true);
  };

  const openEditModal = (u: User) => {
    setEditingUserId(u.id);
    setForm({
      email: u.email,
      fullName: u.fullName,
      password: "",
      roleId: u.roleId ?? u.role?.id ?? "",
      departmentIds: getUserDepartments(u).map((department) => department.id),
      sendWelcomeEmail: false,
    });
    setFormError(null);
    setShowPassword(false);
    setShowForm(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowForm(false);
    setEditingUserId(null);
    setShowPassword(false);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const toggleDepartment = (id: string) => {
    setForm((prev) => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(id)
        ? prev.departmentIds.filter((departmentId) => departmentId !== id)
        : [...prev.departmentIds, id],
    }));
  };

  const handleCreate = async () => {
    if (!form.email.trim() || !form.fullName.trim()) {
      toast.error("Vui lòng nhập email và họ tên");
      setFormError("Vui lòng nhập email và họ tên");
      return;
    }
    if (form.departmentIds.length === 0) {
      toast.error("Vui lòng chọn phòng ban");
      setFormError("Vui lòng chọn phòng ban");
      return;
    }
    setFormError(null);
    setSaving(true);
    const isEditing = Boolean(editingUserId);
    const toastId = toast.loading(
      isEditing ? "Đang lưu nhân viên..." : "Đang tạo nhân viên...",
    );
    try {
      if (editingUserId) {
        await updateUser(editingUserId, {
          email: form.email,
          fullName: form.fullName,
          ...(form.password ? { password: form.password } : {}),
          roleId: form.roleId || undefined,
          departmentIds: form.departmentIds,
        });
      } else {
        const created = await createUser({
          email: form.email,
          fullName: form.fullName,
          password: form.password,
          roleId: form.roleId || undefined,
          departmentIds: form.departmentIds,
          sendWelcomeEmail: form.sendWelcomeEmail,
        });
        if (form.sendWelcomeEmail && !created.welcomeEmailSent) {
          toast.warning(
            `Đã tạo tài khoản nhưng chưa gửi email: ${created.welcomeEmailError ?? "Lỗi gửi email"}`,
            { id: toastId },
          );
        } else {
          toast.success(
            form.sendWelcomeEmail
              ? "Đã tạo tài khoản và gửi email"
              : "Đã tạo nhân viên",
            { id: toastId },
          );
        }
      }
      if (isEditing) toast.success("Đã lưu nhân viên", { id: toastId });
      setShowForm(false);
      setEditingUserId(null);
      setShowPassword(false);
      setForm(EMPTY_FORM);
      setFormError(null);
      await refreshUsers();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Lưu nhân viên thất bại, vui lòng thử lại";
      toast.error(message, { id: toastId });
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const action = user.isActive ? "khóa" : "mở khóa";
    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản ${user.fullName}?`)) return;
    setProcessingUserId(user.id);
    try {
      await setUserActive(user.id, !user.isActive);
      await refreshUsers();
      toast.success(`Đã ${action} tài khoản`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Không thể ${action} tài khoản`);
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDelete = (user: User) => {
    setDeleteTarget(user);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setProcessingUserId(deleteTarget.id);
    try {
      await deleteUser(deleteTarget.id);
      await refreshUsers();
      toast.success("Đã xóa tài khoản");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa tài khoản");
    } finally {
      setProcessingUserId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Quản lý nhân viên"
        description="Tạo tài khoản và phân quyền tham gia đề xuất"
        action={
          <button
            type="button"
            onClick={openCreateModal}
            disabled={pageLoading}
            className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserIcon className="h-4 w-4" aria-hidden />
            Tạo nhân viên
          </button>
        }
      />

      {/* Summary stats */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard icon={Users} label="Tổng nhân viên" value={stats.total} tone="primary" />
        <StatCard icon={ShieldCheck} label="Được tạo đề xuất" value={stats.canCreate} tone="amber" />
        <StatCard icon={ShieldCheck} label="Được phê duyệt" value={stats.canApprove} tone="emerald" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={pageLoading}
            placeholder="Tìm theo tên hoặc email..."
            className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
        <select
          title="Lọc theo phòng ban"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          disabled={pageLoading}
          className="rounded-xl border border-border py-2 pl-3 pr-8 text-sm text-slate-600 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">Tất cả phòng ban</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Modal */}
      {showForm &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeModal} />

            <div className="relative z-[100000] flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  {editingUserId ? "Sửa nhân viên" : "Tạo nhân viên"}
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

              {/* Body */}
              <div className="space-y-6 overflow-y-auto px-6 py-5">
                <section className="space-y-3">
                  <SectionHeading title="Thông tin tài khoản" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <IconInput
                      icon={Mail}
                      placeholder="Email"
                      type="email"
                      value={form.email}
                      onChange={(v) => setForm({ ...form, email: v })}
                    />
                    <IconInput
                      icon={UserIcon}
                      placeholder="Họ tên"
                      value={form.fullName}
                      onChange={(v) => setForm({ ...form, fullName: v })}
                    />
                    <div className="relative md:col-span-2">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        placeholder={editingUserId ? "Để trống nếu không đổi mật khẩu" : "Mật khẩu"}
                        type={showPassword ? "text" : "password"}
                        className="w-full rounded-xl border border-border py-2.5 pl-9 pr-10 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {!editingUserId && (
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-muted/50 px-4 py-3 md:col-span-2">
                        <input
                          type="checkbox"
                          checked={form.sendWelcomeEmail}
                          onChange={(event) =>
                            setForm({ ...form, sendWelcomeEmail: event.target.checked })
                          }
                          className="mt-0.5 h-4 w-4 rounded border-border"
                        />
                        <span>
                          <span className="block text-sm font-medium text-slate-700">
                            Gửi email thông tin tài khoản
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            Email gồm đường dẫn đăng nhập, tài khoản và mật khẩu tạm thời.
                          </span>
                        </span>
                      </label>
                    )}
                  </div>
                </section>

                <section className="space-y-3">
                  <SectionHeading title="Phòng ban & vai trò" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="rounded-xl border border-border bg-white">
                        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm font-medium text-slate-700">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          Phòng ban
                        </div>
                        <div className="max-h-40 space-y-1 overflow-y-auto p-2">
                          {departments.map((d) => (
                            <label
                              key={d.id}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-surface-muted"
                            >
                              <input
                                type="checkbox"
                                checked={form.departmentIds.includes(d.id)}
                                onChange={() => toggleDepartment(d.id)}
                                className="h-4 w-4 rounded border-border"
                              />
                              {d.name}
                            </label>
                          ))}
                          {departments.length === 0 && (
                            <p className="px-2 py-3 text-sm text-slate-400">
                              Chưa có phòng ban
                            </p>
                          )}
                        </div>
                      </div>
                      {formError && (
                        <span className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {formError}
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <select
                        aria-label="Vai trò"
                        className={selectClass(false)}
                        value={form.roleId}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            roleId: e.target.value,
                          })
                        }
                      >
                        <option value="">Chọn vai trò</option>
                        {roles
                          .filter((r) => r.isActive || r.id === form.roleId)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <SectionHeading
                    title="Quyền hạn"
                    description="Quyền của nhân viên được lấy theo vai trò đã chọn."
                  />
                  <div className="rounded-xl border border-border bg-surface-muted/50 px-4 py-3 text-sm text-slate-600">
                    {roles.find((role) => role.id === form.roleId)?.name
                      ? `Tài khoản này sẽ kế thừa toàn bộ quyền của vai trò "${roles.find((role) => role.id === form.roleId)?.name}".`
                      : "Chọn vai trò để áp dụng bộ quyền tương ứng."}
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                >
                  {saving ? "Đang lưu..." : editingUserId ? "Lưu thay đổi" : "Lưu nhân viên"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {deleteTarget &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => {
                if (!processingUserId) setDeleteTarget(null);
              }}
            />
            <div className="relative z-[100000] w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Xác nhận xóa tài khoản
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Bạn có chắc muốn xóa vĩnh viễn tài khoản
                {" "}<strong>{deleteTarget.fullName}</strong> ({deleteTarget.email})?
                Thao tác này không thể hoàn tác.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={processingUserId === deleteTarget.id}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={processingUserId === deleteTarget.id}
                  className="inline-flex min-w-[130px] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {processingUserId === deleteTarget.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang xóa...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Xóa tài khoản
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Table */}
      <Card padding="sm" className="overflow-x-auto" aria-busy={pageLoading}>
        {pageLoading ? (
          <div className="space-y-4 px-4 py-8">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
              <Loader2 size={16} className="animate-spin text-primary-600" />
              Đang tải nhân viên, phòng ban và vai trò...
            </div>
            <div className="space-y-3 animate-pulse">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="grid grid-cols-[2fr_1fr_1.4fr_0.7fr] gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-100" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3 w-2/3 rounded-full bg-slate-100" />
                      <div className="h-2.5 w-1/2 rounded-full bg-slate-100" />
                    </div>
                  </div>
                  <div className="h-6 rounded-full bg-slate-100" />
                  <div className="h-6 rounded-full bg-slate-100" />
                  <div className="h-6 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Nhân viên</th>
                <th className="px-4 py-3 font-medium">Vai trò</th>
                <th className="px-4 py-3 font-medium">Phòng ban</th>
                <th className="px-4 py-3 text-center font-medium">Tạo đề xuất</th>
                <th className="px-4 py-3 text-center font-medium">Duyệt đề xuất</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((u) => {
                const userRoleCode = getRoleCode(u.role);
                const userRoleName = getRoleName(u.role);

                return (
                  <tr key={u.id} className="transition-colors hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-800">{u.fullName}</p>
                            {!u.isActive && (
                              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-inset ring-red-600/20">
                                Đã khóa
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                          ROLE_BADGE[userRoleCode] ?? ROLE_BADGE.EMPLOYEE
                        }`}
                      >
                        {userRoleName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {getUserDepartments(u).length > 0 ? (
                        <div className="flex max-w-[260px] flex-wrap gap-1">
                          {getUserDepartments(u).map((department) => (
                            <span
                              key={department.id}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                            >
                              {department.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PermissionMark
                        active={hasPermission(
                          u.role?.permissions,
                          "proposal.create",
                        )}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PermissionMark
                        active={hasPermission(
                          u.role?.permissions,
                          "proposal.approve",
                        )}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          disabled={processingUserId === u.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-primary-300 hover:text-primary-600 disabled:opacity-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          disabled={processingUserId === u.id}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                            u.isActive
                              ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          {u.isActive ? "Khóa" : "Mở khóa"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          disabled={processingUserId === u.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    {users.length === 0 ? "Chưa có nhân viên nào" : "Không tìm thấy nhân viên phù hợp"}
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

/* ---------- Shared building blocks ---------- */

function selectClass(hasError: boolean) {
  return [
    "w-full appearance-none rounded-xl border py-2.5 pl-9 pr-3 text-sm transition-colors",
    "focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500",
    hasError ? "border-red-400" : "border-border",
  ].join(" ");
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
    </div>
  );
}

function IconInput({
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border py-2.5 pl-9 pr-3 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
      />
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const palette = AVATAR_PALETTE[hashIndex(name || "?", AVATAR_PALETTE.length)];

  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${palette}`}>
      {initials || "?"}
    </div>
  );
}

function PermissionMark({ active }: { active: boolean }) {
  return active ? (
    <ShieldCheck className="mx-auto h-4.5 w-4.5 text-emerald-500" aria-label="Có" />
  ) : (
    <X className="mx-auto h-4.5 w-4.5 text-slate-300" aria-label="Không" />
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "primary" | "amber" | "emerald";
}) {
  const toneClass = {
    primary: "bg-primary-50 text-primary-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
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
