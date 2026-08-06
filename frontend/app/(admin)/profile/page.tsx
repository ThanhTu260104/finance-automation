"use client";

import { useEffect, useState } from "react";
import { Camera, Loader2, Mail, Phone, Save, ShieldCheck, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useUser } from "@/lib/context/UserContext";
import { changeMyPassword, updateMyProfile, uploadMyAvatar, userAvatarFullUrl } from "@/lib/api/users";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

export default function ProfilePage() {
  const { currentUser, refreshUsers, loading } = useUser();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setFullName(currentUser.fullName);
    setPhone(currentUser.phone ?? "");
    setAvatarPreview(userAvatarFullUrl(currentUser.avatarUrl));
    setAvatarFile(null);
  }, [currentUser?.id, currentUser?.fullName, currentUser?.phone, currentUser?.avatarUrl]);

  const save = async () => {
    if (!fullName.trim()) {
      toast.error("Vui lòng nhập họ tên");
      return;
    }
    setSaving(true);
    const toastId = toast.loading("Đang lưu thông tin tài khoản...");
    try {
      await updateMyProfile({ fullName: fullName.trim(), phone: phone.trim() });
      if (avatarFile) await uploadMyAvatar(avatarFile);
      await refreshUsers();
      setAvatarFile(null);
      toast.success("Đã cập nhật thông tin tài khoản", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật tài khoản", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (newPassword.length < 8) return toast.error("Mật khẩu mới phải có ít nhất 8 ký tự");
    if (newPassword !== confirmPassword) return toast.error("Mật khẩu nhập lại không khớp");
    setChangingPassword(true);
    try {
      await changeMyPassword({ currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast.success("Đã đổi mật khẩu");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể đổi mật khẩu");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading && !currentUser) {
    return <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Đang tải tài khoản...</div>;
  }
  if (!currentUser) return null;

  const departments = currentUser.departments?.length
    ? currentUser.departments
    : currentUser.department
      ? [currentUser.department]
      : [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Thông tin tài khoản" description="Xem và cập nhật hồ sơ cá nhân của bạn" />
      <Card className="overflow-hidden !p-0" padding="sm">
        <div className="h-28 bg-gradient-to-r from-primary-600 to-emerald-500" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-primary-50 shadow-sm">
              {avatarPreview ? (
                <img src={avatarPreview} alt={`Ảnh đại diện ${fullName}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-bold text-primary-700">{initials(fullName)}</div>
              )}
            </div>
            <div className="min-w-0 pb-1">
              <h2 className="truncate text-xl font-semibold text-slate-900">{currentUser.fullName}</h2>
              <p className="text-sm text-slate-500">{currentUser.email}</p>
            </div>
          </div>

          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-600">
            <Camera className="h-4 w-4" /> Thay ảnh đại diện
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 3 * 1024 * 1024) {
                  toast.error("Ảnh đại diện tối đa 3 MB");
                  event.target.value = "";
                  return;
                }
                setAvatarFile(file);
                setAvatarPreview(URL.createObjectURL(file));
              }}
            />
          </label>
          <span className="ml-3 text-xs text-slate-400">JPG, PNG, WebP · tối đa 3 MB</span>

          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <Field icon={UserIcon} label="Họ và tên">
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="profile-input" />
            </Field>
            <Field icon={Phone} label="Số điện thoại">
              <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Chưa cập nhật" className="profile-input" />
            </Field>
            <Field icon={Mail} label="Email">
              <input value={currentUser.email} disabled className="profile-input bg-slate-50 text-slate-500" />
            </Field>
            <Field icon={ShieldCheck} label="Vai trò">
              <input value={currentUser.role?.name ?? currentUser.role?.code ?? "—"} disabled className="profile-input bg-slate-50 text-slate-500" />
            </Field>
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium text-slate-700">Dự án</p>
              <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-border bg-slate-50 px-3 py-2">
                {departments.length ? departments.map((department) => <span key={department.id} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">{department.name}</span>) : <span className="text-sm text-slate-400">Chưa có dự án</span>}
              </div>
            </div>
          </div>

          <div className="mt-7 flex justify-end">
            <button type="button" onClick={save} disabled={saving} className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </Card>
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">Đổi mật khẩu</h2>
        <p className="mt-1 text-sm text-slate-500">Nhập mật khẩu hiện tại để đặt mật khẩu mới.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="mb-2 block text-sm font-medium text-slate-700">Mật khẩu hiện tại</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="profile-input" /></label>
          <label><span className="mb-2 block text-sm font-medium text-slate-700">Mật khẩu mới</span><input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="profile-input" /></label>
          <label><span className="mb-2 block text-sm font-medium text-slate-700">Nhập lại mật khẩu mới</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="profile-input" /></label>
        </div>
        <div className="mt-5 flex justify-end"><button type="button" disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword} onClick={savePassword} className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{changingPassword ? "Đang đổi..." : "Đổi mật khẩu"}</button></div>
      </Card>
      <style jsx>{`.profile-input { width: 100%; border-radius: .75rem; border: 1px solid var(--color-border, #e2e8f0); padding: .625rem .75rem; font-size: .875rem; outline: none; } .profile-input:focus { border-color: #16a34a; box-shadow: 0 0 0 2px rgb(34 197 94 / .2); }`}</style>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return <label><span className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700"><Icon className="h-4 w-4 text-slate-400" />{label}</span>{children}</label>;
}
