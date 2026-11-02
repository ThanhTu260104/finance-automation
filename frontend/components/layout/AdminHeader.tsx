"use client";

import { Bell, LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { siteConfig } from "@/config/site";
import { useAdminPageHeader } from "@/lib/context/AdminPageHeaderContext";
import { useUser } from "@/lib/context/UserContext";
import { useEffect, useState } from "react";
import { fetchNotifications, markNotificationRead, subscribeToNotifications } from "@/lib/api/notifications";
import NotificationsList from "@/components/ui/NotificationsList";
import { userAvatarFullUrl } from "@/lib/api/users";

type AdminHeaderProps = {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
};

export function AdminHeader({ onToggleSidebar, sidebarCollapsed = false }: AdminHeaderProps) {
  const router = useRouter();
  const { currentUser, logout, loading: usersLoading } = useUser();
  const { title: pageTitle, subtitle: pageSubtitle } = useAdminPageHeader();
  const headerTitle = pageTitle ?? siteConfig.name;
  const headerSubtitle = pageSubtitle ?? siteConfig.description;

  type NotificationItem = {
    id: string;
    title: string;
    message?: string;
    isRead?: boolean;
    createdAt?: string;
    link?: string;
  };

  const [open, setOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'ACTION' | 'TASK' | 'INFO'>('ACTION');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tabCounts, setTabCounts] = useState({ ACTION: 0, TASK: 0, INFO: 0 });
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const applyNotificationCounts = (action: unknown, task: unknown, info: unknown) => {
    setTabCounts({
      ACTION: Array.isArray(action) ? action.length : 0,
      TASK: Array.isArray(task) ? task.length : 0,
      INFO: Array.isArray(info) ? info.length : 0,
    });
  };

  useEffect(() => {
    let mounted = true;
    async function loadUnread() {
      if (!currentUser?.id) return;
      try {
        const [data, action, task, info] = await Promise.all([
          fetchNotifications(true),
          fetchNotifications(true, 'ACTION'),
          fetchNotifications(true, 'TASK'),
          fetchNotifications(true, 'INFO'),
        ]);
        if (!mounted) return;
        setUnreadCount(Array.isArray(data) ? data.length : 0);
        applyNotificationCounts(action, task, info);
      } catch (e) {
        // ignore
      }
    }
    loadUnread();
    return () => {
      mounted = false;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!open || !currentUser?.id) return;

    let mounted = true;
    async function loadItems() {
      setNotificationsLoading(true);
      try {
        const [tabData, allUnread, action, task, info] = await Promise.all([
          fetchNotifications(true, selectedTab),
          fetchNotifications(true),
          fetchNotifications(true, 'ACTION'),
          fetchNotifications(true, 'TASK'),
          fetchNotifications(true, 'INFO'),
        ]);
        if (!mounted) return;
        setItems(Array.isArray(tabData) ? tabData : []);
        setUnreadCount(Array.isArray(allUnread) ? allUnread.length : 0);
        applyNotificationCounts(action, task, info);
      } catch (e) {
        if (!mounted) return;
        setItems([]);
      } finally {
        if (mounted) setNotificationsLoading(false);
      }
    }

    loadItems();
    return () => {
      mounted = false;
    };
  }, [open, selectedTab, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;

    let mounted = true;
    const refreshNotifications = async () => {
      try {
        const [allUnread, tabData, action, task, info] = await Promise.all([
          fetchNotifications(true),
          open ? fetchNotifications(true, selectedTab) : Promise.resolve(null),
          fetchNotifications(true, 'ACTION'),
          fetchNotifications(true, 'TASK'),
          fetchNotifications(true, 'INFO'),
        ]);
        if (!mounted) return;
        setUnreadCount(Array.isArray(allUnread) ? allUnread.length : 0);
        applyNotificationCounts(action, task, info);
        if (open && Array.isArray(tabData)) setItems(tabData);
      } catch {
        // EventSource reconnects automatically; the next event/focus retries the fetch.
      }
    };

    const stream = subscribeToNotifications(currentUser.id);
    const refreshApplicationData = () => {
      window.dispatchEvent(new CustomEvent("finance:proposal-change"));
    };
    const handleNotification = () => {
      void refreshNotifications();
      refreshApplicationData();
    };
    stream.addEventListener('notification', handleNotification);
    stream.addEventListener('refresh', refreshNotifications);
    stream.addEventListener('connected', refreshNotifications);
    stream.addEventListener('proposal-change', refreshApplicationData);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshNotifications();
    };
    window.addEventListener('focus', refreshNotifications);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      stream.close();
      window.removeEventListener('focus', refreshNotifications);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser?.id, open, selectedTab]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className={`fixed inset-x-0 top-0 z-10 flex h-16 items-center justify-between gap-2 border-b border-border bg-surface px-3 shadow-sm transition-[left] duration-200 sm:gap-4 sm:px-6 lg:right-0 ${sidebarCollapsed ? "lg:left-[72px]" : "lg:left-64"}`}>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex-none rounded-lg p-2 text-slate-500 transition hover:bg-surface-muted lg:hidden"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800 sm:text-base">
            {headerTitle}
          </p>
          {headerSubtitle ? (
            <p className="hidden truncate text-xs text-slate-500 sm:block">
              {headerSubtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-none items-center gap-1 sm:gap-3 relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex-none relative rounded-lg p-2 text-slate-500 hover:bg-surface-muted"
          aria-label="Thông báo"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white">
              {unreadCount}
            </span>
          ) : null}
        </button>
        {open ? (
          <div className="absolute right-0 top-12 z-20 w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedTab('ACTION')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition ${
                  selectedTab === 'ACTION'
                    ? 'border-b-2 border-blue-600 text-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>Nhắc phê duyệt</span>
                {tabCounts.ACTION > 0 && <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-700">{tabCounts.ACTION > 99 ? '99+' : tabCounts.ACTION}</span>}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab('TASK')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition ${
                  selectedTab === 'TASK'
                    ? 'border-b-2 border-blue-600 text-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>Nhắc thanh toán</span>
                {tabCounts.TASK > 0 && <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">{tabCounts.TASK > 99 ? '99+' : tabCounts.TASK}</span>}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab('INFO')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition ${
                  selectedTab === 'INFO'
                    ? 'border-b-2 border-blue-600 text-slate-900'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>Kết quả</span>
                {tabCounts.INFO > 0 && <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">{tabCounts.INFO > 99 ? '99+' : tabCounts.INFO}</span>}
              </button>
            </div>
            <NotificationsList
              items={items}
              loading={notificationsLoading}
              onMarkRead={async (id: string) => {
                setNotificationsLoading(true);
                try {
                  await markNotificationRead(id);
                  const [refreshed, allUnread, action, task, info] = await Promise.all([
                    fetchNotifications(true, selectedTab),
                    fetchNotifications(true),
                    fetchNotifications(true, 'ACTION'),
                    fetchNotifications(true, 'TASK'),
                    fetchNotifications(true, 'INFO'),
                  ]);
                  setItems(Array.isArray(refreshed) ? refreshed : []);
                  setUnreadCount(Array.isArray(allUnread) ? allUnread.length : 0);
                  applyNotificationCounts(action, task, info);
                } catch (e) {
                  // ignore
                } finally {
                  setNotificationsLoading(false);
                }
              }}
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => router.push("/profile")}
          disabled={usersLoading || !currentUser}
          title="Thông tin tài khoản"
          className="flex max-w-[170px] items-center gap-2 rounded-xl border border-border bg-surface px-2 py-1.5 text-left transition hover:border-primary-300 hover:bg-primary-50/40 disabled:opacity-60 sm:max-w-[220px]"
        >
          <HeaderAvatar name={currentUser?.fullName ?? ""} avatarUrl={currentUser?.avatarUrl} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
            {currentUser?.fullName ?? "Đang tải..."}
          </span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex-none rounded-lg p-2 text-slate-500 hover:bg-surface-muted"
          title="Đăng xuất"
          aria-label="Đăng xuất"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

function HeaderAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const url = userAvatarFullUrl(avatarUrl);
  const initials = name.trim().split(/\s+/).slice(-2).map((part) => part[0]?.toUpperCase()).join("") || "?";

  return url ? (
    <img src={url} alt="" className="h-8 w-8 shrink-0 rounded-full border border-slate-200 object-cover" />
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
      {initials}
    </span>
  );
}
