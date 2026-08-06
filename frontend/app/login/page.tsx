"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { useUser } from "@/lib/context/UserContext";
import { siteConfig } from "@/config/site";

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, loading: sessionLoading, login } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    router.prefetch("/proposals");
  }, [router]);

  useEffect(() => {
    if (!sessionLoading && currentUser) router.replace("/proposals");
  }, [currentUser, router, sessionLoading]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const toastId = toast.loading("Đang đăng nhập...");
    try {
      await login(email, password);
      toast.success("Đăng nhập thành công", { id: toastId });
      router.push("/proposals");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Đăng nhập thất bại";
      toast.error(message, { id: toastId });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f8f6] text-sm text-slate-500">
        Đang khôi phục phiên đăng nhập...
      </main>
    );
  }

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#f3f8f6] text-slate-900">
      <style>{`
        @keyframes float-soft {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -12px, 0); }
        }
        @keyframes drift-line {
          0% { transform: translateX(-18%); opacity: .25; }
          50% { opacity: .65; }
          100% { transform: translateX(18%); opacity: .25; }
        }
        @keyframes shine {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
        @keyframes glow-drift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(24px, -18px, 0) scale(1.08); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes logo-breathe {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 8px 18px rgba(6, 95, 70, .08)); }
          50% { transform: scale(1.012); filter: drop-shadow(0 12px 24px rgba(6, 95, 70, .14)); }
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(16,185,129,.13),transparent_30%),radial-gradient(circle_at_88%_80%,rgba(59,130,246,.1),transparent_28%),linear-gradient(135deg,#f8fcfa,#edf7f3_52%,#f5f8fd)]" />
      <div className="absolute left-0 top-0 h-full w-full opacity-[0.12] [background-image:linear-gradient(rgba(15,118,110,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(15,118,110,.22)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-emerald-300/25 blur-3xl [animation:glow-drift_9s_ease-in-out_infinite]" />
      <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl [animation:glow-drift_11s_ease-in-out_infinite_reverse]" />
      <div className="absolute left-[-10%] top-24 h-px w-[120%] bg-emerald-500/30 blur-[1px] [animation:drift-line_9s_ease-in-out_infinite]" />
      <div className="absolute bottom-28 left-[-10%] h-px w-[120%] bg-sky-500/25 blur-[1px] [animation:drift-line_11s_ease-in-out_infinite_reverse]" />

      <section className="relative z-10 mx-auto grid h-full min-h-0 max-w-6xl content-center items-start gap-6 px-4 py-3 sm:px-6 sm:py-5 lg:grid-cols-[1.08fr_.92fr] lg:gap-10 lg:px-8">
        <div className="hidden lg:block">
          <div className="relative p-8 [animation:fade-up_.7s_ease-out_both]">
            <div className="relative">
              <div className="[animation:logo-breathe_6s_ease-in-out_infinite]">
                <Image
                  src="/logo.jpg"
                  alt="Sicom"
                  width={760}
                  height={450}
                  priority
                  className="mx-auto h-40 w-full max-w-[430px] object-contain mix-blend-multiply"
                />
              </div>

              <div className="mt-8 text-center">
                <h2 className="text-4xl font-black tracking-tight text-slate-900">
                  SAW <span className="text-emerald-600">Requests</span>
                </h2>
                <p className="mt-3 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Đề xuất · Phê duyệt · Thanh toán
                </p>
                <div className="mx-auto mt-6 h-1 w-20 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-600 to-sky-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-2 flex justify-center sm:mb-4 lg:hidden">
            <Image
              src="/logo.jpg"
              alt="Sicom"
              width={220}
              height={120}
              priority
              className="h-16 rounded-2xl object-contain mix-blend-multiply sm:h-20"
            />
          </div>

          <form
            onSubmit={handleSubmit}
            className="relative overflow-hidden rounded-[1.5rem] border border-white bg-white/88 p-5 shadow-[0_28px_70px_-30px_rgba(6,78,59,.38)] backdrop-blur-2xl sm:rounded-[1.75rem] sm:p-7 [animation:fade-up_.7s_.12s_ease-out_both]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
              <div className="h-full w-1/2 bg-white/90 [animation:shine_3.5s_ease-in-out_infinite]" />
            </div>

            <div className="mb-5 sm:mb-7">
              <div>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-600/25">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  Chào mừng trở lại
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Đăng nhập để tiếp tục.
                </p>
              </div>
            </div>

            {error && (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-slate-700">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-200 bg-white px-10 py-3.5 text-sm text-slate-800 outline-none ring-emerald-500/15 transition focus:border-emerald-500 focus:ring-4"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="Nhập email được cấp"
                  required
                />
              </div>
            </label>

            <label className="mt-3 block text-sm sm:mt-4">
              <span className="mb-2 block font-semibold text-slate-700">
                Mật khẩu
              </span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-slate-200 bg-white px-10 py-3.5 text-sm text-slate-800 outline-none ring-emerald-500/15 transition focus:border-emerald-500 focus:ring-4"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => setShowPassword((value) => !value)}
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-700/20 transition hover:from-emerald-700 hover:to-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-6 sm:py-3.5"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <a href="/forgot-password" className="mt-3 block text-center text-sm font-semibold text-emerald-700 hover:text-emerald-800">
              Quên mật khẩu?
            </a>

            <a
              href={`tel:${siteConfig.supportPhone}`}
              className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800 sm:mt-4"
            >
              <Phone className="h-4 w-4" />
              Liên hệ hỗ trợ: {siteConfig.supportPhone}
            </a>
            <p className="mt-3 border-t border-slate-100 pt-3 text-center text-xs text-slate-400 sm:mt-5 sm:pt-4">
              Hệ thống nội bộ · SICOM © {new Date().getFullYear()}
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
