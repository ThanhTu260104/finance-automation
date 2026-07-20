"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut, MessageCircle, Phone } from "lucide-react";
import { adminNavItems } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { useUser } from "@/lib/context/UserContext";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils/cn";

type AdminSidebarProps = {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function AdminSidebar({ collapsed = false, onToggleCollapsed }: AdminSidebarProps) {
  const pathname = usePathname();
  const { currentUser } = useUser();
  const permissions = currentUser?.role?.permissions ?? [];

  return (
    <aside className={cn("flex h-screen w-64 shrink-0 flex-col bg-slate-900 text-slate-200 transition-[width] duration-200", collapsed && "lg:w-[72px]")}>
      {/* Logo */}
      <div className={cn("relative flex h-20 items-center gap-3 border-b border-slate-800/70 px-5", collapsed && "lg:justify-center lg:px-3")}>
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-slate-800/50">
          <Image
            src="/logo.jpg"
            alt="Logo"
            fill
            sizes="40px"
            className="object-contain p-1"
          />
        </div>
        <span className={cn("truncate text-sm font-semibold tracking-wide text-slate-100", collapsed && "lg:hidden")}>
          {siteConfig.name}
        </span>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="absolute -right-3 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-400 shadow-md transition hover:bg-slate-800 hover:text-white lg:flex"
          aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          title={collapsed ? "Mở rộng" : "Thu gọn"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {adminNavItems
          .filter((item) => hasPermission(permissions, item.permission))
          .map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-blue-600/15 text-blue-400"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
              )}
            >
              {/* Active indicator */}
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-blue-500 transition-opacity",
                  isActive ? "opacity-100" : "opacity-0"
                )}
                aria-hidden
              />
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-200"
                )}
                aria-hidden
              />
              <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-800/70 p-3">
        <a
          href={`tel:${siteConfig.supportPhone}`}
          title={collapsed ? `Liên hệ hỗ trợ ${siteConfig.supportPhone}` : undefined}
          className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors duration-150 hover:bg-emerald-500/10 hover:text-emerald-300"
        >
          <Phone className="h-5 w-5 shrink-0" aria-hidden />
          <span className={cn(collapsed && "lg:hidden")}>
            <span className="block text-xs">Liên hệ hỗ trợ</span>
            <span className="font-semibold text-slate-200">
              {siteConfig.supportPhone}
            </span>
          </span>
        </a>
        <a
          href={`https://zalo.me/${siteConfig.supportPhone}`}
          title={collapsed ? `Zalo ${siteConfig.supportPhone}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors duration-150 hover:bg-blue-500/10 hover:text-blue-300"
        >
          <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
          <span className={cn(collapsed && "lg:hidden")}>
            <span className="block text-xs">Hỗ trợ qua Zalo</span>
            <span className="font-semibold text-slate-200">
              {siteConfig.supportPhone}
            </span>
          </span>
        </a>
        <button
          type="button"
          title={collapsed ? "Đăng xuất" : undefined}
          className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400", collapsed && "lg:justify-center lg:[&>span]:hidden")}
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
