importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

self.addEventListener('push', function (event) {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch (_) { data = { body: event.data.text() }; }
  const title = data.title || 'rab7na';
  const options = {
    body: data.body || 'لديك إشعار جديد من rab7na',
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    tag: data.tag || 'rab7na-notification',
    renotify: true,
    data: { url: data.url || (data.data && data.data.url) || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async function () {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if ('focus' in client) {
        if ('navigate' in client) await client.navigate(new URL(url, self.location.origin).href);
        return client.focus();
      }
    }
    return self.clients.openWindow(new URL(url, self.location.origin).href);
  })());
});
