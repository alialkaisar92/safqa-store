const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
try{const _f=require('fs');const _ep=require('path').join(__dirname,'.env');if(_f.existsSync(_ep)){const _c=_f.readFileSync(_ep,'utf8');const _re=/^([A-Z0-9_]+)=(.*)$/gm;let _m;while((_m=_re.exec(_c))){if(process.env[_m[1]]===undefined)process.env[_m[1]]=_m[2].trim();}}}catch(_e){}
const API_KEY = process.env.SAFKA_API_KEY || '';
const BASE_URL='https://api.safka-eg.com/api/v1/public';
const safkaSync = require('./safka-sync');
const { getProductStock, getProductStockState } = require('./stock-utils');
const { availableBalance, commissionEligibleStatus } = require('./balance');
const easyordersDb = require('./services/db');
const easyordersRoutes = require('./routes/easyorders.routes');
app.use(express.json({limit:'50mb'}));
// Affiliate/EasyOrders module: initialize its local persistence before mounting protected routes.
try { easyordersDb.initDb(); } catch (e) { console.error('[easyorders] database initialization failed:', e.message); }
app.use('/api/easyorders', easyordersRoutes);

app.get('/', (req, res) => {
  res.set({ 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate', 'CDN-Cache-Control': 'no-store', Pragma: 'no-cache' });
  res.sendFile(path.join(__dirname, 'index.html'));
});

const crypto = require('crypto');
const firestore = require('./firestore');
const postgres = require('./lib/postgres');
const authService = require('./services/auth-postgres');
const aiAssistant = require('./services/ai-assistant');
const SESSION_COOKIE = 'rab7na_session';
function readCookie(req, name) { const raw = String(req.headers.cookie || ''); const found = raw.split(';').map(x => x.trim()).find(x => x.startsWith(name + '=')); return found ? decodeURIComponent(found.slice(name.length + 1)) : ''; }
function authToken(req) { return authReqToken(req) || readCookie(req, SESSION_COOKIE); }
function setSessionCookie(res, token) { const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''; res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${secure}`); }
function clearSessionCookie(res) { res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`); }
const passwordResetAttempts = new Map();
const PASSWORD_RESET_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
function normalizePublicSiteUrl() {
  const candidate = String(process.env.PUBLIC_SITE_URL || 'https://rab7na-store.vercel.app').trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol');
    return parsed.toString().replace(/\/$/, '');
  } catch (_) {
    return 'https://rab7na-store.vercel.app';
  }
}
function safeResetReturnPath(value) {
  const pathValue = String(value || '/store').trim();
  return pathValue.startsWith('/') && !pathValue.startsWith('//') ? pathValue.slice(0, 200) : '/store';
}
function passwordResetRateAllowed(req, email) {
  const now = Date.now();
  const keys = [`ip:${String(req.ip || 'unknown')}`, `email:${String(email || '').toLowerCase()}`];
  for (const key of keys) {
    const current = passwordResetAttempts.get(key);
    if (current && now - current.startedAt < PASSWORD_RESET_WINDOW_MS && current.count >= PASSWORD_RESET_MAX_ATTEMPTS) return false;
  }
  for (const key of keys) {
    const current = passwordResetAttempts.get(key);
    if (!current || now - current.startedAt >= PASSWORD_RESET_WINDOW_MS) passwordResetAttempts.set(key, { startedAt: now, count: 1 });
    else current.count += 1;
  }
  if (passwordResetAttempts.size > 5000) {
    for (const [key, value] of passwordResetAttempts) if (now - value.startedAt >= PASSWORD_RESET_WINDOW_MS) passwordResetAttempts.delete(key);
  }
  return true;
}
function resetUrl(token, returnPath) {
  const url = new URL('/reset-password', normalizePublicSiteUrl());
  url.searchParams.set('token', token);
  url.searchParams.set('return', safeResetReturnPath(returnPath));
  return url.toString();
}
function escapeEmailHtml(value) { return String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
async function sendPasswordResetEmail({ to, name, url }) {
  const resendKey = String(process.env.RESEND_API_KEY || '').trim();
  const resendFrom = String(process.env.RESEND_FROM || '').trim();
  const smtpHost = String(process.env.EMAIL_HOST || '').trim();
  const smtpUser = String(process.env.EMAIL_USER || '').trim();
  const smtpPassword = String(process.env.EMAIL_PASSWORD || '').trim();
  const smtpFrom = String(process.env.EMAIL_FROM || smtpUser).trim();
  const subject = 'استعادة كلمة مرور حسابك في Rab7na';
  const greeting = String(name || '').trim() || 'مرحبًا';
  const greetingHtml = escapeEmailHtml(greeting);
  const text = `${greeting}،

طلبنا استعادة كلمة المرور لحسابك في Rab7na. افتح الرابط التالي خلال 30 دقيقة لإنشاء كلمة مرور جديدة:
${url}

إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة. لن نطلب منك إرسال كلمة المرور أو رمز الاستعادة لأي شخص.`;
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8;color:#18352a;max-width:560px;margin:auto"><h2 style="color:#0b5d3b">استعادة كلمة المرور</h2><p>${greetingHtml}،</p><p>وصلنا طلب لاستعادة كلمة مرور حسابك في Rab7na. اضغط الزر التالي خلال <strong>30 دقيقة</strong> لإنشاء كلمة مرور جديدة:</p><p><a href="${url}" style="display:inline-block;background:#0b5d3b;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">إنشاء كلمة مرور جديدة</a></p><p style="word-break:break-all;color:#51645a">إذا لم يعمل الزر، انسخ هذا الرابط إلى المتصفح:<br>${url}</p><p>إذا لم تطلب الاستعادة، تجاهل الرسالة. لن نطلب منك إرسال كلمة المرور أو رمز الاستعادة لأي شخص.</p></div>`;
  let resendFailure = '';
  if (resendKey && resendFrom) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'User-Agent': 'rab7na-store/1.0' },
      body: JSON.stringify({ from: resendFrom, to: [to], subject, html, text })
    });
    if (response.ok) return 'resend';
    resendFailure = `RESEND_${response.status}`;
  }
  if (smtpHost && smtpUser && smtpPassword && smtpFrom) {
    try {
      const nodemailer = require('nodemailer');
      const port = Number(process.env.EMAIL_PORT || 587);
      const secure = String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true' || port === 465;
      const transporter = nodemailer.createTransport({ host: smtpHost, port, secure, requireTLS: !secure, auth: { user: smtpUser, pass: smtpPassword } });
      await transporter.sendMail({ from: smtpFrom, to, subject, text, html });
      return 'smtp';
    } catch (smtpError) {
      const error = new Error('SMTP rejected password reset email');
      error.code = `SMTP_${smtpError && smtpError.code ? String(smtpError.code).replace(/[^A-Z0-9_-]/gi, '').slice(0, 40) : 'SEND_FAILED'}`;
      if (resendFailure) error.code = `${resendFailure}_${error.code}`;
      throw error;
    }
  }
  const error = new Error('Password reset mail transport is not configured');
  error.code = resendFailure || 'MAIL_NOT_CONFIGURED';
  throw error;
}
let postgresStatus = process.env.DATABASE_URL ? 'configured' : 'not_configured';
async function initializePostgres() {
  if (!process.env.DATABASE_URL) return;
  try { await postgres.migrate(); postgresStatus = 'ready'; console.log('[postgres] schema ready'); }
  catch (error) { postgresStatus = 'error'; console.error('[postgres] initialization failed:', error.message); }
}
const postgresReady = initializePostgres();
let orderQueueWorkerTimer = null;
let orderQueueWorkerBusy = false;
async function runOrderQueueWorkerCycle() {
  if (orderQueueWorkerBusy || postgresStatus !== 'ready') return;
  orderQueueWorkerBusy = true;
  try {
    const result = await safkaSync.processAffiliateOrderQueue(5);
    if (result && result.processed) console.log('[order-queue] worker_cycle', { processed: result.processed });
  } catch (error) {
    console.error('[order-queue] worker_cycle_failed:', error.message);
  } finally {
    orderQueueWorkerBusy = false;
  }
}
function startOrderQueueWorker() {
  if (orderQueueWorkerTimer || process.env.VERCEL === '1' || String(process.env.ORDER_QUEUE_WORKER_ENABLED || 'true').toLowerCase() === 'false') return;
  const intervalMs = Math.max(2000, Number(process.env.ORDER_QUEUE_WORKER_INTERVAL_MS) || 5000);
  void runOrderQueueWorkerCycle();
  orderQueueWorkerTimer = setInterval(() => { void runOrderQueueWorkerCycle(); }, intervalMs);
  if (orderQueueWorkerTimer.unref) orderQueueWorkerTimer.unref();
  console.log('[order-queue] worker_started', { interval_ms: intervalMs });
}
function stopOrderQueueWorker() {
  if (orderQueueWorkerTimer) { clearInterval(orderQueueWorkerTimer); orderQueueWorkerTimer = null; }
}
function authReqToken(req){const h=String(req.headers.authorization||'');return String(req.headers['x-auth-token']||req.headers['x-sq-token']||(h.toLowerCase().indexOf('bearer ')===0?h.slice(7):'')||'').trim();}
async function currentAuthUser(req){const token=authToken(req);if(!token)return null;try{return await authService.currentUser(token);}catch(e){return null;}}

let webpush = null;
try { webpush = require('web-push'); } catch (_) {}
const vapidPublicKey = String(process.env.VAPID_PUBLIC_KEY || '').trim();
const vapidPrivateKey = String(process.env.VAPID_PRIVATE_KEY || '').trim();
const vapidSubject = String(process.env.VAPID_SUBJECT || '').trim();
const nativePushReady = Boolean(webpush && vapidPublicKey && vapidPrivateKey && vapidSubject);
if (nativePushReady) {
  try { webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey); }
  catch (error) { console.error('[push] VAPID configuration rejected:', error.message); }
}
const notificationStreams = new Map();
const supportEventStreams = new Set();
function streamSupportEvent(event) {
  if (!event) return;
  const packet = 'data: ' + JSON.stringify(event) + '\n\n';
  for (const write of supportEventStreams) { try { write(packet); } catch (_) {} }
}
function registerSupportEventStream(write) {
  if (typeof write !== 'function') return () => {};
  supportEventStreams.add(write);
  return () => supportEventStreams.delete(write);
}
function streamNotification(userId, notification) {
  const set = notificationStreams.get(String(userId));
  if (!set) return;
  const packet = 'data: ' + JSON.stringify(notification) + '\n\n';
  for (const write of set) { try { write(packet); } catch (_) {} }
}
function publishNotification(notification) {
  if (!notification || notification.userId == null) return;
  streamNotification(notification.userId, notification);
}
async function sendNativePushToUsers(userIds, data) {
  if (!nativePushReady) return { configured: false, delivered: 0, removed: 0 };
  const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).map(value => String(value || '').trim()).filter(Boolean))];
  const subscriptions = await postgres.listPushSubscriptionsForUsers(ids);
  if (!subscriptions.length) return { configured: true, delivered: 0, removed: 0 };
  const payload = JSON.stringify({ title: String(data.title || 'إشعار جديد'), body: String(data.body || ''), url: String(data.url || '/store'), icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: String(data.tag || 'rab7na-notification'), data: { url: String(data.url || '/store') } });
  let delivered = 0;
  let removed = 0;
  await Promise.all(subscriptions.map(async item => {
    const subscription = { endpoint: item.endpoint, expirationTime: item.expiration_time == null ? null : Number(item.expiration_time), keys: { p256dh: item.p256dh, auth: item.auth } };
    try { await webpush.sendNotification(subscription, payload); delivered++; await postgres.markPushSuccess(item.endpoint); }
    catch (error) {
      const code = Number(error && error.statusCode || 0);
      if (code === 404 || code === 410) { removed++; await postgres.markPushFailure(item.endpoint, true).catch(() => null); }
      else await postgres.markPushFailure(item.endpoint, false).catch(() => null);
    }
  }));
  return { configured: true, delivered, removed };
}
async function notifyUser(userId, title, body, url, type, eventKey) {
  const result = await postgres.createNotification({ userId, title, body, url: url || '/store', type: type || 'info', eventKey: eventKey || null });
  if (!result.created || !result.notification) return Object.assign({ push: { configured: nativePushReady, delivered: 0 } }, result);
  streamNotification(userId, result.notification);
  const push = await sendNativePushToUsers([userId], { title, body, url: url || '/store', tag: eventKey || type || 'rab7na-notification' }).catch(() => ({ configured: nativePushReady, delivered: 0 }));
  return Object.assign({ push }, result);
}
async function notifyBroadcast(input) {
  const value = input && typeof input === 'object' ? input : {};
  const idsResult = await postgres.query('SELECT id FROM users WHERE banned IS NOT TRUE ORDER BY id');
  const userIds = idsResult.rows.map(row => String(row.id));
  let created = { created: 0, notifications: [], eventKey: value.eventKey || null };
  if (Array.isArray(value.userIds) && value.userIds.length) {
    const allowed = new Set(userIds);
    const selected = [...new Set(value.userIds.map(String))].filter(id => allowed.has(id));
    const outputs = [];
    for (const id of selected) outputs.push(await notifyUser(id, value.title, value.body, value.url, value.type, value.eventKey ? value.eventKey + ':' + id : null));
    return { created: outputs.filter(item => item.created).length, notifications: outputs.map(item => item.notification).filter(Boolean), push: await sendNativePushToUsers(selected, value) };
  }
  created = await postgres.createBroadcastNotifications(value);
  for (const notification of created.notifications) { streamNotification(notification.userId, notification); }
  const push = await sendNativePushToUsers(userIds, { title: value.title, body: value.body, url: value.url, tag: value.eventKey || 'rab7na-broadcast' });
  return Object.assign(created, { push });
}
async function notifySupport(input) {
  if (!postgres.createSupportEvent) return { created: false, event: null, skipped: true };
  try {
    const result = await postgres.createSupportEvent(input);
    if (!result.created || !result.event) return result;
    streamSupportEvent(result.event);
    let push = { configured: nativePushReady, delivered: 0, removed: 0 };
    try {
      const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
      const adminUserId = String(process.env.ADMIN_USER_ID || '').trim();
      const recipientClauses = ["role IN ('owner','admin','manager','support')"];
      const recipientParams = [];
      if (adminEmail) { recipientParams.push(adminEmail); recipientClauses.push(`LOWER(email)=$${recipientParams.length}`); }
      if (adminUserId && /^\d+$/.test(adminUserId)) { recipientParams.push(adminUserId); recipientClauses.push(`id=$${recipientParams.length}`); }
      const admins = await postgres.query(`SELECT id FROM users WHERE banned IS NOT TRUE AND (${recipientClauses.join(' OR ')}) ORDER BY id`, recipientParams);
      push = await sendNativePushToUsers(admins.rows.map(row => row.id), { title: result.event.title, body: result.event.body, url: '/admin', tag: 'support-event:' + result.event.id });
    } catch (_) {}
    return Object.assign({}, result, { push });
  } catch (error) {
    console.warn('[support-events] skipped:', error.message);
    return { created: false, event: null, skipped: true };
  }
}

async function notifyProductCatalogChanges(changes) {
  const rows = Array.isArray(changes) ? changes.filter(item => item && item.id && item.fingerprint) : [];
  if (!rows.length || !global.notifyBroadcast) return { skipped: true, count: 0 };
  const unique = [...new Map(rows.map(item => [String(item.id) + ':' + String(item.fingerprint), { id: String(item.id), name: String(item.name || 'منتج').trim().slice(0, 120), kind: item.kind === 'added' ? 'added' : 'updated', fingerprint: String(item.fingerprint) }])).values()];
  const added = unique.filter(item => item.kind === 'added');
  const updated = unique.filter(item => item.kind === 'updated');
  const names = unique.slice(0, 2).map(item => item.name).filter(Boolean).join('، ');
  const title = added.length && !updated.length ? 'منتج جديد جاهز للتسويق' : 'تحديث جديد في المنتجات';
  let body;
  if (unique.length === 1) body = (added.length ? 'اتضاف منتج جديد' : 'اتحدّث منتج') + (names ? `: ${names}` : '') + '. افتح الكتالوج وشوف التفاصيل.';
  else body = `اتضاف ${added.length} منتج واتحدّث ${updated.length} منتج في الكتالوج.` + (names ? ` مثال: ${names}.` : '') + ' افتح الكتالوج لمراجعة آخر التحديثات.';
  const eventKey = 'product-catalog:' + crypto.createHash('sha256').update(JSON.stringify(unique.map(item => [item.id, item.kind, item.fingerprint]).sort())).digest('hex').slice(0, 32);
  const result = await global.notifyBroadcast({ title, body, url: '/store', type: 'product-catalog', eventKey });
  await notifySupport({ title, body, type: 'product-catalog', priority: added.length ? 'high' : 'normal', entityType: 'product', entityId: unique.length === 1 ? unique[0].id : null, eventKey: 'support:' + eventKey, payload: { added: added.length, updated: updated.length, productIds: unique.slice(0, 100).map(item => item.id) } });
  return result;
}

global.notifyUser = notifyUser;
global.notifyBroadcast = notifyBroadcast;
global.notifyProductCatalogChanges = notifyProductCatalogChanges;
global.notifySupport = notifySupport;
global.registerSupportEventStream = registerSupportEventStream;
global.publishNotification = publishNotification;
global.sendNativePushToUsers = sendNativePushToUsers;
global.notifyProductCatalogChanges = notifyProductCatalogChanges;

app.get('/api/notifications', async (req, res) => {
  const user = await currentAuthUser(req);
  if (!user) return res.status(401).json({ error: 'يجب تسجيل الدخول أولًا' });
  try { const notifications = await postgres.listNotifications(user.id, { limit: req.query.limit, beforeId: req.query.beforeId }); const unread = await postgres.countUnreadNotifications(user.id); res.set('Cache-Control', 'no-store'); res.json({ notifications, unread, push: { configured: nativePushReady, permissionRequired: true } }); }
  catch (error) { console.error('[notifications] list failed:', error.message); res.status(503).json({ error: 'تعذر تحميل الإشعارات حاليًا' }); }
});
app.post('/api/notifications/read', async (req, res) => {
  const user = await currentAuthUser(req);
  if (!user) return res.status(401).json({ error: 'يجب تسجيل الدخول أولًا' });
  try { const id = String(req.body && req.body.id || '').trim(); if (id) { const notification = await postgres.markNotificationRead(user.id, id); if (!notification) return res.status(404).json({ error: 'الإشعار غير موجود' }); } else await postgres.markAllNotificationsRead(user.id); res.json({ ok: true, unread: await postgres.countUnreadNotifications(user.id) }); }
  catch (error) { console.error('[notifications] read failed:', error.message); res.status(503).json({ error: 'تعذر تحديث الإشعار حاليًا' }); }
});
app.get('/api/notifications/stream', async (req, res) => {
  const user = await currentAuthUser(req);
  if (!user) return res.status(401).end();
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write('event: ready\ndata: {}\n\n');
  const key = String(user.id);
  const set = notificationStreams.get(key) || new Set();
  const write = packet => res.write(packet);
  set.add(write); notificationStreams.set(key, set);
  const heartbeat = setInterval(() => { try { res.write(': heartbeat\n\n'); } catch (_) {} }, 25000);
  req.on('close', () => { clearInterval(heartbeat); set.delete(write); if (!set.size) notificationStreams.delete(key); });
});
app.get('/api/push/vapid-public-key', (req, res) => { res.set('Cache-Control', 'no-store'); res.json({ publicKey: nativePushReady ? vapidPublicKey : '', configured: nativePushReady }); });
app.post('/api/notifications/register', async (req, res) => {
  const user = await currentAuthUser(req);
  if (!user) return res.status(401).json({ error: 'يجب تسجيل الدخول أولًا' });
  try { const saved = await postgres.upsertPushSubscription(user.id, req.body && req.body.subscription); res.status(201).json({ ok: true, configured: nativePushReady, subscriptionId: String(saved.id) }); }
  catch (error) { res.status(400).json({ error: error.message === 'اشتراك الإشعارات غير مكتمل' ? error.message : 'تعذر تسجيل جهاز الإشعارات' }); }
});
app.post('/api/notifications/unlink', async (req, res) => {
  const user = await currentAuthUser(req);
  if (!user) return res.status(401).json({ error: 'يجب تسجيل الدخول أولًا' });
  try { const rows = await postgres.listPushSubscriptions(user.id); for (const row of rows) await postgres.deletePushSubscription(user.id, row.endpoint); res.json({ ok: true }); }
  catch (error) { res.status(503).json({ error: 'تعذر إلغاء اشتراك الإشعارات' }); }
});

// ===== MAIN STORE ROUTES =====
app.get('/store', (req, res) => {
  res.set({ 'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate', 'CDN-Cache-Control': 'no-store', Pragma: 'no-cache' });
  res.sendFile(path.join(__dirname, 'store2.html'));
});

// Keep legacy storefront links from opening the retired UI.
app.get(['/s', '/storefront', '/storefront.html'], (req, res) => res.redirect(302, '/store'));
app.get('/shop', (req, res) => res.redirect(302, '/store'));

app.get('/api/health',async function(req,res){
  try { await postgresReady; } catch (_) {}
  const healthy = postgresStatus === 'ready';
  res.status(healthy ? 200 : 503).json({ok:healthy,status:healthy?'healthy':'degraded',service:'rab7na',database:'postgresql',database_status:postgresStatus,time:new Date().toISOString()});
});
app.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});


// Serve only the frontend assets that are intentionally public. Never expose source, database, logs, backups, or runtime files via express.static.
const PUBLIC_STATIC_FILES = new Set([
  'landing.html', 'store2.html', 'login.html', 'reset-password.html', 'admin.html', 'dashboard.html', 'orders.html', 'admin-categories.html', 'marketer.html', 'gate.html', 'index.html',
  'theme-emerald.css', 'polish.css', 'support-chat.css', 'support-chat.js', 'store-enh.css', 'store-enh.js', 'store-app.js', 'auth-ui.js', 'orders-system.js',
  'sw.js', 'manifest.json', 'OneSignalSDKWorker.js', 'OneSignalSDKUpdaterWorker.js'
]);
const PUBLIC_STATIC_DIRS = new Set(['icons']);
function isPublicStaticPath(requestPath) {
  let value;
  try { value = decodeURIComponent(String(requestPath || '').split('?')[0]); } catch (_) { return false; }
  if (!value || value.includes('\0') || value.includes('..')) return false;
  const relative = value.replace(/^\/+/, '');
  if (!relative || relative.startsWith('api/') || relative.startsWith('uploads/')) return false;
  const slash = relative.indexOf('/');
  if (slash > 0 && PUBLIC_STATIC_DIRS.has(relative.slice(0, slash))) return true;
  return PUBLIC_STATIC_FILES.has(relative);
}
const publicStatic = express.static(__dirname, { dotfiles: 'deny', index: false, fallthrough: true });
const safeStatic = (req, res, next) => isPublicStaticPath(req.path) ? publicStatic(req, res, next) : next();

// Uploaded files are private: a signed-in user can retrieve only files bearing their own user prefix.
app.get('/uploads/:file', async (req, res) => {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: 'يجب تسجيل الدخول لعرض الملف' });
  let file;
  try { file = decodeURIComponent(String(req.params.file || '')); } catch (_) { return res.status(404).end(); }
  if (!/^[A-Za-z0-9._-]+$/.test(file) || !file.startsWith('u' + String(user.id) + '-')) return res.status(404).end();
  const filePath = path.join(__dirname, 'uploads', file);
  return res.sendFile(filePath, { headers: { 'Cache-Control': 'private, no-store' } }, error => {
    if (error && !res.headersSent) res.status(error.statusCode === 403 ? 403 : 404).end();
  });
});

app.use(safeStatic);
app.get('/login',(req,res)=>res.sendFile(require('path').join(__dirname,'login.html')));
// ===== Modern store (store2) =====






app.get('/googleb92b2cd0a1a64ca9.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'googleb92b2cd0a1a64ca9.html'));
});

app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});



app.get('/googleb92b2cd0a1a64ca9.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'googleb92b2cd0a1a64ca9.html'));
});

app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});
// SEO helpers: public product pages use real cached product data only.
const SEO_ORIGIN = process.env.PUBLIC_SITE_URL || 'https://rab7na-store.vercel.app';
function seoEsc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function seoText(v){return String(v||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
function sitemapSlug(p){
  const base = seoText(p.name||'product').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,80);
  return (base||'product')+'-'+String(p.id||p._id||'').slice(-8);
}
function readSeoProducts(){try{const fp=path.join(__dirname,'products-cache.json');const d=JSON.parse(fs.readFileSync(fp,'utf8'));return Array.isArray(d)?d:[];}catch(e){return [];}}
function findSeoProduct(slug){const all=readSeoProducts();return all.find(p=>sitemapSlug(p)===slug || String(p.id||p._id)===slug);}
function seoDescription(p){const d=seoText(p.description||p.desc||'');return (d||('اكتشف '+seoText(p.name)+' على rab7na، مع معلومات المنتج والسعر والتوفر.')).slice(0,160);}
function productAvailability(p){return p.available===false || p.is_active===false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock';}

let productsCache = [], priceListCache = [], lastFetch = 0;
let stockProbeLoggedAt = 0;
let stockSnapshot = [];
let stockSnapshotAt = 0;
let stockSnapshotPromise = null;
let affiliateSnapshot = null, affiliateSnapshotAt = 0;
async function getAffiliateSnapshotFast(force) {
  if (!force && affiliateSnapshot && Date.now() - affiliateSnapshotAt < 15000) return affiliateSnapshot;
  try {
    affiliateSnapshot = await postgres.getAffiliateCatalogData();
    affiliateSnapshotAt = Date.now();
  } catch (e) {}
  return affiliateSnapshot || {};
}
async function currentUser(req){ try { return await currentAuthUser(req); } catch(e) { return null; } }

const aiRateLimits = new Map();
function aiRateLimit(userId) {
  const key = String(userId || '');
  const now = Date.now();
  const current = aiRateLimits.get(key) || { startedAt: now, count: 0 };
  if (now - current.startedAt >= 5 * 60 * 1000) { current.startedAt = now; current.count = 0; }
  current.count += 1;
  aiRateLimits.set(key, current);
  return { allowed: current.count <= 12, remaining: Math.max(0, 12 - current.count), resetAt: current.startedAt + 5 * 60 * 1000 };
}

function aiErrorStatus(error) {
  if (!error) return 500;
  if (error.code === 'INVALID_INPUT') return 400;
  if (error.code === 'PROVIDER_UNAVAILABLE') return 503;
  if (error.status === 401 || error.status === 403) return 503;
  if (error.status === 429) return 429;
  return 503;
}

async function requireAffiliateAiUser(req, res) {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: 'سجّل الدخول بحساب المسوق أولًا' }); return null; }
  if (user.banned) { res.status(403).json({ error: 'الحساب غير مسموح له باستخدام المساعد' }); return null; }
  return user;
}

async function readAffiliate(){ return firestore.getAffiliateData(); }
async function saveAffiliate(d){ return firestore.saveAffiliateData(d); }
async function syncUserBalance(user, affiliate) {
  const next = availableBalance(user, affiliate);
  if (Number(user.balance || 0) !== next) { user.balance = next; await firestore.saveUser(user); }
  return next;
}
async function syncUserBalanceScoped(user, records) {
  const next = availableBalance(user, { orders: records && records.orders || [], withdrawals: records && records.withdrawals || [] });
  if (Number(user.balance || 0) !== next) { user.balance = next; await firestore.saveUser(user); }
  return next;
}

function cat(n) {
  if (!n) return 'أخرى';
  const text = String(n).toLowerCase().replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه');
  const has = (pattern) => pattern.test(text);
  if (has(/لعبه|العاب|لعبة|اطفال|طفل|رضع|بيبي|baby|kids|عروسه|بازل|دمى|دمية|كرة قدم|اخطبوط راقص|عصفوره|سكوتر اطفال|كرسي امان الاطفال/)) return 'أطفال';
  if (has(/سياره|السياره|سيارات|عربيه|عربية|للسياره|للسيارات|تكييف السياره|كرسي السياره|منظم ظهر كرسي السياره|كفر.*سياره/)) return 'سيارات';
  if (has(/ضغط الدم|دوبلر|نبض الجنين|ركبه طبيه|جامع البول|اسنان|الاسنان|شفاط الحليب|شفاط المخاط|مقاومه رياضيه|تمارين|تويست|تقويه الصدر|سكيت بورد|مساج|تدليك|لياقه|رياضه/)) return 'صحة ولياقة';
  if (has(/شعر|رموش|اظافر|كريم|عطر|مكياج|عنايه|بشره|سيروم|تجاعيد|ازاله الشعر|حلاقه|مصفف|تمويج الشعر|فواحه/)) return 'جمال';
  if (has(/حذاء|شبشب|حقيبه|شنطه|كعب|طاقيه|غطاء حذاء|ملابس|جاكيت|جوارب/)) return 'أحذية وحقائب';
  if (has(/مطبخ|شوايه|خضروات|فواكه|قطايف|سمبوسه|هراسه|قشاره|ثوم|سكاكين|اواني|حوض|بوتجاز|دسبنسر مياه|مياه|ثلاجه|غساله/)) return 'مطبخ';
  if (has(/تنظيف|منظف|بقع|وبر|ازاله الوبر|فرشه التنظيف|فرشاة التنظيف|مساحه|تكييف|اقمشه|مفروشات|غسيل/)) return 'تنظيف';
  if (has(/مفك|شنيور|منشار|مسامير|مسدس تثبيت|مسدس المسامير|لحام|عدة|ادوات|قلم اللحام|تثبيت الملايه|اصلاح/)) return 'أدوات';
  if (has(/شاحن|سماعه|باور|كابل|usb|led|لمبه|اباجوره|بلوتوث|كشاف|كاميرا|كيبورد|موبايل|موبيل|هاتف|جهاز العاب|العاب محمول|retroplay|r36s|طاقة شمسيه|solar|ترجمه|قلم ذكي|جهاز قياس|شريط مضيء|اضاءه/)) return 'إلكترونيات';
  if (has(/منزل|ديكور|منظم|رف|ستاره|مفرش|ملايه|كرسي|بين باج|حامل|وساده|فواحه|قنديل|حدائق|تخزين|دولاب/)) return 'منزل';
  return 'أخرى';
}

async function getProducts() {
  if (productsCache.length && Date.now() - lastFetch < 600000) return productsCache;
  console.log('جاري جلب المنتجات...');
  let all = [];
  try {
    const r1 = await fetch(BASE_URL + '/products?page=1&size=50', { headers: { 'api-safka-key': API_KEY } });
    const d1 = await r1.json();
    all = all.concat(d1.data || []);
    const pages = Math.min(d1.pages || 1, 8);
    for (let p = 2; p <= pages; p++) {
      const r = await fetch(BASE_URL + '/products?page=' + p + '&size=50', { headers: { 'api-safka-key': API_KEY } });
      const d = await r.json();console.log('SAFKA order:',r.status,JSON.stringify(d));
      all = all.concat(d.data || []);
    }
  } catch (e) { console.error(e.message); }
  all = all.map(p => { p._cat = cat([p.name, p.title, p.description, p.desc, p.note, p.category].filter(Boolean).join(' ')); return p; });
  productsCache = all;
  lastFetch = Date.now();
  console.log('تم تحميل ' + all.length + ' منتج');
  return all;
}

async function getPriceList() {
  if (priceListCache.length) return priceListCache;
  try {
    const r = await fetch(BASE_URL + '/price-list?page=1&size=50', { headers: { 'api-safka-key': API_KEY } });
    const d = await r.json();
    priceListCache = (d.data || []).filter(g => g.is_active !== false);
  } catch (e) { console.error(e.message); }
  return priceListCache;
}

function sourceStock(p) {
  return getProductStock(p).quantity;
}
function extractCommission(note) {
  if (!note) return 0;
  const text = String(note).replace(/,/g, '');

  const patterns = [
    /عمولتك\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    /العمولة\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    /commission\s*[:\-]?\s*(\d+(?:\.\d+)?)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]) || 0;
  }

  console.warn("⚠️ فشل استخراج العمولة من note:", JSON.stringify(note)); return 0;
}
function extractSuggestedSalePrice(note, base) {
  if (!note) return 0;
  const text = String(note).replace(/,/g, '');
  const match = text.match(/سعر\s*البيع\s*المقترح\s*[:\-]?\s*(\d+(?:\.\d+)?)/i)
    || text.match(/suggested\s*sale\s*price\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  if (!match) return 0;
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= Number(base || 0) ? value : 0;
}
function productWholesalePrice(base, priceUp) {
  // نسبة الأدمن تغيّر سعر الجملة القادم من API فقط؛ لا تُطبّق على سعر البيع المقترح.
  const safeBase = Math.max(0, Number(base || 0));
  const safeUp = Math.max(0, Math.min(200, Number(priceUp) || 0));
  return Math.round(safeBase * (1 + safeUp / 100));
}
function productSuggestedSalePrice(raw, wholesale) {
  const value = raw || {};
  const floor = Math.max(0, Number(wholesale || 0));
  const candidates = [value.suggestedSalePrice, value.suggested_sale_price, value.recommendedSalePrice, value.recommended_sale_price];
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '' && Number.isFinite(Number(candidate))) return Math.max(floor, Math.round(Number(candidate)));
  }
  const fromNote = extractSuggestedSalePrice(value.note || '', floor);
  return Math.max(floor, Math.round(Number(fromNote) || 0));
}

function sourceAvailability(p) {
  return getProductStockState(p).available === true;
}
function productMedia(p, local) {
  const first = (...values) => values.find(v => v !== undefined && v !== null && String(v).trim()) || '';
  return {
    media: first(local && local.media, local && local.media_url, local && local.drive, p && p.media, p && p.media_url),
    mediaImages: first(local && local.mediaImages, local && local.media_images, local && local.images_drive, local && local.drive_images, p && p.mediaImages, p && p.media_images, p && p.images_drive, p && p.drive_images),
    mediaVideo: first(local && local.mediaVideo, local && local.media_video, local && local.video_url, local && local.drive_video, p && p.mediaVideo, p && p.media_video, p && p.video_url, p && p.drive_video)
  };
}
function wholesalePriceOf(value) {
  const raw = value || {};
  const candidates = [raw.rawWholesalePrice, raw.sale_price, raw.basePrice, raw.base_price, raw.wholesalePrice, raw.wholesale_price, raw.cost];
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '' && Number.isFinite(Number(candidate))) return Math.max(0, Number(candidate));
  }
  return 0;
}
function normalizePublicProduct(p, local, priceUp) {
  const raw = p || {};
  const prop = (raw.properties && raw.properties[0]) || {};
  const stockState = getProductStockState(raw);
  const stock = stockState.quantity;
  const merged = Object.assign({}, raw, local || {});
  const media = productMedia(raw, local || {});
  const category = cat([raw.name, raw.title, merged.description, raw.description, raw.desc, raw.note, raw.category].filter(Boolean).join(' '));
  const rawWholesale = wholesalePriceOf(raw);
  const base = productWholesalePrice(rawWholesale, priceUp);
  const note = raw.note || merged.note || '';
  const suggestedSale = productSuggestedSalePrice(Object.assign({}, raw, { note }), base);
  const adminLocked = merged.adminPriceLocked === true || merged.admin_price_locked === true;
  const adminSale = Number(merged.adminSalePrice != null ? merged.adminSalePrice : merged.admin_sale_price);
  const lockedSale = adminLocked && Number.isFinite(adminSale) && adminSale >= base ? Math.round(adminSale) : null;
  const adminCommission = Number(merged.adminCommission != null ? merged.adminCommission : merged.admin_commission);
  const effectiveSale = lockedSale != null ? lockedSale : suggestedSale;
  const effectiveCommission = adminLocked && Number.isFinite(adminCommission) && adminCommission >= 0 ? adminCommission : Math.max(0, effectiveSale - base);
  return Object.assign(merged, {
    id: raw.id || raw._id || (local && (local.id || local._id)),
    name: raw.name || raw.title || '',
    category,
    cat: category,
    rawWholesalePrice: rawWholesale,
    basePrice: base,
    cost: base,
    suggestedSalePrice: suggestedSale,
    price: effectiveSale,
    image: raw.image || (raw.images && raw.images[0]) || merged.image || '',
    description: merged.description || raw.description || raw.desc || '',
    desc: merged.description || raw.description || raw.desc || '',
    barcode: raw.barcode || merged.barcode || '',
    note,
    commission: effectiveCommission,
    propId: raw.propId || prop._id || '',
    propKey: raw.propKey || prop.key || '',
    stock,
    stockQuantity: stock,
    inStock: stockState.inStock,
    stockDetails: stockState.details || [],
    stockSourcePath: stockState.path,
    available: stockState.available === true,
    stockSource: stockState.source || 'safka'
  }, media);
}
async function fetchLivePublicProducts() {
  if (!API_KEY) throw new Error('SAFKA_API_KEY غير مضبوط');
  const headers = { 'api-safka-key': API_KEY };
  const readPage = async (page) => {
    const response = await fetch(BASE_URL + '/products?page=' + page + '&size=100', { headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('مصدر المنتجات HTTP ' + response.status);
    return { body, rows: body.data || body.items || (Array.isArray(body) ? body : []) };
  };
  const first = await readPage(1);
  if (!first.rows.length) return [];
  if (Date.now() - stockProbeLoggedAt > 10 * 60 * 1000) {
    stockProbeLoggedAt = Date.now();
    console.log('[availability-probe] sample:', JSON.stringify(first.rows.slice(0, 5).map(product => ({
      id: product && (product.id || product._id),
      name: product && (product.name || product.title),
      is_available: product && product.is_available,
      propertyAvailability: Array.isArray(product && product.properties) ? product.properties.slice(0, 5).map(item => item && item.is_available) : []
    }))));
  }
  const pages = Math.min(100, Math.max(1, Number(first.body.pages || 1)));
  if (pages === 1) return first.rows;
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => readPage(i + 2)));
  return first.rows.concat(...rest.map(x => x.rows));
}
let liveProductsPromise = null;
async function getLiveStockSnapshot() {
  if (stockSnapshot.length && Date.now() - stockSnapshotAt < 60000) return stockSnapshot;
  if (stockSnapshotPromise) return stockSnapshotPromise;
  stockSnapshotPromise = fetchLivePublicProducts().then(live => {
    const checkedAt = new Date(lastFetch || Date.now()).toISOString();
    stockSnapshot = live.map(raw => {
      const state = getProductStockState(raw);
      return {
        id: String(raw && (raw.id || raw._id) || ''),
        stockQuantity: state.quantity,
        inStock: state.inStock,
        available: state.available === true,
        stockDetails: state.details || [],
        stockUpdatedAt: checkedAt,
        stockSourcePath: state.path,
        stockSource: state.source || 'safka'
      };
    }).filter(item => item.id);
    stockSnapshotAt = Date.now();
    return stockSnapshot;
  }).finally(() => { stockSnapshotPromise = null; });
  return stockSnapshotPromise;
}

async function getLivePublicProductsCached(force) {
  const cacheAge = Date.now() - lastFetch;
  if (!force && productsCache.length && cacheAge < 600000) return productsCache;
  if (liveProductsPromise) return liveProductsPromise;
  liveProductsPromise = fetchLivePublicProducts().then(async live => {
    productsCache = live;
    lastFetch = Date.now();
    try {
      const affiliate = await getAffiliateSnapshotFast();
      const priceUp = Math.max(0, Math.min(200, Number(affiliate.priceUp) || 0));
      const saved = Array.isArray(affiliate.products) ? affiliate.products : [];
      const savedById = new Map();
      saved.forEach(item => [item.id, item._id, item.productId, item.safkaId].filter(Boolean).forEach(id => savedById.set(String(id), item)));
      const normalized = live.map(raw => normalizePublicProduct(raw, savedById.get(String(raw.id || raw._id)) || {}, priceUp));
      fs.writeFileSync(path.join(__dirname, 'products-cache.json'), JSON.stringify(normalized));
    } catch (error) { console.warn('Product cache write skipped:', error.message); }
    return live;
  }).finally(() => { liveProductsPromise = null; });
  return liveProductsPromise;
}

function readProductCache() {
  const fp = path.join(__dirname, 'products-cache.json');
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  return Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
}

app.get('/api/pricing-policy', async (req, res) => {
  try {
    const policy = await postgres.getAffiliatePricingPolicy();
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, priceUp: policy.priceUp, updatedAt: policy.pricePolicyUpdatedAt || null });
  } catch (error) {
    console.error('[pricing policy] read failed:', error.message);
    res.status(503).json({ error: 'تعذر قراءة سياسة الأسعار حاليًا' });
  }
});

app.get('/api/products/stock', async (req, res) => {
  try {
    const data = await getLiveStockSnapshot();
    res.set('Cache-Control', 'no-store');
    res.json({ data, stockUpdatedAt: data[0]?.stockUpdatedAt || null, cachedForMs: 60000 });
  } catch (error) {
    console.error('[stock-api] live snapshot failed:', error.message);
    res.status(503).json({ ok: false, error: 'تعذر قراءة المخزون الحالي حاليًا' });
  }
});

app.get('/api/products', async (req, res) => {
  const cachedOnly = String(req.query.cached || '') === '1';
  if (cachedOnly) {
    const cached = readSeoProducts();
    if (cached.length) {
      res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=600');
      return res.json({ data: cached, cached: true });
    }
    return res.status(404).json({ ok: false, error: 'لا يوجد كاش منتجات جاهز' });
  }
  const affiliate = await getAffiliateSnapshotFast(false);
  const priceUp = Math.max(0, Math.min(200, Number(affiliate.priceUp) || 0));
  const saved = Array.isArray(affiliate.products) ? affiliate.products : [];
  const savedById = new Map();
  saved.forEach(item => {
    [item.id, item._id, item.productId, item.safkaId].filter(v => v !== undefined && v !== null && String(v) !== '').forEach(v => savedById.set(String(v), item));
  });
  try {
    const live = await getLivePublicProductsCached(false);
    const stockUpdatedAt = new Date().toISOString();
    const normalized = live.map(raw => Object.assign(normalizePublicProduct(raw, savedById.get(String(raw.id || raw._id)) || {}, priceUp), { stockUpdatedAt }));
    res.set('Cache-Control', 'no-store');
    res.json(Object.assign({ data: normalized }, { priceUp, cached: false, pricePolicyUpdatedAt: affiliate.pricePolicyUpdatedAt || null }));
  } catch (error) {
    console.error('Live products unavailable:', error.message);
    res.status(503).json({ ok: false, error: 'تعذر جلب المنتجات حاليًا' });
  }
});

function chatKeyForUser(user) {
  return user && user.id != null ? 'u' + String(user.id) : '';
}

function cleanChatText(value) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, 2000);
}

function createChatMessage(text) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
    from: 'user',
    type: 'text',
    text,
    time: new Date().toISOString()
  };
}

async function getCurrentChatUser(req, res) {
  const user = await currentUser(req);
  if (!user) {
    res.status(401).json({ error: 'يجب تسجيل الدخول لبدء محادثة آمنة' });
    return null;
  }
  if (user.banned) {
    res.status(403).json({ error: 'الحساب موقوف ولا يمكنه استخدام الدعم' });
    return null;
  }
  return user;
}

async function readCurrentChat(req, res) {
  const user = await getCurrentChatUser(req, res);
  if (!user) return;
  try {
    const messages = await postgres.getChatMessages(chatKeyForUser(user));
    res.set('Cache-Control', 'private, no-store');
    res.json(messages);
  } catch (error) {
    console.error('[chat read]:', error.message);
    res.status(503).json({ error: 'تعذر تحميل المحادثة حاليًا' });
  }
}

async function appendCurrentChat(req, res) {
  const user = await getCurrentChatUser(req, res);
  if (!user) return;
  const text = cleanChatText(req.body && req.body.text);
  if (!text) return res.status(400).json({ error: 'اكتب رسالتك أولًا' });
  const message = createChatMessage(text);
  try {
    await postgres.appendChatMessage(chatKeyForUser(user), message);
    if (global.notifyChat) global.notifyChat();
    await notifySupport({ title: 'رسالة جديدة للدعم', body: 'وصلت رسالة جديدة من مسوق وتحتاج متابعة من مركز الدعم.', type: 'support-message', priority: 'high', userId: user.id, entityType: 'chat', entityId: chatKeyForUser(user), eventKey: 'support:chat:' + chatKeyForUser(user) + ':' + message.id, payload: { messageType: message.type || 'text' } });
    res.status(201).json({ ok: true, message, m: message });
  } catch (error) {
    console.error('[chat append]:', error.message);
    res.status(503).json({ error: 'تعذر إرسال الرسالة حاليًا' });
  }
}

app.get('/api/chat', readCurrentChat);
app.get('/api/chat/messages', readCurrentChat);
app.post('/api/chat', appendCurrentChat);
app.post('/api/chat/send', appendCurrentChat);

app.post('/api/upload', async (req, res) => {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: 'يجب تسجيل الدخول أولًا' });
  const body = req.body || {};
  if (typeof body.data !== 'string' || body.data.indexOf('data:') !== 0 || body.data.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'صورة غير صالحة' });
  try {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const mime = (body.data.match(/^data:([^;]+);/) || [])[1] || 'image/png';
    const ext = ((mime.split('/')[1]) || 'png').replace(/[^a-z0-9]/gi, '') || 'png';
    const fileName = 'u' + String(user.id) + '-' + crypto.randomBytes(18).toString('hex') + '.' + ext;
    fs.writeFileSync(path.join(dir, fileName), Buffer.from((body.data.split(',')[1]) || '', 'base64'));
    res.json({ ok: true, url: '/uploads/' + fileName });
  } catch (error) { console.error('[upload] failed:', error.message); res.status(503).json({ error: 'فشل الرفع' }); }
});
app.get('/api/theme/:id', async (req, res) => {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: 'يجب تسجيل الدخول أولًا' });
  if (String(req.params.id) !== String(user.id)) return res.status(403).json({ error: 'لا يسمح بالوصول إلى بيانات مستخدم آخر' });
  try {
    const owner = await firestore.getUser(user.id);
    res.set('Cache-Control', 'private, no-store');
    res.json({ ok: true, theme: (owner && owner.theme) || null });
  } catch (error) { console.error('[theme read] failed:', error.message); res.status(503).json({ error: 'تعذر تحميل إعدادات الحساب' }); }
});
app.post('/api/my/theme',async (req,res)=>{const u=await currentUser(req);if(!u)return res.status(401).json({error:'login'});try{u.theme=req.body||{};await firestore.saveUser(u);res.json({ok:true});}catch(e){res.json({error:'فشل الحفظ'});}});
app.get('/premium.js',(req,res)=>res.sendFile(require('path').join(__dirname,'themes','premium.js')));
app.get('/premium.css',(req,res)=>res.sendFile(require('path').join(__dirname,'themes','premium.css')));
app.get('/products.js',(req,res)=>{res.type('js').sendFile(require('path').join(__dirname,'products.js'));});




// ===== MAIN STORE ROUTES =====




app.get('/dashboard', async (req, res) => {
  let user = null;
  try { user = await currentUser(req); } catch (_) {}
  if (!user) return res.redirect(302, '/login?return=' + encodeURIComponent('/store#affiliate'));
  res.redirect(302, '/store#affiliate');
});

app.get('/api/affiliate/ai/history', async (req, res) => {
  const user = await requireAffiliateAiUser(req, res);
  if (!user) return;
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, messages: await aiAssistant.history(user.id) });
  } catch (error) {
    console.error('[affiliate ai history] failed:', error.message);
    res.status(503).json({ error: 'تعذر تحميل المحادثة حاليًا' });
  }
});

app.delete('/api/affiliate/ai/history', async (req, res) => {
  const user = await requireAffiliateAiUser(req, res);
  if (!user) return;
  try {
    await aiAssistant.clearConversation(user.id);
    res.json({ ok: true, messages: [] });
  } catch (error) {
    console.error('[affiliate ai clear] failed:', error.message);
    res.status(503).json({ error: 'تعذر مسح المحادثة حاليًا' });
  }
});

app.post('/api/affiliate/ai/analyze-product', async (req, res) => {
  const user = await requireAffiliateAiUser(req, res);
  if (!user) return;
  const limit = aiRateLimit(user.id);
  res.set('X-AI-RateLimit-Remaining', String(limit.remaining));
  res.set('X-AI-RateLimit-Reset', String(Math.ceil(limit.resetAt / 1000)));
  if (!limit.allowed) return res.status(429).json({ error: 'وصلت للحد المؤقت للتحليل. جرّب مرة أخرى بعد دقائق.' });
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const result = await aiAssistant.analyzeProduct({
      name,
      description: body.description || '',
      price: body.price,
      category: body.category,
      properties: body.properties
    });
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, answer: result.answer, provider: result.provider, model: result.model });
  } catch (error) {
    console.error('[affiliate ai analyze-product] failed:', error.code || error.message);
    res.status(aiErrorStatus(error)).json({ error: error.code === 'PROVIDER_UNAVAILABLE' ? 'المساعد غير مفعّل حاليًا على الخادم.' : 'حصلت مشكلة مؤقتة في المساعد. جرّب مرة أخرى.' });
  }
});

app.post('/api/affiliate/ai/chat', async (req, res) => {
  const user = await requireAffiliateAiUser(req, res);
  if (!user) return;
  const limit = aiRateLimit(user.id);
  res.set('X-AI-RateLimit-Remaining', String(limit.remaining));
  res.set('X-AI-RateLimit-Reset', String(Math.ceil(limit.resetAt / 1000)));
  if (!limit.allowed) return res.status(429).json({ error: 'وصلت للحد المؤقت للمحادثة. جرّب مرة أخرى بعد دقائق.' });
  try {
    const body = req.body || {};
    const result = await aiAssistant.chat({ user, message: body.message, retry: body.retry === true, compact: body.compact === true || body.surface === 'store' });
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, answer: result.answer, messages: result.messages });
  } catch (error) {
    console.error('[affiliate ai chat] failed:', error.code || error.message);
    res.status(aiErrorStatus(error)).json({ error: error.code === 'PROVIDER_UNAVAILABLE' ? 'المساعد غير مفعّل حاليًا على الخادم.' : (error.code === 'INVALID_INPUT' ? error.message : 'حصلت مشكلة مؤقتة في المساعد. جرّب مرة أخرى.') });
  }
});

app.get('/orders', async (req, res) => {
  let user = null;
  try { user = await currentUser(req); } catch (_) {}
  if (!user) return res.redirect(302, '/login?return=' + encodeURIComponent('/store#orders'));
  res.redirect(302, '/store#orders');
});
function affiliateOrderForUser(order, userId) {
  if (!order || String(order.userId) !== String(userId)) return null;
  const queue = order._queue || null;
  const queueStatus = queue && String(queue.status || '').toLowerCase();
  const queueStatusMap = {
    pending: 'قيد المتابعة',
    processing: 'جاري تجهيز الطلب',
    retry: 'إعادة المحاولة تلقائيًا',
    unknown: 'قيد التحقق',
    accepted: 'قيد التأكيد',
    confirmed: 'تم التأكيد',
    cancel_requested: 'طلب الإلغاء قيد المراجعة',
    cancelled: 'تم إلغاء الطلب',
    failed: 'فشل'
  };
  const requestStatus = order.requestStatus || (queueStatusMap[queueStatus] ? queueStatus : null);
  const status = queueStatus && queueStatusMap[queueStatus] && ['pending','processing','retry','unknown'].includes(queueStatus)
    ? queueStatusMap[queueStatus]
    : (order.status || (queueStatus && queueStatusMap[queueStatus]) || 'قيد التأكيد');
  return {
    id: order.id,
    serial: order.serial || order.id,
    products: Array.isArray(order.products) ? order.products : [],
    items: Array.isArray(order.items) ? order.items.length : Number(order.items || 0),
    client_name: order.client_name || order.customer || '',
    total: Number(order.total || 0),
    commission: Number(order.commission || 0),
    status,
    requestStatus,
    failureReason: requestStatus === 'failed' ? (order.failureReason || queue && queue.failureReason || '') : '',
    cancelReason: order.cancelReason || queue && queue.cancelReason || '',
    cancelRequestedAt: order.cancelRequestedAt || queue && queue.cancelRequestedAt || null,
    cancelledAt: order.cancelledAt || queue && queue.cancelledAt || null,
    externalId: order.externalId || order.supplierOrderId || queue && queue.supplierOrderId || null,
    date: order.date || order.createdAt || null,
    statusSyncedAt: order.statusSyncedAt || queue && queue.updatedAt || null,
    updatedAt: queue && queue.updatedAt || order._documentUpdatedAt || order.date || order.createdAt || null
  };
}

function affiliateWithdrawalForUser(withdrawal, userId) {
  if (!withdrawal || String(withdrawal.userId) !== String(userId)) return null;
  return {
    id: withdrawal.id,
    method: withdrawal.method || '—',
    amount: Number(withdrawal.amount || 0),
    status: withdrawal.status || 'pending',
    date: withdrawal.date || withdrawal.createdAt || null
  };
}

app.get(['/api/affiliate/me', '/api/me'], async (req, res) => {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: 'يجب تسجيل الدخول أولًا' });
  try {
    const scoped = await postgres.getAffiliateUserData(user.id);
    const orders = (scoped.orders || []).map(order => affiliateOrderForUser(order, user.id)).filter(Boolean);
    const withdrawals = (scoped.withdrawals || []).map(item => affiliateWithdrawalForUser(item, user.id)).filter(Boolean);
    const deliveredStatuses = ['تم التسليم', 'تم التوصيل', 'delivered', 'completed'];
    const rejectedStatuses = ['مرفوض', 'rejected', 'رفض'];
    const delivered = orders.filter(order => deliveredStatuses.includes(String(order.status || '').trim().toLowerCase()));
    const pending = orders.filter(order => !deliveredStatuses.includes(String(order.status || '').trim().toLowerCase()) && !rejectedStatuses.includes(String(order.status || '').trim().toLowerCase()));
    const totalCommission = orders.reduce((sum, order) => sum + Math.max(0, Number(order.commission) || 0), 0);
    const confirmedCommission = orders.filter(order => commissionEligibleStatus(order.status)).reduce((sum, order) => sum + Math.max(0, Number(order.commission) || 0), 0);
    const pendingWithdrawals = withdrawals.filter(item => !['rejected', 'مرفوض', 'رفض'].includes(String(item.status || '').trim().toLowerCase())).reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0);
    // availableBalance already subtracts all non-rejected withdrawals; do not subtract them again here.
    const balance = await syncUserBalanceScoped(user, { orders, withdrawals });
    const cursor = orders.reduce((latest, order) => {
      const value = order && order.updatedAt ? order.updatedAt : order && (order.statusSyncedAt || order.date);
      if (!value) return latest;
      const candidate = new Date(value);
      return !Number.isNaN(candidate.getTime()) && candidate.getTime() > new Date(latest).getTime() ? candidate.toISOString() : latest;
    }, new Date(0).toISOString());
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, user, stats: { totalOrders: orders.length, pendingOrders: pending.length, deliveredOrders: delivered.length, totalCommission, confirmedCommission, pendingWithdrawals, balance }, orders, withdrawals, cursor });
  } catch (error) {
    console.error('[affiliate] dashboard read failed:', error.message);
    res.status(503).json({ error: 'تعذر تحميل بيانات الأفليت حاليًا' });
  }
});

app.get('/api/affiliate/orders/updates', async (req, res) => {
  const user = await currentAuthUser(req);
  if (!user) return res.status(401).json({ error: 'يجب تسجيل الدخول لمتابعة الطلبات' });
  const since = String(req.query && req.query.since || '').trim();
  const limit = Math.max(1, Math.min(100, Number(req.query && req.query.limit) || 60));
  try {
    const result = await postgres.getAffiliateOrderUpdates(user.id, since, limit);
    const orders = (result.orders || []).map(order => affiliateOrderForUser(order, user.id)).filter(Boolean);
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, orders, cursor: result.cursor || since || new Date(0).toISOString(), hasMore: orders.length >= limit });
  } catch (error) {
    console.error('[affiliate] incremental orders read failed:', error.message);
    res.status(503).json({ error: 'تعذر تحديث الطلبات حاليًا' });
  }
});

app.post('/api/profile', (req,res) => res.status(410).json({ error: 'الملفات الشخصية غير متاحة في المتجر العام.' }));
app.get('/api/my/dashboard', (req, res) => res.redirect(307, '/api/affiliate/me'));
app.post('/api/set-commission', (req,res)=>res.status(403).json({error:'تعديل العمولة غير مسموح من المتجر العام'}));
app.post(['/api/affiliate/withdraw','/api/withdraw','/api/my/withdraw'], async (req, res) => {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: 'يجب تسجيل الدخول أولًا' });
  const amount = Number(req.body && req.body.amount);
  const method = String(req.body && req.body.method || '').trim();
  const details = String(req.body && (req.body.details || req.body.number) || '').trim();
  const requestKey = String((req.headers['x-idempotency-key'] || req.body && req.body.idempotency_key || '')).trim();
  const methods = new Set(['فودافون كاش','اتصالات كاش','أورنج كاش','وي باي','إنستا باي','حساب بنكي']);
  if (!Number.isFinite(amount) || amount < 50) return res.status(400).json({ error: 'الحد الأدنى للسحب 50 ج.م' });
  if (!methods.has(method)) return res.status(400).json({ error: 'اختر وسيلة سحب صحيحة' });
  if (details.length < 6 || details.length > 120) return res.status(400).json({ error: 'أدخل بيانات السحب بشكل صحيح' });
  if (requestKey.length < 16 || requestKey.length > 160) return res.status(400).json({ error: 'تعذر التحقق من طلب السحب، أعد المحاولة من الصفحة' });
  try {
    const result = await postgres.createAffiliateWithdrawal({ userId: user.id, amount, method, details, requestKey });
    if (result.duplicate) return res.status(200).json({ ok: true, duplicate: true, message: 'تم تسجيل طلب السحب مسبقًا', balance: result.balance });
    await notifySupport({ title: 'طلب سحب جديد', body: 'وصل طلب سحب جديد من مسوق ويحتاج مراجعة.', type: 'withdrawal-created', priority: 'high', userId: user.id, entityType: 'withdrawal', entityId: result.withdrawal && result.withdrawal.id, eventKey: 'support:withdrawal-created:' + user.id + ':' + requestKey, payload: { amount, method } });
    res.status(201).json({ ok: true, message: 'تم استلام طلب السحب وسيتم مراجعته قريبًا', balance: result.balance });
  } catch (error) {
    if (error.code === 'INSUFFICIENT_BALANCE') return res.status(400).json({ error: error.message });
    console.error('[affiliate] withdrawal failed:', error.message);
    res.status(503).json({ error: 'تعذر إرسال طلب السحب حاليًا' });
  }
});

app.get(['/login', '/register'], (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/reset-password', (req, res) => res.sendFile(path.join(__dirname, 'reset-password.html')));
app.post('/api/auth/register', async (req, res) => {
  try { const user = await authService.register(req.body || {}); await notifySupport({ title: 'مسوق جديد سجّل في Rab7na', body: 'تم إنشاء حساب مسوق جديد ويمكن متابعته من إدارة المستخدمين.', type: 'account-created', priority: 'normal', userId: user.id, entityType: 'user', entityId: user.id, eventKey: 'support:account-created:' + user.id, payload: { emailVerified: Boolean(user.email_verified) } }); res.status(201).json({ ok: true, user: authService.publicUser(user) }); }
  catch (error) { const status = /مستخدم بالفعل|صحيح|مطلوب|8 أحرف/.test(error.message) ? 400 : 500; res.status(status).json({ error: status === 500 ? 'تعذر إنشاء الحساب حاليًا' : error.message }); }
});
app.post('/api/auth/login', async (req, res) => {
  try { const result = await authService.login(Object.assign({}, req.body || {}, { ip: req.ip })); setSessionCookie(res, result.token); res.json({ ok: true, user: result.user }); }
  catch (error) {
    const status = ['ACCOUNT_BANNED', 'ACCOUNT_SUSPENDED'].includes(error.code) ? 403 : (/محاولات كثيرة|مطلوبان|غير صحيحة/.test(error.message) ? 401 : 500);
    res.status(status).json({ error: status === 500 ? 'تعذر تسجيل الدخول حاليًا' : error.message });
  }
});
app.post('/api/auth/logout', async (req, res) => { try { await authService.logout(authToken(req)); } catch (_) {} clearSessionCookie(res); res.json({ ok: true }); });
app.get('/api/auth/me', async (req, res) => { try { const user = await authService.currentUser(authToken(req)); if (!user) return res.status(401).json({ error: 'غير مسجل الدخول' }); res.json({ ok: true, user }); } catch (_) { res.status(401).json({ error: 'غير مسجل الدخول' }); } });
app.post('/api/auth/forgot-password', async (req, res) => {
  const generic = { ok: true, message: 'إذا كان البريد مسجلًا، ستصلك رسالة تحتوي على رابط استعادة خلال دقائق.' };
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const email = String(body.email || '').trim().toLowerCase();
  if (!passwordResetRateAllowed(req, email) || !/^\S+@\S+\.\S+$/.test(email)) return res.json(generic);
  try {
    await postgresReady;
    const issued = await postgres.issuePasswordResetToken(email);
    if (!issued.found) return res.json(generic);
    try {
      await sendPasswordResetEmail({ to: issued.user.email, name: issued.user.name, url: resetUrl(issued.token, body.return) });
    } catch (error) {
      await postgres.revokePasswordResetToken(issued.token).catch(() => null);
      console.error('[auth] password reset email failed:', error.code || 'transport_error');
    }
  } catch (error) {
    console.error('[auth] password reset request failed:', error.code || 'database_error');
  }
  return res.json(generic);
});
app.post('/api/auth/reset-password', async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const token = String(body.token || '').trim();
  const password = body.password;
  if (token.length < 40 || token.length > 200 || !authService.validatePassword(password)) return res.status(400).json({ error: 'أدخل رابط استعادة صالحًا وكلمة مرور بين 8 و128 حرفًا' });
  try {
    await postgresReady;
    await postgres.consumePasswordResetToken(token, password);
    res.json({ ok: true, message: 'تم تغيير كلمة المرور. سجّل الدخول بالكلمة الجديدة.' });
  } catch (error) {
    if (error.code === 'INVALID_PASSWORD_RESET') return res.status(400).json({ error: error.message });
    console.error('[auth] password reset consume failed:', error.code || 'database_error');
    res.status(503).json({ error: 'تعذر تغيير كلمة المرور حاليًا؛ حاول مرة أخرى.' });
  }
});
// Admin routes use the same HttpOnly session cookie as the rest of the app.
// The module performs server-side role/allowlist authorization before returning data.
require('./admin.js')(app);

async function refreshProductsCache(){
  try { const result = await safkaSync.syncProducts({ notify: true }); console.log('✅ Safka products synced:', result.products, 'new:', result.newProducts); }
  catch (e) { console.log('Safka cache sync err:', e.message); }
}
if (require.main === module && API_KEY.trim()) {
  refreshProductsCache();
  setInterval(refreshProductsCache, 10 * 60 * 1000);
}

let githubOidcKeys = null;
let githubOidcKeysFetchedAt = 0;
async function loadGitHubOidcKeys() {
  if (githubOidcKeys && Date.now() - githubOidcKeysFetchedAt < 60 * 60 * 1000) return githubOidcKeys;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('https://token.actions.githubusercontent.com/.well-known/jwks', { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error('GitHub OIDC key endpoint returned ' + response.status);
    const body = await response.json();
    if (!body || !Array.isArray(body.keys)) throw new Error('GitHub OIDC keys unavailable');
    githubOidcKeys = body.keys;
    githubOidcKeysFetchedAt = Date.now();
    return githubOidcKeys;
  } finally { clearTimeout(timer); }
}
async function verifyGitHubWorkerToken(token) {
  try {
    const decoded = require('jsonwebtoken').decode(String(token || ''), { complete: true });
    if (!decoded || !decoded.header || decoded.header.alg !== 'RS256' || !decoded.header.kid) return false;
    const keys = await loadGitHubOidcKeys();
    const jwk = keys.find(item => item && item.kid === decoded.header.kid);
    if (!jwk) return false;
    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const claims = require('jsonwebtoken').verify(String(token), publicKey, { algorithms: ['RS256'], issuer: 'https://token.actions.githubusercontent.com', audience: 'rab7na-store' });
    return claims && claims.repository === 'alialkaisar92/safqa-store' && claims.ref === 'refs/heads/main';
  } catch (_) { return false; }
}
async function authorizeOrderWorker(req) {
  const expected = String(process.env.ORDER_WORKER_TOKEN || '').trim();
  const supplied = String(req.headers['x-order-worker-token'] || '').trim();
  if (expected && supplied && supplied === expected) return true;
  const authorization = String(req.headers.authorization || '');
  const bearer = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : '';
  return bearer ? verifyGitHubWorkerToken(bearer) : false;
}
function constantTimeSecretMatch(supplied, expected) {
  const left = Buffer.from(String(supplied || ''), 'utf8');
  const right = Buffer.from(String(expected || ''), 'utf8');
  return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
}
function supplierWebhookToken(req) {
  const authorization = String(req.headers.authorization || '');
  const bearer = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : '';
  return String(req.headers['x-safka-webhook-token'] || req.query.token || bearer || '').trim();
}
app.post('/api/webhooks/safka/order-status', async (req, res) => {
  const expected = String(process.env.SAFKA_ORDER_HOOK_TOKEN || '').trim();
  if (!expected) return res.status(503).json({ error: 'استقبال تحديثات المورد غير مفعّل حاليًا' });
  if (!constantTimeSecretMatch(supplierWebhookToken(req), expected)) return res.status(401).json({ error: 'غير مصرح' });
  try { await postgresReady; }
  catch (error) { console.error('[safka-order-hook] database unavailable:', error.message); return res.status(503).json({ error: 'تعذر حفظ تحديث المورد حاليًا' }); }
  try {
    const result = await postgres.applySafkaOrderWebhook(req.body || {});
    if (result.matched && !result.duplicate && global.notifySupport) {
      await notifySupport({ title: 'تحديث حالة من المورد', body: 'وصل تحديث جديد لحالة طلب من المورد ويحتاج مراجعة في لوحة الطلبات.', type: 'supplier-status', priority: 'high', userId: result.userId, entityType: 'order', entityId: result.orderId, eventKey: 'support:safka-webhook:' + String(result.eventKey || result.orderId + ':' + result.status), payload: { status: result.status, matched: Boolean(result.matched), reviewRequired: Boolean(result.reviewRequired) } });
    }
    if (result.matched && result.userId != null && global.notifyUser) {
      await Promise.resolve(global.notifyUser(result.userId, 'تحديث حالة الطلب', 'تم تحديث حالة طلبك: ' + String(result.displayStatus || result.status || 'قيد المتابعة'), '/store', 'order-status', 'safka-webhook:' + result.orderId + ':' + result.status)).catch(() => null);
    }
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, duplicate: Boolean(result.duplicate), matched: Boolean(result.matched), reviewRequired: Boolean(result.reviewRequired), eventKey: result.eventKey, status: result.status });
  } catch (error) {
    if (error.code === 'INVALID_SUPPLIER_WEBHOOK') return res.status(400).json({ error: 'بيانات تحديث المورد غير مكتملة' });
    console.error('[safka-order-hook] processing failed:', error.message);
    res.status(503).json({ error: 'تعذر معالجة تحديث المورد حاليًا' });
  }
});
app.post('/api/internal/order-queue', async (req, res) => {
  if (!await authorizeOrderWorker(req)) return res.status(401).json({ error: 'غير مصرح' });
  if (String(process.env.ORDER_QUEUE_RUNNER_ENABLED || '').toLowerCase() !== 'true') return res.status(503).json({ error: 'تشغيل queue متوقف مؤقتًا للمراجعة الآمنة' });
  try { await postgresReady; }
  catch (error) { console.error('[order-queue] internal endpoint database unavailable:', error.message); return res.status(503).json({ error: 'queue unavailable' }); }
  const limit = Math.max(1, Math.min(10, Number(req.body && req.body.limit) || Number(process.env.ORDER_QUEUE_BATCH_SIZE) || 5));
  const startedAt = Date.now();
  try {
    const queue = await safkaSync.processAffiliateOrderQueue(limit);
    let reconciliation = { skipped: true, checked: 0 };
    if (String(process.env.ORDER_QUEUE_RECONCILE || 'true').toLowerCase() !== 'false') {
      reconciliation = await safkaSync.reconcileAffiliateOrderQueue(Math.max(1, Math.min(25, Number(process.env.ORDER_QUEUE_RECONCILE_LIMIT) || 10)));
    }
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, queue, reconciliation, duration_ms: Date.now() - startedAt });
  } catch (error) {
    console.error('[order-queue] internal cycle failed:', error.message);
    res.status(500).json({ error: 'تعذر تشغيل دورة queue حاليًا' });
  }
});

app.all('/api/safka/sync', async (req, res) => {
  const secret = String(process.env.SAFKA_SYNC_SECRET || '').trim();
  const supplied = String(req.headers['x-safka-sync-secret'] || req.query.secret || '').trim();
  const isVercelCron = String(req.headers['x-vercel-cron'] || '').toLowerCase() === '1';
  if (secret && supplied !== secret && !isVercelCron) return res.status(401).json({ error: 'غير مصرح' });
  if (!secret && !isVercelCron && process.env.NODE_ENV === 'production') return res.status(503).json({ error: 'اضبط SAFKA_SYNC_SECRET أو Vercel Cron' });
  try { res.json(await safkaSync.runSync({ notify: true })); }
  catch (e) { res.status(500).json({ error: 'فشلت مزامنة المنتجات', details: e.message }); }
});

app.get('/api/price-list', async (req,res)=>{
  const fp=require('path').join(__dirname,'price-list-cache.json');
  const norm=(arr)=>(arr||[]).map(x=>{
    const name=x.governorateNameAr||x.governorateName||x.name||'';
    return {
      _id:x._id,
      id:x._id,
      name:name,
      governorateNameAr:name,
      price:x.price||0,
      cities:(x.cities||[]).map(c=>({id:c.id,name:c.city_name_ar||c.city_name||c.name||''}))
    };
  });
  try{
    if(require('fs').existsSync(fp)){
      const d=JSON.parse(require('fs').readFileSync(fp,'utf8'));
      if(Array.isArray(d)&&d.length)return res.json(d[0]&&d[0].id?d:norm(d));
    }
  }catch(e){}
  try{
    const r=await fetch(BASE_URL+'/price-list?page=1&size=100',{headers:{'api-safka-key':API_KEY}});
    const j=await r.json();
    const arr=j.data||j.items||[];
    const tr=norm(arr);
    try{require('fs').writeFileSync(fp,JSON.stringify(tr));}catch(e){}
    res.json(tr);
  }catch(e){console.log('price-list err:',e.message);res.json([]);}
});


function supplierText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return cleanSupplierText(value);
  if (typeof value === 'object') return cleanSupplierText(value.msg || value.message || value.error || value.detail || '');
  return '';
}
function cleanSupplierText(value) { return String(value == null ? '' : value).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function supplierErrorMessages(payload) {
  const messages = [];
  const collect = (value) => {
    if (!Array.isArray(value)) return;
    value.forEach(item => { const text = supplierText(item); if (text && !messages.includes(text)) messages.push(text); });
  };
  collect(payload && payload.errors);
  collect(payload && payload.data && payload.data.errors);
  collect(payload && payload.order && payload.order.errors);
  return messages;
}
function supplierOrderRecord(payload) {
  const candidates = [payload && payload.data, payload && payload.order, payload];
  return candidates.find(value => value && typeof value === 'object' && !Array.isArray(value) && (
    value._id || value.id || value.serial_number || value.serial || value.status || value.order_status
  )) || null;
}
function supplierResponseStatus(payload, record) {
  return cleanSupplierText((record && (record.status || record.order_status)) || (payload && payload.status) || (payload && payload.order_status));
}
function supplierResponseAccepted(httpResponse, payload) {
  const record = supplierOrderRecord(payload);
  const status = supplierResponseStatus(payload, record).toLowerCase();
  const errors = supplierErrorMessages(payload);
  const successFalse = payload && (payload.success === false || String(payload.success).toLowerCase() === 'false');
  const okFalse = payload && (payload.ok === false || String(payload.ok).toLowerCase() === 'false');
  const failureStatuses = new Set(['failed', 'failure', 'rejected', 'reject', 'cancelled', 'canceled', 'error', 'invalid']);
  const externalId = record && (record._id || record.id || record.serial_number || record.serial);
  return {
    accepted: Boolean(httpResponse && httpResponse.ok) && !successFalse && !okFalse && !errors.length && Boolean(externalId) && !failureStatuses.has(status),
    record,
    status,
    errors,
    externalId: externalId ? String(externalId) : ''
  };
}

function queueStatusMessage(status) {
  const messages = {
    pending: 'تم استلام طلبك، جاري تجهيز الإرسال',
    processing: 'جاري تأكيد الطلب',
    retry: 'جاري إعادة تجهيز الطلب تلقائيًا',
    unknown: 'تم استلام طلبك، وجاري التحقق من حالته. لا تقم بإرسال الطلب مرة أخرى.',
    accepted: 'تم تسجيل الطلب وجارٍ تأكيده',
    confirmed: 'تم تأكيد الطلب بنجاح',
    cancel_requested: 'تم استلام طلب الإلغاء وجارٍ مراجعته',
    cancelled: 'تم إلغاء الطلب',
    failed: 'تعذر تأكيد الطلب؛ راجع البيانات وأنشئ طلبًا جديدًا'
  };
  return messages[String(status || '').toLowerCase()] || 'جاري متابعة الطلب';
}
function queueStatusPayload(row, order) {
  const status = String(row && row.status || 'pending').toLowerCase();
  const safeOrder = order || {};
  const rawDisplayStatus = String(safeOrder.status || '').trim();
  const publicStatus = /المورد|safka|supplier/i.test(rawDisplayStatus) ? (status === 'confirmed' ? 'تم التأكيد' : 'قيد المتابعة') : rawDisplayStatus;
  return {
    id: safeOrder.id || row.order_id,
    serial: safeOrder.serial || safeOrder.id || row.order_id,
    status: publicStatus || (status === 'confirmed' || status === 'accepted' ? 'قيد التأكيد' : 'قيد المتابعة'),
    requestStatus: status,
    total: Number(safeOrder.total || 0),
    commission: Number(safeOrder.commission || 0),
    message: queueStatusMessage(status),
    cancelReason: row.cancel_reason || safeOrder.cancelReason || '',
    cancelRequestedAt: row.cancel_requested_at || safeOrder.cancelRequestedAt || null,
    cancelledAt: row.cancelled_at || safeOrder.cancelledAt || null,
    supplierOrderId: row.supplier_order_id || safeOrder.supplierOrderId || safeOrder.externalId || null,
    reviewRequired: status === 'unknown',
    manualReviewStatus: status === 'unknown' ? 'manual_review' : null,
    reviewLabel: status === 'unknown' ? 'مراجعة يدوية مطلوبة' : '',
    manualReviewDecision: row.manual_review_decision || safeOrder.manualReviewDecision || null,
    manualReviewAt: row.manual_review_at || safeOrder.manualReviewAt || null,
    manualReviewBy: row.manual_review_by || safeOrder.manualReviewBy || null,
    manualReviewReason: row.manual_review_reason || safeOrder.manualReviewReason || null,
    failureReason: status === 'unknown' ? queueStatusMessage('unknown') : status === 'failed' ? queueStatusMessage('failed') : ''
  };
}

app.post('/api/create-order', async (req,res)=>{
  res.set('Cache-Control','no-store');
  try { await postgresReady; } catch (error) { console.error('[order] postgres initialization failed:', error.message); return res.status(503).json({error:'خدمة الطلبات تجهز حاليًا، حاول مرة أخرى بعد لحظات'}); }
  if(!API_KEY.trim()) return res.status(503).json({error:'خدمة الطلبات غير مفعلة حاليًا؛ لم يتم تسجيل أي طلب'});
  const affiliateUser=await currentAuthUser(req);
  if(!affiliateUser)return res.status(401).json({error:'سجّل الدخول بحساب المسوّق قبل إنشاء الطلب حتى تُحتسب العمولة لحسابك'});
  const b=req.body||{};
  const clean=(value)=>String(value==null?'':value).trim();
  const clientName=clean(b.client_name);
  const clientPhone=clean(b.client_phone1).replace(/[\s()-]/g,'');
  const clientPhone2=clean(b.client_phone2).replace(/[\s()-]/g,'');
  const clientAddress=clean(b.client_address);
  const egyptianPhone=/^(?:01[0125]\d{8}|20(?:10|11|12|15)\d{8})$/;
  if(!clientName)return res.status(400).json({error:'اسم العميل مطلوب'});
  if(!egyptianPhone.test(clientPhone))return res.status(400).json({error:'رقم الهاتف الأول غير صحيح'});
  if(clientPhone2 && !egyptianPhone.test(clientPhone2))return res.status(400).json({error:'رقم الهاتف الثاني غير صحيح'});
  if(!clientAddress)return res.status(400).json({error:'العنوان مطلوب'});
  const gov=clean(b.shipping_governorate);
  let govId=gov;
  try{
    const pl=JSON.parse(fs.readFileSync(path.join(__dirname,'price-list-cache.json'),'utf8'));
    const found=pl.find(x=>x._id===gov||x.id===gov||(x.governorateNameAr||x.governorateName)===gov);
    if(found)govId=found._id||found.id;
  }catch(e){}
  if(!govId||govId.length<3)return res.status(400).json({error:'اختر المحافظة'});
  const items=(Array.isArray(b.items)?b.items:[]).map(it=>{
    const rawPrice=it && (it.finalPrice ?? it.salePrice ?? it.price);
    const requestedFinalPrice=rawPrice === '' || rawPrice == null ? 0 : Number(rawPrice);
    return {
      product: clean(it && (it.product||it.id||it._id)),
      property: clean(it && (it.property||it.propId||'')),
      qty: Number(it && (it.qty ?? it.quantity ?? 1)),
      requestedFinalPrice: Number.isFinite(requestedFinalPrice) ? requestedFinalPrice : 0
    };
  }).filter(x=>x.product);
  if(!items.length)return res.status(400).json({error:'السلة فارغة'});
  for (const item of items) {
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99) return res.status(400).json({error:'الكمية المطلوبة غير صحيحة'});
  }

  let sourceRows=[];
  try { sourceRows = await postgres.getProductsByExternalIds(items.map(item=>item.product)); }
  catch (error) { console.error('[order] local product verification failed:', error.message); return res.status(503).json({error:'تعذر قراءة بيانات المنتج حاليًا، حاول مرة أخرى'}); }
  const sourceById = new Map();
  sourceRows.forEach(p => { [p && p.id, p && p._id, p && p.sourceProductId].filter(Boolean).forEach(id => sourceById.set(String(id), p)); });
  let priceUp = 0;
  let affiliateSnapshotForOrder = null;
  try { affiliateSnapshotForOrder = await getAffiliateSnapshotFast(false); priceUp = Math.max(0, Math.min(200, Number(affiliateSnapshotForOrder && affiliateSnapshotForOrder.priceUp) || 0)); } catch (_) {}
  const missingSourceIds = items.map(item => String(item.product)).filter(id => !sourceById.has(id));
  if (missingSourceIds.length) {
    try {
      const liveProducts = await getLivePublicProductsCached(false);
      const savedById = new Map();
      (Array.isArray(affiliateSnapshotForOrder && affiliateSnapshotForOrder.products) ? affiliateSnapshotForOrder.products : []).forEach(item => {
        [item && item.id, item && item._id, item && item.productId, item && item.safkaId].filter(Boolean).forEach(id => savedById.set(String(id), item));
      });
      liveProducts.forEach(raw => {
        const id = String(raw && (raw.id || raw._id) || '');
        if (!id || !missingSourceIds.includes(id)) return;
        const local = savedById.get(id) || {};
        sourceById.set(id, Object.assign({}, raw, {
          id,
          _id: id,
          adminPriceLocked: local.adminPriceLocked === true || local.admin_price_locked === true,
          adminSalePrice: local.adminSalePrice != null ? local.adminSalePrice : local.admin_sale_price,
          adminCommission: local.adminCommission != null ? local.adminCommission : local.admin_commission
        }));
      });
    } catch (error) {
      console.warn('[order] live catalog fallback unavailable:', error.message);
    }
  }
  const normalizedItems=[];
  for (const item of items) {
    const source = sourceById.get(String(item.product));
    if (!source) return res.status(409).json({error:'المنتج غير متاح حاليًا'});
    const sourceProps = Array.isArray(source.properties) ? source.properties : [];
    const requestedProperty = String(item.property || '');
    const matchedProperty = sourceProps.find(prop => requestedProperty && [prop && prop._id, prop && prop.id, prop && prop.key].filter(Boolean).map(String).includes(requestedProperty));
    if (sourceProps.length && requestedProperty && !matchedProperty) return res.status(409).json({error:'اختيار المنتج غير صالح حاليًا'});
    const sourceProp = matchedProperty || sourceProps.find(prop => prop && prop.is_available === true) || sourceProps[0] || {};
    // التوفر هو مصدر القرار الوحيد؛ عند اختيار خاصية نفحص الخاصية نفسها، وإلا نستخدم أي خاصية متاحة.
    const rawWholesale = wholesalePriceOf(source);
    const base = productWholesalePrice(rawWholesale, priceUp);
    if (!Number.isFinite(base) || base <= 0) return res.status(409).json({error:'سعر الجملة الأصلي غير متاح حاليًا'});
    const propertyAvailable = sourceProps.length ? (matchedProperty ? matchedProperty.is_available === true : sourceProps.some(prop => prop && prop.is_available === true)) : source.is_available !== false;
    const productAvailable = source.is_active !== false && propertyAvailable && sourceAvailability(source) === true;
    if (!productAvailable) return res.status(409).json({error:'المنتج غير متاح حاليًا'});
    const rawStock = sourceProps.length ? sourceProp.value : (source.stockQuantity ?? source.stock_quantity ?? source.stock);
    const numericStock = rawStock === null || rawStock === undefined || rawStock === '' ? null : Number(rawStock);
    if (Number.isFinite(numericStock) && numericStock >= 0 && item.qty > Math.floor(numericStock)) return res.status(409).json({error:`الكمية المتاحة حاليًا ${Math.floor(numericStock)} فقط`});
    const note=clean(source.note || '');
    const suggestedSale = productSuggestedSalePrice(Object.assign({}, source, { note }), base);
    const adminLocked = source.adminPriceLocked === true || source.admin_price_locked === true;
    const adminSale = Number(source.adminSalePrice != null ? source.adminSalePrice : source.admin_sale_price);
    const suggestedForOrder = adminLocked && Number.isFinite(adminSale) && adminSale >= base
      ? Math.round(adminSale)
      : suggestedSale;
    // سعر البيع يحدده المسوّق حسب اتفاقه مع العميل؛ الخادم يتحقق فقط من أنه صالح ولا يقل عن سعر الجملة.
    const finalPrice=Math.round(item.requestedFinalPrice*100)/100;
    if (!Number.isFinite(finalPrice) || finalPrice < base) return res.status(409).json({error:'سعر البيع يجب ألا يقل عن سعر الجملة'});
    const commission=Math.max(0, Math.round((finalPrice-base)*100)/100);
    const property=(matchedProperty && (matchedProperty._id || matchedProperty.id || matchedProperty.key)) || item.property || source.propId || sourceProp._id || sourceProp.id || sourceProp.key || '';
    if (!property) return res.status(409).json({error:'خاصية المنتج غير متاحة حاليًا'});
    normalizedItems.push({product:String(item.product),property:String(property),qty:String(item.qty),name:String(source.name || source.title || item.product),originalPrice:rawWholesale,wholesalePrice:base,suggestedSalePrice:suggestedForOrder,finalPrice,commission});
  }
  let shippingCost=0;
  try{
    const pl=JSON.parse(fs.readFileSync(path.join(__dirname,'price-list-cache.json'),'utf8'));
    const shippingGovernorate=pl.find(x=>x._id===govId||x.id===govId);
    if(!shippingGovernorate)return res.status(409).json({error:'المحافظة المختارة غير متاحة حاليًا'});
    shippingCost=Math.max(0,Number(shippingGovernorate.price)||0);
  }catch(e){console.error('[order] shipping price verification failed:',e.message);return res.status(503).json({error:'تعذر التحقق من سعر الشحن، حاول مرة أخرى'});}
  const merchandiseTotal=normalizedItems.reduce((sum,x)=>sum+Math.max(0,Number(x.finalPrice)||0)*Number(x.qty),0);
  const commission=normalizedItems.reduce((sum,x)=>sum+Math.max(0,Number(x.commission)||0)*Number(x.qty),0);
  const total=merchandiseTotal+shippingCost;
  const supplierItems=normalizedItems.map(item=>({product:item.product,property:item.property,qty:item.qty}));
  const supplierPayload={items:supplierItems,client_name:clientName,client_phone1:clientPhone,client_phone2:clientPhone2,client_address:clientAddress,shipping_governorate:govId,city:clean(b.city),note:clean(b.note),commission:Number(commission),total:Number(total)};
  const requestKey=clean(req.headers['x-idempotency-key'] || b.idempotency_key);
  if(requestKey.length<16||requestKey.length>160)return res.status(400).json({error:'تعذر التحقق من مفتاح الطلب، أعد المحاولة من المتجر'});
  const localOrderId='rb_'+crypto.createHash('sha256').update(String(affiliateUser.id)+':'+requestKey).digest('hex').slice(0,32);
  const affiliateOrder={id:localOrderId,serial:'R7-'+localOrderId.slice(-8).toUpperCase(),requestKey,userId:affiliateUser.id,products:normalizedItems.map(item=>item.name),items:normalizedItems,client_name:clientName,client_phone1:clientPhone,client_address:clientAddress,status:'قيد المتابعة',requestStatus:'pending',date:new Date().toISOString(),commission,total,adjustedTotal:total,shipping:shippingCost,originalMerchandiseTotal:normalizedItems.reduce((sum,x)=>sum+Number(x.originalPrice||0)*Number(x.qty),0),wholesaleMerchandiseTotal:normalizedItems.reduce((sum,x)=>sum+Number(x.wholesalePrice||0)*Number(x.qty),0),finalMerchandiseTotal:merchandiseTotal};
  const requestData={userId:String(affiliateUser.id),supplierPayload,affiliateOrder};
  let queued;
  try { queued=await postgres.createQueuedAffiliateOrder(affiliateUser.id,requestKey,requestData,affiliateOrder); }
  catch(error){
    if(error.code==='IDEMPOTENCY_CONFLICT')return res.status(409).json({error:'مفتاح الطلب مستخدم لحساب آخر'});
    console.error('[order] queue create failed:',error.message);
    return res.status(503).json({error:'تعذر حفظ الطلب حاليًا، لم يتم تسجيله'});
  }
  const row=queued.row || {};
  const savedOrder=row.order_id===localOrderId ? affiliateOrder : {};
  let dispatchResult=null;
  let responseRow=row;
  // Vercel Functions لا تحتفظ بعامل background بعد انتهاء request؛ نعالج أول claim هنا.
  // claimAffiliateOrderJobByKey يقفل المفتاح ذريًا، لذلك الضغط المتوازي لا يرسل الطلب مرتين.
  if (queued.mode==='created' || queued.mode==='in_progress') {
    try {
      dispatchResult=await safkaSync.processAffiliateOrderByKey(requestKey);
      if (dispatchResult && dispatchResult.processed) responseRow=await postgres.getAffiliateOrderStatus(affiliateUser.id, localOrderId) || row;
    } catch (error) { console.error('[order-queue] inline dispatch failed:', error.message); }
  }
  const responseOrder=responseRow.order_data && typeof responseRow.order_data==='object' ? responseRow.order_data : savedOrder;
  const payload=queueStatusPayload(responseRow,responseOrder);
  console.log('[order-queue] order_created', {order_id:payload.id,user_id:affiliateUser.id,idempotency_key:requestKey,attempt_number:0,dispatch:dispatchResult && dispatchResult.status || 'not_attempted'});
  if(queued.mode==='created') {
    Promise.resolve(notifyUser(affiliateUser.id, 'تم تسجيل طلبك', 'تم حفظ الطلب بنجاح وبدأت متابعته. رقم الطلب: #' + String(payload.serial || payload.id).slice(-14), '/store', 'order-created', 'order-created:' + localOrderId)).catch(error => console.warn('[notifications] order-created skipped:', error.message));
    await notifySupport({ title: 'طلب جديد يحتاج متابعة', body: 'تم تسجيل طلب جديد في Rab7na ويحتاج متابعة من لوحة الطلبات.', type: 'order-created', priority: 'high', userId: affiliateUser.id, entityType: 'order', entityId: localOrderId, eventKey: 'support:order-created:' + localOrderId, payload: { items: normalizedItems.length, total: Number(total) } });
  }
  if(queued.mode==='created' || queued.mode==='in_progress') {
    const status=String(responseRow.status||'pending');
    return res.status(202).json({ok:true,queued:true,pending:true,duplicate:queued.mode!=='created',order:payload,status,message:payload.message,retry_after_ms:status==='unknown'?null:1500});
  }
  return res.status(200).json({ok:true,duplicate:true,queued:true,order:payload,status:String(responseRow.status||'pending'),message:payload.message});
});

app.get('/api/affiliate/order-status/:id', async (req,res)=>{
  const user=await currentAuthUser(req);
  try { await postgresReady; } catch (error) { console.error('[order] postgres status initialization failed:', error.message); return res.status(503).json({error:'خدمة متابعة الطلب تجهز حاليًا'}); }
  if(!user)return res.status(401).json({error:'سجّل الدخول لمتابعة الطلب'});
  try{
    const row=await postgres.getAffiliateOrderStatus(user.id,cleanSupplierText(req.params.id));
    if(!row)return res.status(404).json({error:'الطلب غير موجود'});
    const order=row.order_data && typeof row.order_data==='object' ? row.order_data : {};
    res.set('Cache-Control','no-store');
    res.json({ok:true,order:queueStatusPayload(row,order),updatedAt:row.updated_at});
  }catch(error){console.error('[order] status read failed:',error.message);res.status(503).json({error:'تعذر قراءة حالة الطلب حاليًا'});}
});

app.post('/api/affiliate/order-cancel', async (req,res)=>{
  const user=await currentAuthUser(req);
  try { await postgresReady; } catch (error) { console.error('[order] postgres cancel initialization failed:', error.message); return res.status(503).json({error:'خدمة إلغاء الطلب تجهز حاليًا'}); }
  if(!user)return res.status(401).json({error:'سجّل الدخول لإلغاء الطلب'});
  const body=req.body||{};
  const orderId=cleanSupplierText(body.order_id||body.orderId||'');
  const reason=String(body.reason||body.cancel_reason||'').trim();
  if(orderId.length<6||orderId.length>200)return res.status(400).json({error:'معرّف الطلب غير صحيح'});
  if(reason.length<3)return res.status(400).json({error:'اكتب سبب إلغاء الطلب'});
  if(reason.length>500)return res.status(400).json({error:'سبب الإلغاء طويل جدًا'});
  try{
    const result=await postgres.cancelAffiliateOrder(user.id,orderId,reason);
    if (!result.duplicate) await notifySupport({ title: 'طلب إلغاء جديد', body: 'طلب العميل إلغاء طلب ويحتاج مراجعة من الدعم.', type: 'order-cancel', priority: 'high', userId: user.id, entityType: 'order', entityId: orderId, eventKey: 'support:order-cancel:' + orderId + ':' + crypto.createHash('sha256').update(reason).digest('hex').slice(0, 12), payload: { reasonLength: reason.length } });
    res.set('Cache-Control','no-store');
    res.json({ok:true,status:result.status,cancelRequested:Boolean(result.cancelRequested),duplicate:Boolean(result.duplicate),message:result.duplicate?(result.cancelRequested?'تم تسجيل طلب الإلغاء مسبقًا وجارٍ مراجعته':'تم إلغاء الطلب مسبقًا'): (result.cancelRequested?'تم استلام طلب الإلغاء وجارٍ مراجعته':'تم إلغاء الطلب بنجاح'),order:result.order});
  }catch(error){
    if(error.code==='INVALID_CANCEL_REASON')return res.status(400).json({error:'اكتب سبب إلغاء الطلب'});
    if(error.code==='ORDER_NOT_FOUND')return res.status(404).json({error:'الطلب غير موجود'});
    if(error.code==='ORDER_NOT_CANCELLABLE')return res.status(409).json({error:error.message});
    console.error('[order] cancel failed:',error.message);
    res.status(503).json({error:'تعذر تسجيل إلغاء الطلب حاليًا'});
  }
});



if (require.main === module) {
  app.listen(PORT, () => {
  console.log('المتجر: http://localhost:' + PORT);
  getProducts();
  getPriceList();
  postgresReady.then(() => startOrderQueueWorker()).catch(() => {});
});
}

module.exports = app;


process.on('SIGTERM', async () => { stopOrderQueueWorker(); await postgres.close(); process.exit(0); });
process.on('SIGINT', async () => { stopOrderQueueWorker(); await postgres.close(); process.exit(0); });
