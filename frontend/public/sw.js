self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(self.registration.showNotification(data.title || 'SAW Requests', {
    body: data.body || 'Bạn có thông báo mới',
    icon: data.icon || '/app-icon-192.png',
    badge: '/app-icon-192.png',
    tag: data.url || 'saw-notification',
    renotify: true,
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.navigate(destination);
        return client.focus();
      }
    }
    return clients.openWindow(destination);
  })());
});
