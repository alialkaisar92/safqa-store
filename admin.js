'use strict';

const path = require('path');
const store = require('./firestore');
const postgres = require('./lib/postgres');
const authService = require('./services/auth-postgres');
const { getProductStockState } = require('./stock-utils');
const { generateProductDescription } = require('./lib/gemini');

const SESSION_COOKIE = 'rab7na_session';
const ADMIN_PERMISSIONS = ['dashboard', 'orders', 'products', 'users', 'withdrawals', 'chats', 'settings', 'admins', 'notifications', 'rewards'];
const ROLE_PERMISSIONS = {
  owner: ADMIN_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  manager: ['dashboard', 'orders', 'products', 'users', 'withdrawals', 'chats', 'settings', 'notifications'],
  support: ['dashboard', 'orders', 'chats'],
  finance: ['dashboard', 'orders', 'withdrawals'],
  products: ['dashboard', 'products']
};
const ORDER_STATUSES = ['جديد', 'قيد التأكيد', 'تم التأكيد', 'جاري التجهيز', 'تم الشحن', 'تم التوصيل', 'تم التحصيل', 'تم التسليم', 'مرتجع', 'طلب استبدال', 'طلب الإلغاء قيد المراجعة', 'تم إلغاء الطلب', 'ملغي', 'مرفوض', 'فشل'];
const WITHDRAWAL_STATUSES = ['pending', 'approved', 'rejected', 'paid', 'قيد المراجعة', 'مقبول', 'مرفوض', 'مدفوع'];
const ADMIN_ROLES = ['owner', 'admin', 'manager', 'support', 'finance', 'products'];
const SAFKA_BASE_URL = String(process.env.SAFKA_PUBLIC_BASE_URL || 'https://api.safka-eg.com/api/v1/public').replace(/\/$/, '');
const aiDescriptionRate = new Map();

function readCookie(req, name) {
  const raw = String(req.headers.cookie || '');
  const value = raw.split(';').map(item => item.trim()).find(item => item.startsWith(name + '='));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : '';
}

function tokenFrom(req) {
  const authorization = String(req.headers.authorization || '');
  return String(req.headers['x-auth-token'] || (authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7) : '') || readCookie(req, SESSION_COOKIE) || '').trim();
}

function rolePermissions(role) {
  return ROLE_PERMISSIONS[String(role || '').toLowerCase()] || [];
}

function hasPermission(user, permission) {
  if (!user) return false;
  if (user.__envAdmin || ['owner', 'admin'].includes(String(user.role || '').toLowerCase())) return true;
  return rolePermissions(user.role).includes(permission) || (Array.isArray(user.permissions) && user.permissions.includes(permission));
}
function allowAiDescription(userId) {
  const key = String(userId || 'unknown');
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const max = 20;
  const record = aiDescriptionRate.get(key);
  if (!record || now - record.startedAt >= windowMs) {
    aiDescriptionRate.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (record.count >= max) return false;
  record.count += 1;
  return true;
}

function envAllows(user) {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const id = String(process.env.ADMIN_USER_ID || '').trim();
  return Boolean((email && String(user.email || '').trim().toLowerCase() === email) || (id && String(user.id) === id));
}

async function requireAdmin(req, res, next) {
  try {
    const sessionUser = await authService.currentUser(tokenFrom(req));
    if (!sessionUser) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
    const user = await store.getUser(sessionUser.id);
    if (!user || isAccountBlocked(user)) return res.status(403).json({ error: 'الحساب غير مسموح له بالدخول' });
    const allowedByEnv = envAllows(user);
    const allowedByRole = hasPermission(user, 'dashboard');
    if (!allowedByEnv && !allowedByRole) return res.status(403).json({ error: 'هذه الصفحة مخصصة لمدير المنصة فقط' });
    req.adminUser = allowedByEnv ? Object.assign({}, user, { __envAdmin: true, role: user.role === 'user' ? 'owner' : user.role }) : user;
    next();
  } catch (error) {
    console.error('[admin auth] failed:', error.message);
    return res.status(503).json({ error: 'تعذر التحقق من صلاحيات المدير حاليًا' });
  }
}

global.requireAdmin = requireAdmin;

function isTemporarilySuspended(user) {
  if (!user || !user.suspended_until) return false;
  const time = new Date(user.suspended_until).getTime();
  return Number.isFinite(time) && time > Date.now();
}
function isAccountBlocked(user) { return Boolean(user && (user.banned || isTemporarilySuspended(user))); }
function accountStatus(user) {
  if (user && user.banned) return 'حظر دائم';
  if (isTemporarilySuspended(user)) return 'حظر مؤقت';
  return 'نشط';
}
function safeUser(user) {
  return {
    id: user.id,
    name: user.name || '',
    email: user.email || '',
    emailVerified: Boolean(user.email_verified),
    balance: Number(user.balance || 0),
    role: user.role || 'user',
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    banned: Boolean(user.banned),
    suspendedUntil: user.suspended_until || null,
    banReason: user.ban_reason || '',
    accountStatus: accountStatus(user),
    passwordChangedAt: user.password_changed_at || null,
    created: user.created_at || user.created || null,
    lastSeen: user.last_login || user.lastSeen || null,
    online: Boolean(user.last_login && Date.now() - new Date(user.last_login).getTime() < 120000)
  };
}

function propertyAvailability(product) {
  if (product && typeof product.is_available === 'boolean') return product.is_available;
  const properties = Array.isArray(product && product.properties) ? product.properties : [];
  const flags = properties.map(item => item && item.is_available).filter(value => typeof value === 'boolean');
  return flags.some(Boolean);
}

function wholesalePriceOf(value) {
  const raw = value || {};
  const candidates = [raw.rawWholesalePrice, raw.sale_price, raw.basePrice, raw.base_price, raw.wholesalePrice, raw.wholesale_price, raw.cost];
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '' && Number.isFinite(Number(candidate))) return Math.max(0, Number(candidate));
  }
  return 0;
}
function productSuggestedSalePrice(value, wholesale) {
  const raw = value || {};
  const floor = Math.max(0, Number(wholesale || 0));
  const candidates = [raw.suggestedSalePrice, raw.suggested_sale_price, raw.recommendedSalePrice, raw.recommended_sale_price];
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '' && Number.isFinite(Number(candidate))) return Math.max(floor, Math.round(Number(candidate)));
  }
  const note = String(raw.note || '').replace(/,/g, '');
  const match = note.match(/سعر\s*البيع\s*المقترح\s*[:\-]?\s*(\d+(?:\.\d+)?)/i) || note.match(/suggested\s*sale\s*price\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  return Math.max(floor, match && Number.isFinite(Number(match[1])) ? Math.round(Number(match[1])) : floor);
}
function productWholesalePrice(base, priceUp) {
  const safeBase = Math.max(0, Number(base || 0));
  const safeUp = Math.max(0, Math.min(200, Number(priceUp) || 0));
  return Math.round(safeBase * (1 + safeUp / 100));
}
function mapSafkaProduct(product) {
  const value = product || {};
  const base = wholesalePriceOf(value);
  const stockState = getProductStockState(value);
  const sourceId = String(value._id || value.id || ('safka-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)));
  const updatedAt = new Date().toISOString();
  return {
    id: sourceId,
    source: 'safka',
    sourceId,
    source_product_id: sourceId,
    name: value.name || value.title || 'منتج',
    description: value.description || value.desc || value.note || '',
    image: (Array.isArray(value.images) && value.images[0]) || value.image || '',
    images: Array.isArray(value.images) ? value.images : [],
    rawWholesalePrice: base,
    price: productSuggestedSalePrice(value, base),
    cost: base,
    basePrice: base,
    suggestedSalePrice: productSuggestedSalePrice(value, base),
    commission: Math.max(0, productSuggestedSalePrice(value, base) - base),
    stock: stockState.quantity,
    stock_quantity: stockState.quantity,
    in_stock: stockState.inStock,
    stock_details: stockState.details || [],
    stock_updated_at: updatedAt,
    stock_source_path: stockState.path,
    available: stockState.available === true,
    active: stockState.available === true && value.is_active !== false,
    cat: value.category || value._cat || 'أخرى',
    barcode: value.barcode || '',
    note: value.note || '',
    raw: value,
    updatedAt
  };
}

async function fetchSafkaProducts() {
  const key = String(process.env.SAFKA_API_KEY || '').trim();
  if (!key) throw new Error('مفتاح المنتجات غير مضبوط');
  const result = [];
  let page = 1;
  let pages = 1;
  while (page <= pages && page <= 100) {
    const response = await fetch(SAFKA_BASE_URL + '/products?page=' + page + '&size=100', { headers: { 'api-safka-key': key }, signal: AbortSignal.timeout(15000) });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) throw new Error('مفتاح المنتجات غير صحيح أو منتهي');
    if (!response.ok) throw new Error('تعذر الاتصال بمصدر المنتجات');
    const rows = body.data || body.items || (Array.isArray(body) ? body : []);
    if (!Array.isArray(rows) || !rows.length) break;
    result.push(...rows);
    pages = Math.max(1, Number(body.pages) || pages);
    page += 1;
  }
  return result;
}

async function affiliateData() {
  return store.getAffiliateData();
}

function productWithPrice(product, priceUp) {
  const value = product || {};
  const rawWholesale = wholesalePriceOf(value);
  const safeUp = Math.max(0, Math.min(200, Number(priceUp) || 0));
  const base = productWholesalePrice(rawWholesale, safeUp);
  const suggestedSale = productSuggestedSalePrice(value, base);
  const locked = value.adminPriceLocked === true || value.admin_price_locked === true;
  const adminSale = Number(value.adminSalePrice != null ? value.adminSalePrice : value.admin_sale_price);
  const price = locked && Number.isFinite(adminSale) && adminSale >= base ? Math.round(adminSale) : suggestedSale;
  const commission = locked && Number.isFinite(Number(value.adminCommission != null ? value.adminCommission : value.admin_commission)) ? Math.max(0, Number(value.adminCommission != null ? value.adminCommission : value.admin_commission)) : Math.max(0, price - base);
  return Object.assign({}, value, { rawWholesalePrice: rawWholesale, basePrice: base, cost: base, suggestedSalePrice: suggestedSale, price, commission, adminPriceLocked: locked, adminSalePrice: locked && Number.isFinite(adminSale) ? adminSale : null });
}

function allowedStatus(status) { return ORDER_STATUSES.includes(String(status || '')); }
function allowedWithdrawalStatus(status) { return WITHDRAWAL_STATUSES.includes(String(status || '')); }

function permissionForPath(requestPath) {
  const p = String(requestPath || '');
  if (/^\/(orders|order-status|order-attempts|order-retry|order-review|order-hook-reviews)/.test(p)) return 'orders';
  if (/^\/(products|product|product-delete|price|price-up)/.test(p)) return 'products';
  if (/^\/(users|user-)/.test(p)) return 'users';
  if (/^\/(withdrawals|withdrawal-status)/.test(p)) return 'withdrawals';
  if (/^\/(chats|chat-reply|chat-stream)/.test(p)) return 'chats';
  if (/^\/(settings)/.test(p)) return 'settings';
  if (/^\/(admins)/.test(p)) return 'admins';
  if (/^\/(notifications)/.test(p)) return 'notifications';
  if (/^\/(rewards)/.test(p)) return 'rewards';
  return 'dashboard';
}

module.exports = function mountAdmin(app) {
  app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
  app.use('/api/admin', requireAdmin);
  app.use('/api/admin', (req, res, next) => {
    const permission = permissionForPath(req.path);
    if (!hasPermission(req.adminUser, permission)) return res.status(403).json({ error: 'ليس لديك صلاحية لهذا القسم', permission });
    next();
  });

  app.get('/api/admin/me', (req, res) => {
    const user = req.adminUser || {};
    res.set('Cache-Control', 'no-store');
    res.json({ id: user.id, name: user.name || '', email: user.email || '', role: user.__envAdmin ? 'owner' : (user.role || 'user'), isAdmin: true, permissions: user.__envAdmin ? ADMIN_PERMISSIONS : (Array.isArray(user.permissions) && user.permissions.length ? user.permissions : rolePermissions(user.role)) });
  });

  app.get('/api/admin/notifications', async (req, res) => {
    try { res.set('Cache-Control', 'no-store'); res.json({ notifications: await postgres.listRecentNotifications(req.query.limit) }); }
    catch (error) { console.error('[admin notifications]:', error.message); res.status(503).json({ error: 'تعذر تحميل سجل الإشعارات' }); }
  });

  app.post('/api/admin/notifications/send', async (req, res) => {
    try {
      const body = req.body || {};
      const title = String(body.title || '').trim();
      const message = String(body.body || '').trim();
      if (!title || !message) return res.status(400).json({ error: 'عنوان الإشعار ونصه مطلوبان' });
      const url = String(body.url || '/store').trim() || '/store';
      const type = String(body.type || 'admin').trim() || 'admin';
      const audience = String(body.audience || 'all').trim();
      let result;
      if (audience === 'one') {
        const userId = String(body.userId || '').trim();
        if (!userId) return res.status(400).json({ error: 'اختر مسوقًا واحدًا أو استخدم الإرسال للجميع' });
        result = await Promise.resolve(global.notifyUser(userId, title, message, url, type, 'admin-manual:' + Date.now()));
      } else if (audience === 'group' && Array.isArray(body.userIds) && body.userIds.length) {
        result = await Promise.resolve(global.notifyBroadcast({ title, body: message, url, type, userIds: body.userIds.slice(0, 5000), eventKey: 'admin-group:' + Date.now() }));
      } else {
        result = await Promise.resolve(global.notifyBroadcast({ title, body: message, url, type, eventKey: 'admin-broadcast:' + Date.now() }));
      }
      res.status(201).json({ ok: true, created: Number(result && result.created || 0), push: result && result.push ? result.push : { configured: false, delivered: 0 } });
    } catch (error) { console.error('[admin notifications send]:', error.message); res.status(503).json({ error: 'تعذر إرسال الإشعار حاليًا' }); }
  });

  app.post('/api/admin/notifications/delete', async (req, res) => {
    try {
      const id = String(req.body && req.body.id || '').trim();
      if (!/^\\d+$/.test(id)) return res.status(400).json({ error: 'معرّف الإشعار غير صحيح' });
      const deleted = await postgres.deleteNotificationById(id);
      if (!deleted) return res.status(404).json({ error: 'الإشعار غير موجود' });
      res.json({ ok: true, id });
    } catch (error) { console.error('[admin notifications delete]:', error.message); res.status(503).json({ error: 'تعذر حذف الإشعار حاليًا' }); }
  });

  app.post('/api/admin/notifications/clear', async (req, res) => {
    try { const deleted = await postgres.deleteAllNotifications(); res.json({ ok: true, deleted }); }
    catch (error) { console.error('[admin notifications clear]:', error.message); res.status(503).json({ error: 'تعذر تنظيف سجل الإشعارات حاليًا' }); }
  });

  app.get('/api/admin/rewards', async (req, res) => {
    try { res.set('Cache-Control', 'no-store'); res.json({ rewards: await postgres.listAffiliateRewards(req.query.limit) }); }
    catch (error) { console.error('[admin rewards list]:', error.message); res.status(503).json({ error: 'تعذر تحميل سجل المكافآت' }); }
  });

  app.post('/api/admin/rewards/grant', async (req, res) => {
    try {
      const body = req.body || {};
      const reward = await postgres.grantAffiliateReward(Object.assign({}, body, { rewardKey: body.rewardKey || 'admin-' + Date.now() }), req.adminUser && req.adminUser.id);
      if (reward.duplicate) return res.status(409).json({ ok: false, duplicate: true, error: 'هذه المكافأة تم تنفيذها بالفعل بنفس المفتاح' });
      for (const notification of reward.notifications || []) { if (global.publishNotification) global.publishNotification(notification); }
      const push = global.sendNativePushToUsers && reward.userIds && reward.userIds.length ? await Promise.resolve(global.sendNativePushToUsers(reward.userIds, { title: reward.notificationTitle, body: reward.notificationBody, url: '/store', tag: 'reward:' + reward.reward.reward_key })).catch(() => ({ configured: false, delivered: 0 })) : { configured: false, delivered: 0 };
      res.status(201).json({ ok: true, granted: reward.granted, amount: reward.reward.amount, total: reward.reward.total_granted, push });
    } catch (error) {
      const status = ['مفتاح المكافأة مطلوب', 'عنوان المكافأة مطلوب', 'قيمة المكافأة غير صحيحة', 'اختر مستخدمًا واحدًا للمكافأة', 'اختر مستخدمين للمكافأة الجماعية', 'لا يوجد مستخدم مؤهل لهذه المكافأة'].includes(error.message) ? 400 : 503;
      console.error('[admin rewards grant]:', error.code || error.message);
      res.status(status).json({ error: status === 400 ? error.message : 'تعذر إضافة المكافأة حاليًا' });
    }
  });

  app.get('/api/admin/stats', async (req, res) => {
    try {
      const [db, userRows, chatRows] = await Promise.all([affiliateData(), store.getUsers(), store.getChats()]);
      const orders = Array.isArray(db.orders) ? db.orders : [];
      const withdrawals = Array.isArray(db.withdrawals) ? db.withdrawals : [];
      const products = Array.isArray(db.products) ? db.products : [];
      const byStatus = {};
      orders.forEach(order => { const status = String(order.status || 'غير محدد'); byStatus[status] = (byStatus[status] || 0) + 1; });
      res.set('Cache-Control', 'no-store');
      res.json({ orders: orders.length, delivered: orders.filter(order => ['تم التسليم', 'تم التوصيل'].includes(String(order.status))).length, commission: orders.reduce((sum, order) => sum + Math.max(0, Number(order.commission) || 0), 0), users: userRows.length, products: products.length, withdrawals: withdrawals.filter(item => !['rejected', 'مرفوض'].includes(String(item.status))).length, chats: Object.keys(chatRows || {}).length, byStatus, recent: orders.slice(0, 8) });
    } catch (error) { console.error('[admin stats]:', error.message); res.status(503).json({ error: 'تعذر تحميل الإحصائيات' }); }
  });

  app.get('/api/admin/orders', async (req, res) => { try { res.json((await affiliateData()).orders || []); } catch (error) { res.status(503).json({ error: 'تعذر تحميل الطلبات' }); } });
  app.post('/api/admin/order-status', async (req, res) => {
    try {
      const id = String(req.body && req.body.id || '').trim();
      const status = String(req.body && req.body.status || '').trim();
      if (!id) return res.status(400).json({ error: 'رقم الطلب مطلوب' });
      if (!allowedStatus(status)) return res.status(400).json({ error: 'حالة الطلب غير صحيحة' });
      const result = await postgres.updateAffiliateOrderStatus(id, { status, adminUpdatedAt: new Date().toISOString() });
      if (!result) return res.status(404).json({ error: 'الطلب غير موجود' });
      if (global.notifyUser && result.statusChanged && result.order.userId != null) await Promise.resolve(global.notifyUser(result.order.userId, 'تحديث حالة طلب', 'حالة طلبك الآن: ' + status, '/store', 'order-status', 'order-status:' + id + ':' + status)).catch(() => null);
      res.json({ ok: true, order: result.order });
    } catch (error) { console.error('[admin order-status]:', error.message); res.status(503).json({ error: 'تعذر تحديث الطلب حاليًا' }); }
  });

  app.get('/api/admin/order-attempts/:id', async (req, res) => {
    try {
      const orderId = String(req.params.id || '').trim();
      if (!orderId) return res.status(400).json({ error: 'رقم الطلب مطلوب' });
      const attempts = await postgres.listAffiliateOrderAttemptsForAdmin(orderId, req.query.limit);
      res.set('Cache-Control', 'no-store');
      res.json({ orderId, attempts });
    } catch (error) { console.error('[admin order-attempts]:', error.message); res.status(503).json({ error: 'تعذر تحميل سجل محاولات الطلب' }); }
  });

  app.get('/api/admin/order-hook-reviews', async (req, res) => {
    try { res.set('Cache-Control', 'no-store'); res.json({ reviews: await postgres.listSafkaOrderWebhookReviews(req.query.limit) }); }
    catch (error) { console.error('[admin order-hook-reviews]:', error.message); res.status(503).json({ error: 'تعذر تحميل تحديثات المورد غير المرتبطة' }); }
  });

  app.post('/api/admin/order-review', async (req, res) => {
    try {
      const body = req.body || {};
      const orderId = String(body.id || body.orderId || '').trim();
      const decision = String(body.decision || '').trim().toLowerCase();
      const supplierOrderId = String(body.supplierOrderId || '').trim();
      const reason = String(body.reason || '').trim();
      const result = await postgres.reviewAffiliateOrderRequest(orderId, req.adminUser && req.adminUser.id, decision, supplierOrderId, reason);
      if (!result) return res.status(404).json({ error: 'الطلب غير موجود في قائمة المراجعة' });
      if (global.notifyUser) {
        const db = await affiliateData();
        const order = (db.orders || []).find(item => String(item.id || item.serial) === orderId);
        if (order && order.userId != null) await Promise.resolve(global.notifyUser(order.userId, 'تحديث مراجعة الطلب', decision === 'supplier_received' ? 'تمت مراجعة الطلب وربطه بحالته ومتابعته.' : 'تمت مراجعة حالة الطلب ويحتاج إجراء تجهيز منفصل.', '/store', 'order-status', 'order-review:' + orderId + ':' + String(result.manual_review_at || ''))).catch(() => null);
      }
      res.json({ ok: true, queue: result });
    } catch (error) {
      const status = error.code === 'ORDER_NOT_FOUND' ? 404 : ['INVALID_REVIEW_DECISION', 'SUPPLIER_ORDER_ID_REQUIRED', 'INVALID_REVIEW_REASON', 'ORDER_NOT_REVIEWABLE'].includes(error.code) ? 409 : 503;
      console.error('[admin order-review]:', error.code || error.message);
      res.status(status).json({ error: ['INVALID_REVIEW_DECISION', 'SUPPLIER_ORDER_ID_REQUIRED', 'INVALID_REVIEW_REASON', 'ORDER_NOT_REVIEWABLE', 'ORDER_NOT_FOUND'].includes(error.code) ? error.message : 'تعذر حفظ قرار المراجعة حاليًا' });
    }
  });

  app.post('/api/admin/order-retry', async (req, res) => {
    try {
      const orderId = String(req.body && req.body.id || '').trim();
      const reason = String(req.body && req.body.reason || '').trim();
      if (!orderId) return res.status(400).json({ error: 'رقم الطلب مطلوب' });
      if (reason.length < 3) return res.status(400).json({ error: 'سبب إعادة المحاولة مطلوب' });
      const result = await postgres.retryAffiliateOrderRequest(orderId, req.adminUser && req.adminUser.id, reason);
      if (!result) return res.status(404).json({ error: 'الطلب غير موجود في قائمة الإرسال' });
      if (global.notifyUser) {
        const db = await affiliateData();
        const order = (db.orders || []).find(item => String(item.id || item.serial) === orderId);
        if (order && order.userId != null) await Promise.resolve(global.notifyUser(order.userId, 'إعادة تجهيز الطلب', 'تمت إعادة الطلب إلى قائمة التجهيز بعد مراجعة الإدارة.', '/store', 'order-status', 'order-retry:' + orderId + ':' + String(result.last_manual_retry_at || ''))).catch(() => null);
      }
      res.json({ ok: true, queue: result });
    } catch (error) {
      const status = error.code === 'ORDER_NOT_FOUND' ? 404 : ['INVALID_RETRY_REASON', 'ORDER_NOT_RETRYABLE', 'ORDER_RETRY_UNSAFE'].includes(error.code) ? 409 : 503;
      console.error('[admin order-retry]:', error.code || error.message);
      res.status(status).json({ error: ['INVALID_RETRY_REASON', 'ORDER_NOT_RETRYABLE', 'ORDER_RETRY_UNSAFE'].includes(error.code) || error.code === 'ORDER_NOT_FOUND' ? error.message : 'تعذر إعادة تجهيز الطلب حاليًا' });
    }
  });

  app.get('/api/admin/products', async (req, res) => {
    try {
      const db = await affiliateData();
      let products = Array.isArray(db.products) ? db.products : [];
      if (!products.length) {
        try {
          const fs = require('fs');
          const cacheFile = path.join(__dirname, 'products-cache.json');
          if (fs.existsSync(cacheFile)) {
            const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
            products = Array.isArray(cached) ? cached : [];
            if (products.length) await postgres.upsertAffiliateProducts(products);
          }
        } catch (cacheError) { console.warn('[admin products cache]:', cacheError.message); }
      }
      res.set('Cache-Control', 'no-store');
      res.json(products.map(product => productWithPrice(product, db.priceUp)));
    } catch (error) { console.error('[admin products]:', error.message); res.status(503).json({ error: 'تعذر تحميل المنتجات' }); }
  });

  app.post('/api/admin/product', async (req, res) => {
    try {
      const body = Object.assign({}, req.body || {});
      const id = String(body.id || '').trim() || 'manual-' + Date.now();
      const locked = body.adminPriceLocked === true || body.lockPrice === true;
      const salePrice = Number(body.adminSalePrice != null ? body.adminSalePrice : body.price);
      const commission = Number(body.adminCommission != null ? body.adminCommission : body.commission);
      delete body.password;
      delete body.apiKey;
      delete body.lockPrice;
      body.adminPriceLocked = locked;
      body.adminSalePrice = locked && Number.isFinite(salePrice) ? salePrice : null;
      body.adminCommission = locked && Number.isFinite(commission) ? commission : null;
      const rawWholesale = Number(body.rawWholesalePrice != null ? body.rawWholesalePrice : (body.basePrice != null ? body.basePrice : body.cost));
      const pricing = await affiliateData();
      const adjustedWholesale = productWholesalePrice(rawWholesale, pricing.priceUp);
      if (locked && Number.isFinite(salePrice) && Number.isFinite(adjustedWholesale) && salePrice < adjustedWholesale) return res.status(400).json({ error: 'سعر البيع لا يمكن أن يقل عن سعر الجملة المعتمد' });
      body.basePrice = Number.isFinite(rawWholesale) ? rawWholesale : 0;
      const before = (await affiliateData()).products.find(item => String(item.id || item.sourceId || '') === id) || {};
      if (before.aiDescription === true || before.descriptionSource === 'gemini-2.5-flash-lite') {
        body.aiDescription = true;
        body.descriptionSource = before.descriptionSource || 'gemini-2.5-flash-lite';
        body.descriptionUpdatedAt = before.descriptionUpdatedAt || null;
      }
      const saved = await postgres.saveAffiliateProduct(Object.assign({}, body, { id, updatedAt: new Date().toISOString() }));
      const sqlPricing = await postgres.setAdminProductPricing(id, { locked, salePrice: body.adminSalePrice, commission: body.adminCommission }, req.adminUser && req.adminUser.id);
      if (locked && Number.isFinite(salePrice) && Number(before.adminSalePrice) !== salePrice && global.notifyBroadcast) {
        await Promise.resolve(global.notifyBroadcast({ title: 'تحديث سعر منتج', body: 'تم تحديث سعر منتج في الكتالوج؛ راجع مركز الإشعارات لمعرفة التفاصيل.', url: '/store', type: 'price', eventKey: 'product-price:' + id + ':' + salePrice })).catch(() => null);
      }
      res.json({ ok: true, product: Object.assign({}, saved, sqlPricing || {}, { adminPriceLocked: locked, adminSalePrice: body.adminSalePrice, adminCommission: body.adminCommission }) });
    } catch (error) { console.error('[admin product]:', error.message); res.status(error.message === 'سعر البيع لا يمكن أن يقل عن سعر الجملة المعتمد' ? 400 : 503).json({ error: error.message === 'سعر البيع لا يمكن أن يقل عن سعر الجملة المعتمد' ? error.message : 'تعذر حفظ المنتج' }); }
  });

  app.post('/api/admin/products/:id/ai-description', async (req, res) => {
    try {
      const id = String(req.params.id || '').trim();
      if (!id) return res.status(400).json({ error: 'معرّف المنتج مطلوب' });
      if (!allowAiDescription(req.adminUser && req.adminUser.id)) return res.status(429).json({ error: 'تم الوصول لحد التوليد المؤقت، حاول بعد دقائق.' });
      const localData = await affiliateData();
      let product = (Array.isArray(localData.products) ? localData.products : []).find(item => [item && item.id, item && item.sourceId, item && item.source_product_id].filter(Boolean).map(String).includes(id));
      if (!product) {
        const catalog = await postgres.getAffiliateCatalogData();
        product = (Array.isArray(catalog.products) ? catalog.products : []).find(item => [item && item.id, item && item.sourceId, item && item.sourceProductId].filter(Boolean).map(String).includes(id));
      }
      if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
      const generated = await generateProductDescription(product);
      const saved = await postgres.saveAiProductDescription(id, generated.description, { model: generated.model, generatedBy: req.adminUser && req.adminUser.id ? String(req.adminUser.id) : null }, product);
      res.set('Cache-Control', 'no-store');
      res.json({ ok: true, productId: id, description: saved.description, model: generated.model, updatedAt: saved.descriptionUpdatedAt });
    } catch (error) {
      const status = error.code === 'GEMINI_PRODUCT_NAME_REQUIRED' ? 400 : error.code === 'GEMINI_NOT_CONFIGURED' ? 503 : error.code === 'GEMINI_UPSTREAM_ERROR' || error.code === 'GEMINI_NETWORK_ERROR' || error.code === 'GEMINI_EMPTY_RESPONSE' ? 502 : 503;
      console.error('[admin ai-description]:', error.code || error.message);
      res.status(status).json({ error: error.message && /^مفتاح Gemini|^ميزة توليد|^اسم المنتج|^تم الوصول|^تعذر توليد|^انتهى وقت|^تعذر الاتصال|^لم ينتج/.test(error.message) ? error.message : 'تعذر توليد وصف المنتج حاليًا' });
    }
  });

  app.post('/api/admin/product-delete', async (req, res) => {
    try {
      const id = String(req.body && req.body.id || '').trim();
      if (!id) return res.status(400).json({ error: 'معرّف المنتج مطلوب' });
      const deleted = await postgres.deleteAffiliateProduct(id);
      if (!deleted) return res.status(404).json({ error: 'المنتج غير موجود' });
      res.json({ ok: true });
    } catch (error) { res.status(503).json({ error: 'تعذر حذف المنتج' }); }
  });

  app.post('/api/admin/products/import', async (req, res) => {
    try {
      const incoming = (await fetchSafkaProducts()).map(mapSafkaProduct);
      const result = await postgres.upsertAffiliateProducts(incoming);
      res.json({ ok: true, fetched: incoming.length, added: result.inserted, updated: result.updated, total: incoming.length });
    } catch (error) {
      console.error('[admin products import]:', error.message);
      res.status(502).json({ ok: false, error: error.message === 'مفتاح المنتجات غير مضبوط' ? error.message : 'تعذر استيراد المنتجات حاليًا' });
    }
  });

  app.get('/api/admin/price', async (req, res) => {
    try {
      const data = await affiliateData();
      res.set('Cache-Control', 'no-store');
      res.json({ up: Math.max(0, Math.min(200, Number(data.priceUp) || 0)), updatedAt: data.pricePolicyUpdatedAt || null });
    } catch (error) { res.status(503).json({ error: 'تعذر تحميل إعداد الأسعار' }); }
  });
  app.post('/api/admin/price-up', async (req, res) => {
    try {
      let up = Number(req.body && req.body.up);
      if (!Number.isFinite(up)) up = 0;
      up = Math.max(0, Math.min(200, up));
      const before = await affiliateData();
      const previous = Number(before.priceUp || 0);
      if (previous === up) return res.json({ ok: true, up, updatedAt: before.pricePolicyUpdatedAt || null, changed: false });
      await postgres.updateAffiliateMeta({ priceUp: up });
      const after = await affiliateData();
      if (global.notifyBroadcast) await Promise.resolve(global.notifyBroadcast({ title: 'تحديث أسعار المنتجات', body: 'تم تحديث أسعار البيع بواسطة إدارة المنصة.', url: '/store', type: 'price', eventKey: 'global-price-up:' + up })).catch(() => null);
      res.set('Cache-Control', 'no-store');
      res.json({ ok: true, up, updatedAt: after.pricePolicyUpdatedAt || new Date().toISOString(), changed: true });
    } catch (error) { res.status(503).json({ error: 'تعذر حفظ إعداد الأسعار' }); }
  });

  app.get('/api/admin/users', async (req, res) => { try { res.set('Cache-Control', 'no-store'); res.json((await store.getUsers()).map(safeUser)); } catch (error) { res.status(503).json({ error: 'تعذر تحميل المستخدمين' }); } });
  app.get('/api/admin/users/:id/actions', async (req, res) => {
    try { res.set('Cache-Control', 'no-store'); res.json({ actions: await postgres.listAdminUserActions(req.params.id, req.query.limit) }); }
    catch (error) { console.error('[admin user actions]:', error.message); res.status(503).json({ error: 'تعذر تحميل سجل الحساب' }); }
  });
  app.post('/api/admin/users', async (req, res) => {
    try {
      const user = await postgres.createAdminUser(req.body || {}, req.adminUser && req.adminUser.id);
      res.status(201).json({ ok: true, user: safeUser(user) });
    } catch (error) {
      const status = ['INVALID_USER_NAME', 'INVALID_USER_EMAIL', 'INVALID_USER_PASSWORD', 'DUPLICATE_USER_EMAIL'].includes(error.code) ? 400 : 503;
      console.error('[admin user create]:', error.code || error.message);
      res.status(status).json({ error: status === 400 ? error.message : 'تعذر إنشاء الحساب حاليًا' });
    }
  });
  app.patch('/api/admin/users/:id', async (req, res) => {
    try {
      const user = await postgres.updateAdminUser(req.params.id, req.body || {}, req.adminUser && req.adminUser.id);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
      res.json({ ok: true, user: safeUser(user) });
    } catch (error) {
      const status = ['INVALID_USER_NAME', 'INVALID_USER_EMAIL', 'DUPLICATE_USER_EMAIL'].includes(error.code) ? 400 : 503;
      console.error('[admin user update]:', error.code || error.message);
      res.status(status).json({ error: status === 400 ? error.message : 'تعذر تعديل بيانات الحساب' });
    }
  });
  app.post('/api/admin/users/:id/reset-password', async (req, res) => {
    try {
      const user = await postgres.resetAdminUserPassword(req.params.id, String(req.body && req.body.password || ''), req.adminUser && req.adminUser.id);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
      if (global.notifyUser) await Promise.resolve(global.notifyUser(user.id, 'تم تحديث كلمة المرور', 'تم تغيير كلمة مرور حسابك بواسطة إدارة المنصة. سجّل الدخول بكلمة المرور الجديدة.', '/login', 'account', 'account-password:' + user.id + ':' + String(user.password_changed_at || Date.now()))).catch(() => null);
      res.json({ ok: true, user: safeUser(user), sessionsRevoked: true });
    } catch (error) {
      const status = error.code === 'INVALID_USER_PASSWORD' ? 400 : 503;
      console.error('[admin user password]:', error.code || error.message);
      res.status(status).json({ error: status === 400 ? error.message : 'تعذر تحديث كلمة المرور' });
    }
  });
  app.post('/api/admin/users/:id/access', async (req, res) => {
    try {
      const id = String(req.params.id || '').trim();
      const mode = String(req.body && req.body.mode || '').trim().toLowerCase();
      if (id === String(req.adminUser && req.adminUser.id) && mode !== 'active') return res.status(400).json({ error: 'لا يمكنك حظر حسابك الإداري من هنا' });
      const user = await postgres.setUserAccessState(id, req.body || {}, req.adminUser && req.adminUser.id);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
      const blocked = isAccountBlocked(user);
      if (global.notifyUser) await Promise.resolve(global.notifyUser(user.id, blocked ? 'تم تقييد الحساب' : 'تمت استعادة الحساب', blocked ? (user.banned ? 'تم حظر حسابك نهائيًا بواسطة إدارة المنصة.' : 'تم إيقاف حسابك مؤقتًا بواسطة إدارة المنصة.') : 'تمت استعادة إمكانية الدخول إلى حسابك.', '/login', 'account', 'account-access:' + user.id + ':' + accountStatus(user) + ':' + String(user.updated_at || Date.now()))).catch(() => null);
      res.json({ ok: true, user: safeUser(user), sessionsRevoked: blocked });
    } catch (error) {
      const status = ['INVALID_ACCESS_STATE', 'INVALID_SUSPENSION_DATE'].includes(error.code) ? 400 : 503;
      console.error('[admin user access]:', error.code || error.message);
      res.status(status).json({ error: status === 400 ? error.message : 'تعذر تحديث وصول الحساب' });
    }
  });
  app.post('/api/admin/user-ban', async (req, res) => {
    try {
      const id = String(req.body && req.body.id || '').trim();
      if (!id) return res.status(400).json({ error: 'معرّف المستخدم مطلوب' });
      const banned = Boolean(req.body && req.body.banned);
      if (id === String(req.adminUser && req.adminUser.id) && banned) return res.status(400).json({ error: 'لا يمكنك حظر حسابك الإداري من هنا' });
      const user = await postgres.setUserAccessState(id, banned ? { mode: 'permanent', reason: 'حظر من لوحة الإدارة' } : { mode: 'active', reason: '' }, req.adminUser && req.adminUser.id);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
      if (global.notifyUser) await Promise.resolve(global.notifyUser(user.id, banned ? 'تم تعليق الحساب' : 'تمت إعادة تفعيل الحساب', banned ? 'تم تعليق الوصول إلى حسابك بواسطة إدارة المنصة.' : 'تمت إعادة تفعيل الوصول إلى حسابك.', '/login', 'account', 'account-ban:' + user.id + ':' + banned)).catch(() => null);
      res.json({ ok: true, user: safeUser(user) });
    } catch (error) { res.status(503).json({ error: 'تعذر تحديث حالة الحساب' }); }
  });

  app.get('/api/admin/admins', async (req, res) => {
    try {
      const rows = await store.getUsers();
      res.json(rows.filter(user => ADMIN_ROLES.includes(String(user.role || '').toLowerCase()) || envAllows(user)).map(safeUser));
    } catch (error) { res.status(503).json({ error: 'تعذر تحميل فريق الإدارة' }); }
  });
  app.post('/api/admin/admins', async (req, res) => {
    try {
      const body = req.body || {};
      const target = body.userId ? await store.getUser(body.userId) : await store.findUserByEmail(body.email);
      if (!target) return res.status(404).json({ error: 'المستخدم غير موجود؛ يجب إنشاء الحساب من صفحة التسجيل أولًا' });
      const role = String(body.role || 'manager').trim().toLowerCase();
      if (!ADMIN_ROLES.includes(role)) return res.status(400).json({ error: 'دور المدير غير صحيح' });
      if (role === 'owner' && !req.adminUser.__envAdmin && req.adminUser.role !== 'owner') return res.status(403).json({ error: 'تعيين المالك متاح لمالك المنصة فقط' });
      const permissions = Array.isArray(body.permissions) ? body.permissions.filter(item => ADMIN_PERMISSIONS.includes(item)) : rolePermissions(role);
      const updated = await postgres.updateUserAdminFields(target.id, { role, permissions, banned: target.banned });
      if (updated && global.notifyUser) await Promise.resolve(global.notifyUser(updated.id, 'تحديث صلاحيات الحساب', 'تم تحديث دورك الإداري إلى: ' + role, '/admin', 'admin-role', 'admin-role:' + updated.id + ':' + role)).catch(() => null);
      res.json({ ok: true, admin: safeUser(updated) });
    } catch (error) { console.error('[admin add]:', error.message); res.status(503).json({ error: 'تعذر إضافة المدير' }); }
  });
  app.patch('/api/admin/admins/:id', async (req, res) => {
    try {
      const target = await store.getUser(req.params.id);
      if (!target) return res.status(404).json({ error: 'المدير غير موجود' });
      const body = req.body || {};
      const role = body.role == null ? String(target.role || 'user') : String(body.role).trim().toLowerCase();
      if (!ADMIN_ROLES.includes(role) && role !== 'user') return res.status(400).json({ error: 'دور المدير غير صحيح' });
      if (role === 'owner' && !req.adminUser.__envAdmin && req.adminUser.role !== 'owner') return res.status(403).json({ error: 'تعيين المالك متاح لمالك المنصة فقط' });
      const permissions = Array.isArray(body.permissions) ? body.permissions.filter(item => ADMIN_PERMISSIONS.includes(item)) : (role === 'user' ? [] : rolePermissions(role));
      const updated = await postgres.updateUserAdminFields(target.id, { role, permissions, banned: typeof body.banned === 'boolean' ? body.banned : target.banned });
      if (updated && global.notifyUser) await Promise.resolve(global.notifyUser(updated.id, 'تحديث صلاحيات الحساب', role === 'user' ? 'تمت إزالة الدور الإداري من حسابك.' : 'تم تحديث دورك الإداري إلى: ' + role, role === 'user' ? '/store' : '/admin', 'admin-role', 'admin-role:' + updated.id + ':' + role)).catch(() => null);
      res.json({ ok: true, admin: safeUser(updated) });
    } catch (error) { res.status(503).json({ error: 'تعذر تحديث صلاحيات المدير' }); }
  });

  app.get('/api/admin/withdrawals', async (req, res) => { try { res.json((await affiliateData()).withdrawals || []); } catch (error) { res.status(503).json({ error: 'تعذر تحميل السحوبات' }); } });
  app.post('/api/admin/withdrawal-status', async (req, res) => {
    try {
      const id = String(req.body && req.body.id || '').trim();
      const status = String(req.body && req.body.status || '').trim();
      if (!id) return res.status(400).json({ error: 'رقم السحب مطلوب' });
      if (!allowedWithdrawalStatus(status)) return res.status(400).json({ error: 'حالة السحب غير صحيحة' });
      const result = await postgres.updateAffiliateWithdrawalStatus(id, status);
      if (!result) return res.status(404).json({ error: 'طلب السحب غير موجود' });
      if (global.notifyUser && result.changed && result.withdrawal.userId != null) await Promise.resolve(global.notifyUser(result.withdrawal.userId, 'تحديث طلب السحب', 'حالة طلب السحب الآن: ' + status, '/store', 'withdrawal-status', 'withdrawal-status:' + id + ':' + status)).catch(() => null);
      res.json({ ok: true, withdrawal: result.withdrawal, balance: result.balance });
    } catch (error) { console.error('[admin withdrawal-status]:', error.message); res.status(503).json({ error: 'تعذر تحديث طلب السحب حاليًا' }); }
  });

  app.get('/api/admin/chats', async (req, res) => { try { res.json(await store.getChats()); } catch (error) { res.status(503).json({ error: 'تعذر تحميل محادثات الدعم' }); } });
  app.post('/api/admin/chat-reply', async (req, res) => {
    try {
      const key = String(req.body && req.body.key || '').trim();
      const text = String(req.body && req.body.text || '').trim();
      if (!key || !text) return res.status(400).json({ error: 'المحادثة والرد مطلوبان' });
      const message = { id: Date.now(), from: 'support', type: 'text', text, time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) };
      await postgres.appendChatMessage(key, message);
      if (global.notifyChat) global.notifyChat();
      if (global.notifyUser && key.startsWith('u')) await Promise.resolve(global.notifyUser(key.slice(1), 'رد من الدعم', text, '/store', 'support', 'support:' + key + ':' + message.id)).catch(() => null);
      res.json({ ok: true, message });
    } catch (error) { console.error('[admin chat-reply]:', error.message); res.status(503).json({ error: 'تعذر إرسال الرد حاليًا' }); }
  });
  let streams = [];
  global.notifyChat = () => streams.forEach(push => { try { push(); } catch (_) {} });
  app.get('/api/admin/chat-stream', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    res.write('data: ready\n\n');
    const push = () => res.write('data: ' + Date.now() + '\n\n');
    streams.push(push);
    req.on('close', () => { streams = streams.filter(item => item !== push); });
  });

  app.get('/api/admin/settings', async (req, res) => { try { res.json((await affiliateData()).settings || { name: 'Rab7na', currency: 'ج.م', whatsapp: '', commission: 30, announcement: '' }); } catch (error) { res.status(503).json({ error: 'تعذر تحميل الإعدادات' }); } });
  app.post('/api/admin/settings', async (req, res) => {
    try {
      const current = (await affiliateData()).settings || {};
      const allowed = ['name', 'currency', 'whatsapp', 'commission', 'announcement'];
      const next = {};
      allowed.forEach(key => { if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) next[key] = String(req.body[key] == null ? '' : req.body[key]).slice(0, 500); });
      await postgres.updateAffiliateMeta({ settings: Object.assign({}, current, next) });
      res.json({ ok: true, settings: Object.assign({}, current, next) });
    } catch (error) { res.status(503).json({ error: 'تعذر حفظ الإعدادات' }); }
  });
};
