const crypto = require('crypto');

module.exports = function (app) {
  const API = 'https://onesignal.com/api/v1';
  let webpush = null;
  try { webpush = require('web-push'); } catch (_) {}

  async function getMeta() {
    try {
      const snap = await store.getDb().collection('notificationMeta').doc('config').get();
      return snap.exists ? (snap.data() || {}) : {};
    } catch (_) { return {}; }
  }

  async function saveMeta(value) {
    await store.getDb().collection('notificationMeta').doc('config').set(value || {}, { merge: true });
  }

  function nativePushReady() {
    return !!(webpush && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
  }

  function configureNativePush() {
    if (nativePushReady()) {
      webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    }
  }
  configureNativePush();

  function authUser(req) {
    const token = req.headers['x-auth-token'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const payload = global.verifyJWT && global.verifyJWT(token);
    return payload && payload.uid ? store.getUser(payload.uid) : Promise.resolve(null);
  }

  function subscriptionId(subscription) {
    return crypto.createHash('sha256').update(String(subscription && subscription.endpoint || '')).digest('hex').slice(0, 40);
  }

  async function createNotification(userId, data) {
    const id = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
    const notification = {
      id,
      userId: String(userId),
      title: String(data.title || data.headings || 'إشعار جديد'),
      body: String(data.body || data.contents || ''),
      url: String(data.url || '/'),
      type: String(data.type || 'general'),
      read: false,
      createdAt: new Date().toISOString()
    };
    await store.saveDoc('notifications', id, notification);
    return notification;
  }

  async function sendNativePush(options) {
    if (!nativePushReady()) return { ok: false, reason: 'إشعارات Web Push غير مهيأة بعد' };
    const all = await store.all('pushSubscriptions');
    const ids = (options.userIds || []).map(String);
    const selected = all.filter(row => row && row.subscription && (!ids.length || ids.includes(String(row.userId))));
    if (!selected.length) return { ok: false, delivered: 0, reason: 'لا توجد أجهزة مفعّلة للإشعارات' };
    const payload = JSON.stringify({
      title: String(options.headings || 'إشعار جديد'),
      body: String(options.contents || ''),
      url: String(options.url || '/'),
      icon: String(options.icon || '/logo.png'),
      badge: String(options.badge || '/logo.png'),
      tag: String(options.tag || 'rab7na-notification'),
      data: options.data || {}
    });
    let delivered = 0;
    let removed = 0;
    await Promise.all(selected.map(async row => {
      try {
        await webpush.sendNotification(row.subscription, payload);
        delivered++;
      } catch (e) {
        const status = Number(e.statusCode || 0);
        if (status === 404 || status === 410) {
          await store.getDb().collection('pushSubscriptions').doc(String(row.id)).delete().catch(() => {});
          removed++;
        }
      }
    }));
    return { ok: delivered > 0, delivered, removed, channel: 'web-push' };
  }

  async function sendOneSignal(options) {
    const cfg = await getMeta();
    if (!cfg.appId || !cfg.restKey) return { ok: false, reason: 'OneSignal غير مهيأ' };
    const body = {
      app_id: cfg.appId,
      headings: { en: options.headings || '', ar: options.headings || '' },
      contents: { en: options.contents || '', ar: options.contents || '' },
      data: { url: options.url || '/' }
    };
    if (options.icon) body.chrome_web_icon = options.icon;
    if (options.image) body.big_picture = options.image;
    if (cfg.soundUrl) body.chrome_web_sound = cfg.soundUrl;
    if (options.ids && options.ids.length) body.include_player_ids = options.ids;
    else if (options.userIds && options.userIds.length) { body.include_aliases = { external_id: options.userIds.map(String) }; body.target_channel = 'push'; }
    else if (options.segments && options.segments.length) body.included_segments = options.segments;
    else body.included_segments = ['All'];
    if (options.schedule) body.send_after = options.schedule;
    try {
      const response = await fetch(API + '/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + cfg.restKey },
        body: JSON.stringify(body)
      });
      return { ok: response.ok, res: await response.json().catch(() => ({})), channel: 'onesignal' };
    } catch (error) {
      return { ok: false, error: String(error.message || error), channel: 'onesignal' };
    }
  }

  async function sendPush(options) {
    const native = await sendNativePush(options).catch(e => ({ ok: false, error: e.message }));
    const oneSignal = await sendOneSignal(options).catch(e => ({ ok: false, error: e.message }));
    return { ok: !!(native.ok || oneSignal.ok), native, oneSignal };
  }

  async function notifyUser(userId, title, body, url, type) {
    const u = await store.getUser(userId);
    if (!u) return { ok: false, reason: 'المستخدم غير موجود' };
    const notification = await createNotification(userId, { title, body, url, type });
    const push = await sendPush({ ids: u.playerId ? [u.playerId] : [], userIds: [u.id], headings: title, contents: body, url });
    return { ok: true, notification, push };
  }

  global.sendPush = sendPush;
  global.notifyUser = notifyUser;

  app.get('/api/notifications', global.requireAuth, async (req, res) => {
    try {
      const rows = await store.all('notifications');
      const userRows = rows.filter(n => String(n.userId) === String(req.userId)).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 100);
      res.json({ notifications: userRows, unread: userRows.filter(n => !n.read).length });
    } catch (e) { res.status(500).json({ error: 'تعذر تحميل الإشعارات' }); }
  });

  app.post('/api/notifications/read', global.requireAuth, async (req, res) => {
    try {
      const id = String((req.body || {}).id || '');
      if (id) {
        const n = await store.getDb().collection('notifications').doc(id).get();
        if (n.exists && String(n.data().userId) === String(req.userId)) await store.saveDoc('notifications', id, { read: true, readAt: new Date().toISOString() });
      } else {
        const rows = await store.all('notifications');
        await Promise.all(rows.filter(n => String(n.userId) === String(req.userId) && !n.read).map(n => store.saveDoc('notifications', n.id, { read: true, readAt: new Date().toISOString() })));
      }
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'تعذر تحديث الإشعار' }); }
  });

  app.get('/api/onesignal/config', async (req, res) => {
    const cfg = await getMeta();
    const appId = String(process.env.ONESIGNAL_APP_ID || cfg.appId || 'f283c3ca-8c41-49fe-800d-7a174920696d').trim();
    res.set('Cache-Control', 'no-store');
    res.json({ appId, nativePush: nativePushReady() });
  });

  app.get('/api/push/vapid-public-key', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ publicKey: String(process.env.VAPID_PUBLIC_KEY || '') });
  });

  app.post('/api/onesignal/config', global.requireAdmin, async (req, res) => {
    await saveMeta({ appId: req.body.appId || '', restKey: req.body.restKey || '', soundUrl: req.body.soundUrl || '' });
    res.json({ ok: true });
  });

  app.post('/api/notifications/register', global.requireAuth, async (req, res) => {
    try {
      const u = await store.getUser(req.userId);
      if (!u) return res.status(404).json({ error: 'المستخدم غير موجود' });
      if (req.body.playerId) u.playerId = String(req.body.playerId);
      if (req.body.externalId) u.notificationExternalId = String(req.body.externalId);
      if (req.body.playerId || req.body.externalId) await store.saveUser(u);
      if (req.body.subscription && req.body.subscription.endpoint) {
        const subscription = req.body.subscription;
        const id = subscriptionId(subscription);
        await store.saveDoc('pushSubscriptions', id, { id, userId: String(req.userId), subscription, active: true, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() });
      }
      res.json({ ok: true, nativePush: nativePushReady() });
    } catch (e) { res.status(500).json({ error: 'تعذر تفعيل الإشعارات' }); }
  });

  app.post('/api/notifications/unlink', global.requireAuth, async (req, res) => {
    try {
      const u = await store.getUser(req.userId);
      if (u) { delete u.playerId; delete u.notificationExternalId; await store.saveUser(u); }
      const rows = await store.all('pushSubscriptions');
      await Promise.all(rows.filter(x => String(x.userId) === String(req.userId)).map(x => store.getDb().collection('pushSubscriptions').doc(String(x.id)).delete().catch(() => {})));
      res.json({ ok: true });
    } catch (e) { res.json({ ok: true }); }
  });

  app.post('/api/notify', global.requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const title = String(b.headings || '').trim();
      const body = String(b.contents || '').trim();
      if (!title || !body) return res.status(400).json({ ok: false, error: 'أدخل عنوان الإشعار ونصه' });
      if (b.to === 'one' && b.userId) return res.json(await notifyUser(b.userId, title, body, b.url, b.type));
      const users = await store.getUsers();
      let selected = users;
      if (b.to === 'group') {
        const ids = (b.userIds || []).map(String);
        selected = users.filter(u => ids.includes(String(u.id)) || (b.field && b.filter && String(u[b.field]) === String(b.filter)));
      }
      if (!b.schedule) await Promise.all(selected.filter(u => u && u.id).map(u => createNotification(u.id, { title, body, url: b.url, type: b.type })));
      const result = await sendPush({ ids: selected.map(u => u.playerId).filter(Boolean), userIds: selected.map(u => u.id).filter(Boolean), headings: title, contents: body, url: b.url, image: b.image, schedule: b.schedule });
      res.json({ ok: !!result.ok, deliveredTo: selected.length, push: result, scheduled: !!b.schedule });
    } catch (e) { console.error('notify:', e.message); res.status(500).json({ ok: false, error: 'تعذر إرسال الإشعار حاليًا' }); }
  });

  app.get('/api/admin/notiflog', async (req, res) => {
    try { res.json((await store.all('notifications')).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 100)); }
    catch (e) { res.json([]); }
  });

  app.post('/api/admin/credit', async (req, res) => {
    const b = req.body || {};
    const u = await store.getUser(b.userId);
    if (!u) return res.json({ error: 'user' });
    u.manualCredits = (+u.manualCredits || 0) + (+b.amount || 0);
    u.balance = (+u.balance || 0) + (+b.amount || 0);
    u.salesCount = (+u.salesCount || 0) + 1;
    u.sales = u.sales || [];
    u.sales.unshift({ name: b.reason || 'عمولة', commission: +b.amount || 0 });
    await store.saveUser(u);
    await notifyUser(u.id, 'رصيد جديد', 'تمت إضافة ' + (+b.amount || 0) + ' ج.م لرصيدك', '/', 'balance');
    res.json({ ok: true });
  });
};
