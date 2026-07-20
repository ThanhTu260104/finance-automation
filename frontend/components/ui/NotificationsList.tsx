import React from 'react';
import { Bell, BellRing, CheckCheck, ChevronRight, Inbox, Loader2 } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/format';

export type NotificationItem = {
  id: string;
  type?: string;
  title: string;
  message?: string;
  isRead?: boolean;
  createdAt?: string;
  link?: string;
};

type NotificationsListProps = {
  items?: NotificationItem[];
  loading?: boolean;
  onMarkRead?: (id: string) => void | Promise<void>;
};

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'Vừa xong';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function NotificationsList({ items = [], loading = false, onMarkRead }: NotificationsListProps) {
  const unreadCount = items.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="w-full max-w-md rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-gray-500" strokeWidth={2} />
            <span className="text-sm font-semibold text-gray-800">Thông báo</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center text-gray-500">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Đang tải thông báo...
          </div>
          <div className="w-full space-y-2 animate-pulse">
            <div className="h-10 rounded-lg bg-slate-100" />
            <div className="h-10 rounded-lg bg-slate-100" />
            <div className="h-10 rounded-lg bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!items || !items.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-gray-400">
        <Inbox className="h-9 w-9" strokeWidth={1.5} />
        <p className="text-sm">Không có thông báo</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-xl  bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between  px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-500" strokeWidth={2} />
          <span className="text-sm font-semibold text-gray-800">Thông báo</span>
          {unreadCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      <ul className="max-h-[min(65vh,620px)] divide-y divide-gray-100 overflow-y-auto">
        {items.map((n) => {
          const unread = !n.isRead;
          const content = (
            <div className="flex items-start gap-3 px-4 py-3">
              <div
                className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                  unread ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {unread ? (
                  <BellRing className="h-4 w-4" strokeWidth={2} />
                ) : (
                  <Bell className="h-4 w-4" strokeWidth={2} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={`break-words text-sm leading-5 ${unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-500'}`}>
                    {n.title}
                  </p>
                  {unread && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" />}
                </div>

                {n.message && (
                  <p className={`mt-1 whitespace-pre-wrap break-words text-sm leading-5 ${unread ? 'text-gray-600' : 'text-gray-400'}`}>
                    {n.message}
                  </p>
                )}

                <div className="mt-1 flex items-center gap-3">
                  {n.createdAt && (
                    <span className="text-xs text-gray-400">
                      {timeAgo(n.createdAt)} · {formatDateTime(n.createdAt)}
                    </span>
                  )}
                  {!n.isRead && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onMarkRead && onMarkRead(n.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      <CheckCheck className="h-3.5 w-3.5" strokeWidth={2} />
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
              </div>

              {n.link && (
                <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-300" strokeWidth={2} />
              )}
            </div>
          );

          return (
            <li key={n.id} className={`transition-colors hover:bg-gray-50 ${unread ? 'bg-blue-50/30' : ''}`}>
              {n.link ? (
                <a
                  href={n.link}
                  className="block"
                  onClick={async (event) => {
                    if (unread && onMarkRead) {
                      event.preventDefault();
                      await onMarkRead(n.id);
                      window.location.assign(n.link as string);
                    }
                  }}
                >
                  {content}
                </a>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
