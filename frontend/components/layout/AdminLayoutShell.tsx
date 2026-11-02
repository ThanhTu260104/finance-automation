"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { adminNavItems } from "@/config/navigation";
import { useUser } from "@/lib/context/UserContext";
import { hasPermission, type AppPermission } from "@/lib/permissions";
import { AdminPageHeaderProvider } from "@/lib/context/AdminPageHeaderContext";
import { cn } from "@/lib/utils/cn";

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, loading } = useUser();
  const permissions = currentUser?.role?.permissions ?? [];

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem("admin_sidebar_collapsed") === "1");
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      localStorage.setItem("admin_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  };

  const fallbackHref = useMemo(() => {
    const item = adminNavItems.find((item) => hasPermission(permissions, item.permission));
    return item?.href ?? null;
  }, [permissions]);

  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      router.replace("/login");
      return;
    }

    const routePermission = getRoutePermission(pathname);
    if (routePermission && !hasPermission(permissions, routePermission)) {
      if (fallbackHref) {
        router.replace(fallbackHref);
      }
    }
  }, [currentUser, fallbackHref, loading, pathname, permissions, router]);

  if (loading || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted text-sm text-slate-500">
        Đang tải quyền truy cập...
      </div>
    );
  }

  if (!permissions.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted px-6 text-center text-sm text-slate-500">
        <div>
          <p className="mb-2 text-base font-semibold text-slate-700">Không có quyền truy cập</p>
          <p>Người dùng này chưa được cấp quyền. Vui lòng liên hệ quản trị viên để cập nhật quyền.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminPageHeaderProvider>
    <div className="flex min-h-screen bg-surface-muted font-sans">
      <div
        className={cn(
          "fixed inset-0 z-20 bg-black/40 lg:hidden",
          sidebarOpen ? "block" : "hidden",
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 transition-[width,transform] duration-200 lg:translate-x-0",
          sidebarCollapsed && "lg:w-[72px]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <AdminSidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebarCollapsed} />
      </div>

      <div className={cn("flex min-h-screen flex-1 flex-col overflow-hidden transition-[margin] duration-200", sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64")}>
        <AdminHeader onToggleSidebar={() => setSidebarOpen((open) => !open)} sidebarCollapsed={sidebarCollapsed} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-5 pt-20 sm:px-5 sm:pt-24 lg:px-8 lg:pb-8">{children}</main>
      </div>
    </div>
    </AdminPageHeaderProvider>
  );
}

function getRoutePermission(pathname: string): AppPermission | null {
  const routePermissions: Array<{ prefix: string; permission: AppPermission }> = [
    { prefix: "/proposals/new", permission: "proposal.create" },
    { prefix: "/proposals/", permission: "proposal.view" },
    { prefix: "/dashboard", permission: "dashboard.view" },
    { prefix: "/proposals", permission: "proposal.view" },
    { prefix: "/reports", permission: "report.view" },
    { prefix: "/employees", permission: "user.manage" },
    { prefix: "/departments", permission: "department.manage" },
    { prefix: "/roles", permission: "role.manage" },
    { prefix: "/proposal-types", permission: "proposal_type.manage" },
    { prefix: "/settings", permission: "workflow.manage" },
  ];

  const matched = routePermissions.find((route) => pathname.startsWith(route.prefix));
  return matched?.permission ?? null;
}
