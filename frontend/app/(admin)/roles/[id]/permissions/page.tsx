"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, Shield } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getRole, updateRole, type Role } from "@/lib/api/roles";
import { useUser } from "@/lib/context/UserContext";
import {
  APP_PERMISSIONS,
  PERMISSION_GROUPS,
  defaultPermissionsForRole,
  summarizePermissions,
  type AppPermission,
} from "@/lib/permissions";

export default function RolePermissionsPage() {
  const params = useParams<{ id: string }>();
  const { refreshUsers } = useUser();
  const [role, setRole] = useState<Role | null>(null);
  const [selected, setSelected] = useState<AppPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    getRole(params.id)
      .then((data) => {
        setRole(data);
        setSelected((data.permissions ?? []) as AppPermission[]);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Không thể tải vai trò");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const togglePermission = (permission: AppPermission) => {
    setSelected((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  };

  const handleApplyTemplate = () => {
    if (!role) return;
    setSelected(defaultPermissionsForRole(role.code));
  };

  const handleSelectAll = () => {
    setSelected([...APP_PERMISSIONS]);
  };

  const handleClearAll = () => {
    setSelected([]);
  };

  const handleSave = async () => {
    if (!role) return;
    setSaving(true);
    setError(null);
    const toastId = toast.loading("Đang lưu phân quyền...");
    try {
      const updated = await updateRole(role.id, {
        permissions: selected,
      });
      setRole(updated);
      setSelected((updated.permissions ?? []) as AppPermission[]);
      refreshUsers().catch(() => {});
      toast.success("Đã lưu phân quyền", { id: toastId });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể lưu phân quyền";
      toast.error(message, { id: toastId });
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Phân quyền vai trò" />
        <Card className="py-12 text-center text-sm text-slate-500">
          <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
          Đang tải cấu hình quyền...
        </Card>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="space-y-4">
        <PageHeader title="Phân quyền vai trò" />
        <Card className="py-12 text-center text-sm text-red-600">
          {error ?? "Không tìm thấy vai trò"}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/roles"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách chức vụ
      </Link>

      <PageHeader
        title={`Phân quyền: ${role.name}`}
        description={`${role.code} · ${summarizePermissions(selected)}`}
      />

      <Card className="border-primary-100 bg-primary-50/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-slate-800">Thiết lập trang và tính năng được truy cập</p>
              <p className="text-sm text-slate-500">
                Menu, điều hướng và quyền thao tác sẽ bám theo bộ quyền của vai trò này.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleApplyTemplate}
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Áp dụng mẫu theo mã vai trò
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Bỏ hết
            </button>
          </div>
        </div>
      </Card>

      {PERMISSION_GROUPS.map((group) => (
        <Card key={group.title}>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-800">{group.title}</h2>
          </div>

          <div className="space-y-3">
            {group.items.map((item) => {
              const active = selectedSet.has(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => togglePermission(item.key)}
                  className={`flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-primary-300 bg-primary-50/50"
                      : "border-border hover:bg-surface-muted/60"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.key}</p>
                  </div>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      active
                        ? "border-primary-600 bg-primary-600 text-white"
                        : "border-slate-300 bg-white text-transparent"
                    }`}
                  >
                    <Check className="h-4 w-4" />
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      ))}

      {error && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </Card>
      )}

      <div className="sticky bottom-0 z-10 flex items-center justify-end border-t border-border bg-white/95 px-1 py-4 backdrop-blur">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Đang lưu..." : "Lưu phân quyền"}
        </button>
      </div>
    </div>
  );
}
