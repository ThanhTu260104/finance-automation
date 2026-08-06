"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { requestPasswordReset, resetPassword } from "@/lib/api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (!sent) {
        await requestPasswordReset(email);
        setSent(true);
        toast.success("Nếu email hợp lệ, mã xác thực đã được gửi");
      } else {
        await resetPassword({ email, code, newPassword });
        toast.success("Đã đổi mật khẩu. Bạn có thể đăng nhập.");
        window.location.href = "/login";
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xử lý yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-900">Quên mật khẩu</h1>
        <p className="mt-2 text-sm text-slate-500">Mã xác thực sẽ được gửi đến email tài khoản và có hiệu lực trong 10 phút.</p>
        <label className="mt-6 block text-sm font-medium text-slate-700">Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={sent} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500" />
        </label>
        {sent && <>
          <label className="mt-4 block text-sm font-medium text-slate-700">Mã xác thực
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500" />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">Mật khẩu mới
            <input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500" />
          </label>
        </>}
        <button disabled={loading} className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{loading ? "Đang xử lý..." : sent ? "Xác nhận đổi mật khẩu" : "Gửi mã xác thực"}</button>
        <Link href="/login" className="mt-4 block text-center text-sm font-semibold text-emerald-700">Quay lại đăng nhập</Link>
      </form>
    </main>
  );
}
