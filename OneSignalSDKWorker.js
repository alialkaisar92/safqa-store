/* OneSignal compatibility plus native Web Push handling */
try { importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js'); } catch (e) {}

self.addEventListener('push', function(event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || data.headings || 'rab7na';
  const body = data.body || data.contents || 'لديك إشعار جديد';
  const url = data.url || (data.data && data.data.url) || '/store';
  event.waitUntil(self.registration.showNotification(title, {
    body: body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: { url: url },
    tag: data.tag || 'rab7na-notification',
    renotify: true
  }));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/store';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
    for (const client of clients) { if ('focus' in client) { client.navigate(target); return client.focus(); } }
    return self.clients.openWindow(target);
  }));
});
