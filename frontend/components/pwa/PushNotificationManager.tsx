'use client';

import { useEffect, useState } from 'react';
import { BellRing, Share2, X } from 'lucide-react';
import { useUser } from '@/lib/context/UserContext';
import { getPushPublicKey, savePushSubscription } from '@/lib/api/notifications';

function decodeKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function PushNotificationManager() {
  const { currentUser } = useUser();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);

  useEffect(() => {
    const available = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(available);
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIosNeedsInstall(ios && !standalone);
    if (!available) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        setSubscribed(Boolean(subscription));
        if (subscription && currentUser?.id) await savePushSubscription(subscription.toJSON());
      })
      .catch(() => {});
  }, [currentUser?.id]);

  async function enablePush() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const registration = await navigator.serviceWorker.ready;
      const { publicKey } = await getPushPublicKey();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(publicKey),
      });
      await savePushSubscription(subscription.toJSON());
      setSubscribed(true);
    } finally {
      setBusy(false);
    }
  }

  if (!currentUser || dismissed || subscribed || (!supported && !iosNeedsInstall)) return null;

  return (
    <aside className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:left-auto sm:right-5 sm:mx-0">
      <button aria-label="Đóng" onClick={() => setDismissed(true)} className="absolute right-2 top-2 rounded-full p-1 text-slate-400 hover:bg-slate-100">
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-5">
        <div className="rounded-xl bg-blue-50 p-2 text-blue-600">{iosNeedsInstall ? <Share2 /> : <BellRing />}</div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{iosNeedsInstall ? 'Cài ứng dụng trên iPhone' : 'Bật thông báo trên điện thoại'}</p>
          <p className="mt-1 text-sm text-slate-600">
            {iosNeedsInstall ? 'Nhấn Chia sẻ → Thêm vào MH chính, sau đó mở app để bật thông báo.' : 'Nhận nhắc duyệt và thanh toán ngay cả khi ứng dụng đang đóng.'}
          </p>
          {!iosNeedsInstall && <button disabled={busy} onClick={enablePush} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Đang bật…' : 'Cho phép thông báo'}</button>}
        </div>
      </div>
    </aside>
  );
}
