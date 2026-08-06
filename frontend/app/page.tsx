"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useUser } from "@/lib/context/UserContext";

export default function Home() {
  const router = useRouter();
  const { currentUser, loading } = useUser();

  useEffect(() => {
    if (loading) return;
    router.replace(currentUser ? "/proposals" : "/login");
  }, [currentUser, loading, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-5 w-5 animate-spin" />
        Đang khôi phục phiên đăng nhập...
      </div>
    </main>
  );
}
