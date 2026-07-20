"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  FileCheck2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useUser } from "@/lib/context/UserContext";
import { siteConfig } from "@/config/site";

const floatingCards = [
  { label: "Đề xuất chờ duyệt", value: "12", tone: "text-amber-600" },
  { label: "Đã thanh toán", value: "84%", tone: "text-emerald-600" },
  { label: "Kiểm soát hồ sơ", value: "OK", tone: "text-sky-600" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useUser();
  const [email, setEmail] = useState("nhanvien@sicom.local");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    router.prefetch("/proposals");
  }, [router]);

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

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef6f3] text-slate-900">
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
      `}</style>

      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.94),rgba(218,242,234,.8)_48%,rgba(240,244,255,.88))]" />
      <div className="absolute left-0 top-0 h-full w-full opacity-[0.18] [background-image:linear-gradient(rgba(15,118,110,.28)_1px,transparent_1px),linear-gradient(90deg,rgba(15,118,110,.28)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="absolute left-[-10%] top-24 h-px w-[120%] bg-emerald-500/30 blur-[1px] [animation:drift-line_9s_ease-in-out_infinite]" />
      <div className="absolute bottom-28 left-[-10%] h-px w-[120%] bg-sky-500/25 blur-[1px] [animation:drift-line_11s_ease-in-out_infinite_reverse]" />

      <section className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-4 py-8 lg:grid-cols-[1.08fr_.92fr] lg:px-8">
        <div className="hidden lg:block">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/35 p-8 shadow-2xl shadow-emerald-900/10 backdrop-blur-2xl">
            <div className="absolute inset-x-0 top-0 h-24 bg-white/45" />
            <div className="absolute inset-y-0 right-0 w-28 bg-emerald-500/10" />

            <div className="relative">
              <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/60 px-3 py-1.5 text-sm font-semibold text-emerald-800 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4 text-red-500" />
                Finance Automation
              </div>

              <div className="rounded-3xl border border-white/80 bg-white/70 p-8 shadow-xl shadow-emerald-900/10 backdrop-blur-xl">
                <Image
                  src="/logo.jpg"
                  alt="Sicom"
                  width={760}
                  height={450}
                  priority
                  className="mx-auto h-auto w-full max-w-[520px] rounded-2xl object-contain mix-blend-multiply"
                />
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3">
                {floatingCards.map((item, index) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-xl"
                    style={{ animation: `float-soft ${5 + index}s ease-in-out infinite` }}
                  >
                    <p className={`text-2xl font-bold ${item.tone}`}>
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-3xl border border-white/70 bg-slate-950/85 p-5 text-white shadow-xl shadow-slate-900/20 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-200">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Quy trình phê duyệt liền mạch</p>
                    <p className="text-sm text-slate-300">
                      Theo dõi đề xuất, thanh toán và báo cáo trong một màn hình.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex justify-center lg:hidden">
            <Image
              src="/logo.jpg"
              alt="Sicom"
              width={220}
              height={120}
              priority
              className="rounded-2xl object-contain mix-blend-multiply"
            />
          </div>

          <form
            onSubmit={handleSubmit}
            className="relative overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/55 p-6 shadow-2xl shadow-emerald-950/10 backdrop-blur-2xl sm:p-8"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
              <div className="h-full w-1/2 bg-white/90 [animation:shine_3.5s_ease-in-out_infinite]" />
            </div>

            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50/70 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Bảo mật nội bộ
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  Đăng nhập
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Hệ thống đề xuất, phê duyệt và thanh toán tài chính Hệ sinh thái SAW.
                </p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-emerald-700 shadow-sm">
                <BadgeCheck className="h-6 w-6" />
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
                  className="w-full rounded-xl border border-white/80 bg-white/70 px-10 py-3 text-sm text-slate-800 outline-none ring-emerald-500/20 transition focus:border-emerald-500 focus:ring-4"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>
            </label>

            <label className="mt-4 block text-sm">
              <span className="mb-2 block font-semibold text-slate-700">
                Mật khẩu
              </span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-white/80 bg-white/70 px-10 py-3 text-sm text-slate-800 outline-none ring-emerald-500/20 transition focus:border-emerald-500 focus:ring-4"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
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
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="mt-5 rounded-2xl border border-white/70 bg-white/45 px-4 py-3 text-xs text-slate-500">
              Demo: <span className="font-semibold text-slate-700">nhanvien@sicom.local</span>{" "}
              / <span className="font-semibold text-slate-700">Admin@123</span>
            </div>

            <a
              href={`tel:${siteConfig.supportPhone}`}
              className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
            >
              <Phone className="h-4 w-4" />
              Liên hệ hỗ trợ: {siteConfig.supportPhone}
            </a>
          </form>
        </div>
      </section>
    </main>
  );
}
