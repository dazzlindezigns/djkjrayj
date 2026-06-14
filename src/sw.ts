/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  const data = (event as PushEvent).data?.json() ?? {};
  const title: string = data.title ?? 'DJ KJ Bookings';
  const options: NotificationOptions = {
    body: data.body ?? '',
    icon: '/icons/icon-512.png',
    badge: '/icons/icon-192.svg',
    tag: data.tag ?? 'djkj',
    data: { url: data.url ?? '/dashboard' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  (event as NotificationEvent).notification.close();
  const url: string = (event as NotificationEvent).notification.data?.url ?? '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return (client as WindowClient).focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
