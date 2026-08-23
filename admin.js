'use strict';

const path = require('path');
const store = require('./firestore');
const postgres = require('./lib/postgres');
const authService = require('./services/auth-postgres');

const SESSION_COOKIE = 'rab7na_session';
const ADMIN_PERMISSIONS = ['dashboard', 'orders', 'products', 'users', 'withdrawals', 'chats', 'settings', 'admins', 'notifications'];
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
    if (!user || user.banned) return res.status(403).json({ error: 'الحساب غير مسموح له بالدخول' });
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

function safeUser(user) {
  return {
    id: user.id,
    name: user.name || '',
    email: user.email || '',
    balance: Number(user.balance || 0),
    role: user.role || 'user',
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    banned: Boolean(user.banned),
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

function mapSafkaProduct(product) {
  const value = product || {};
  const base = Number(value.sale_price != null ? value.sale_price : (value.price || 0));
  const available = propertyAvailability(value);
  return {
    id: String(value._id || value.id || ('safka-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7))),
    source: 'safka',
    sourceId: String(value._id || value.id || ''),
    name: value.name || value.title || 'منتج',
    description: value.description || value.desc || value.note || '',
    image: (Array.isArray(value.images) && value.images[0]) || value.image || '',
    images: Array.isArray(value.images) ? value.images : [],
    price: Math.round(base),
    cost: base,
    basePrice: base,
    commission: 0,
    stock: null,
    available,
    active: available && value.is_active !== false,
    cat: value.category || value._cat || 'أخرى',
    barcode: value.barcode || '',
    note: value.note || '',
    raw: value,
    updatedAt: new Date().toISOString()
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
  const base = Number(value.basePrice != null ? value.basePrice : value.price) || 0;
  const locked = value.adminPriceLocked === true || value.admin_price_locked === true;
  const adminSale = Number(value.adminSalePrice != null ? value.adminSalePrice : value.admin_sale_price);
  const price = locked && Number.isFinite(adminSale) && adminSale >= base ? Math.round(adminSale) : Math.round(base * (1 + Number(priceUp || 0) / 100));
  return Object.assign({}, value, { basePrice: base, price, adminPriceLocked: locked, adminSalePrice: locked && Number.isFinite(adminSale) ? adminSale : null });
}

function allowedStatus(status) { return ORDER_STATUSES.includes(String(status || '')); }
function allowedWithdrawalStatus(status) { return WITHDRAWAL_STATUSES.includes(String(status || '')); }

function permissionForPath(requestPath) {
  const p = String(requestPath || '');
  if (/^\/(orders|order-status|order-attempts|order-retry)/.test(p)) return 'orders';
  if (/^\/(products|product|product-delete|price|price-up)/.test(p)) return 'products';
  if (/^\/(users|user-ban)/.test(p)) return 'users';
  if (/^\/(withdrawals|withdrawal-status)/.test(p)) return 'withdrawals';
  if (/^\/(chats|chat-reply|chat-stream)/.test(p)) return 'chats';
  if (/^\/(settings)/.test(p)) return 'settings';
  if (/^\/(admins)/.test(p)) return 'admins';
  if (/^\/(notifications)/.test(p)) return 'notifications';
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
      const basePrice = Number(body.basePrice != null ? body.basePrice : body.cost);
      if (locked && Number.isFinite(salePrice) && Number.isFinite(basePrice) && salePrice < basePrice) return res.status(400).json({ error: 'سعر البيع لا يمكن أن يقل عن سعر التكلفة' });
      const before = (await affiliateData()).products.find(item => String(item.id || item.sourceId || '') === id) || {};
      const saved = await postgres.saveAffiliateProduct(Object.assign({}, body, { id, updatedAt: new Date().toISOString() }));
      const sqlPricing = await postgres.setAdminProductPricing(id, { locked, salePrice: body.adminSalePrice, commission: body.adminCommission }, req.adminUser && req.adminUser.id);
      if (locked && Number.isFinite(salePrice) && Number(before.adminSalePrice) !== salePrice && global.notifyBroadcast) {
        await Promise.resolve(global.notifyBroadcast({ title: 'تحديث سعر منتج', body: 'تم تحديث سعر منتج في الكتالوج؛ راجع مركز الإشعارات لمعرفة التفاصيل.', url: '/store', type: 'price', eventKey: 'product-price:' + id + ':' + salePrice })).catch(() => null);
      }
      res.json({ ok: true, product: Object.assign({}, saved, sqlPricing || {}, { adminPriceLocked: locked, adminSalePrice: body.adminSalePrice, adminCommission: body.adminCommission }) });
    } catch (error) { console.error('[admin product]:', error.message); res.status(error.message === 'سعر البيع لا يمكن أن يقل عن سعر التكلفة' ? 400 : 503).json({ error: error.message === 'سعر البيع لا يمكن أن يقل عن سعر التكلفة' ? error.message : 'تعذر حفظ المنتج' }); }
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

  app.get('/api/admin/price', async (req, res) => { try { res.json({ up: Number((await affiliateData()).priceUp || 0) }); } catch (error) { res.status(503).json({ error: 'تعذر تحميل إعداد الأسعار' }); } });
  app.post('/api/admin/price-up', async (req, res) => {
    try {
      let up = Number(req.body && req.body.up);
      if (!Number.isFinite(up)) up = 0;
      up = Math.max(0, Math.min(200, up));
      const previous = Number((await affiliateData()).priceUp || 0);
      await postgres.updateAffiliateMeta({ priceUp: up });
      if (previous !== up && global.notifyBroadcast) await Promise.resolve(global.notifyBroadcast({ title: 'تحديث أسعار المنتجات', body: 'تم تحديث طريقة حساب أسعار البيع المقترحة من إدارة المنصة.', url: '/store', type: 'price', eventKey: 'global-price-up:' + up })).catch(() => null);
      res.json({ ok: true, up });
    } catch (error) { res.status(503).json({ error: 'تعذر حفظ إعداد الأسعار' }); }
  });

  app.get('/api/admin/users', async (req, res) => { try { res.json((await store.getUsers()).map(safeUser)); } catch (error) { res.status(503).json({ error: 'تعذر تحميل المستخدمين' }); } });
  app.post('/api/admin/user-ban', async (req, res) => {
    try {
      const id = String(req.body && req.body.id || '').trim();
      if (!id) return res.status(400).json({ error: 'معرّف المستخدم مطلوب' });
      const banned = Boolean(req.body && req.body.banned);
      const user = await postgres.updateUserBanned(id, banned);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
      if (global.notifyUser) await Promise.resolve(global.notifyUser(user.id, banned ? 'تم تعليق الحساب' : 'تمت إعادة تفعيل الحساب', banned ? 'تم تعليق الوصول إلى حسابك بواسطة إدارة المنصة.' : 'تمت إعادة تفعيل الوصول إلى حسابك.', '/store', 'account', 'account-ban:' + user.id + ':' + banned)).catch(() => null);
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
