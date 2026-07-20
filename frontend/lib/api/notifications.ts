import client, { getApiBaseUrl } from './client';

export function subscribeToNotifications(userId: string) {
  const url = new URL(`${getApiBaseUrl()}/notifications/stream`);
  url.searchParams.set('userId', userId);
  return new EventSource(url.toString());
}

export async function fetchNotifications(unreadOnly = false, type?: string) {
  const params: Record<string, string> = {};
  if (unreadOnly) params.unread = '1';
  if (type) params.type = type;
  const res = await client.get('/notifications', { params });
  return res.data;
}

export async function createNotification(payload: Record<string, unknown>) {
  const res = await client.post('/notifications', payload);
  return res.data;
}

export async function markNotificationRead(id: string) {
  const res = await client.post(`/notifications/${id}/read`, { id });
  return res.data;
}

export async function markAllRead() {
  const res = await client.post('/notifications/mark-all-read');
  return res.data;
}

export async function getPushPublicKey(): Promise<{ publicKey: string }> {
  const res = await client.get('/notifications/push/public-key');
  return res.data;
}

export async function savePushSubscription(subscription: PushSubscriptionJSON) {
  const res = await client.post('/notifications/push/subscribe', subscription);
  return res.data;
}
