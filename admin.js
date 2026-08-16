const path = require('path');
const crypto = require('crypto');
const store = require('./firestore');
const { availableBalance } = require('./balance');

const SAFKA_BASE_URL = String(process.env.SAFKA_BASE_URL || 'https://api.safka.com/api/v1').replace(/\/$/, '');

async function fetchSafkaProducts() {
  const key = String(process.env.SAFKA_API_KEY || '').trim();
  if (!key) throw new Error('مفتاح Safka غير مضبوط');
  const all = [];
  const first = await fetch(SAFKA_BASE_URL + '/products?page=1&size=50', { headers: { 'api-safka-key': key } });
  if (!first.ok) throw new Error('تعذر الاتصال بمصدر المنتجات');
  const firstJson = await first.json();
  all.push(...(Array.isArray(firstJson.data) ? firstJson.data : []));
  const pages = Math.min(Number(firstJson.pages) || 1, 20);
  for (let page = 2; page <= pages; page++) {
    const r = await fetch(SAFKA_BASE_URL + '/products?page=' + page + '&size=50', { headers: { 'api-safka-key': key } });
    if (!r.ok) continue;
    const json = await r.json();
    all.push(...(Array.isArray(json.data) ? json.data : []));
  }
  return all;
}

function mapSafkaProduct(p) {
  const prop = (Array.isArray(p.properties) && p.properties[0]) || {};
  const cost = Number(p.sale_price || p.price || 0) || 0;
  const stock = typeof prop.value === 'number' ? prop.value : (prop.is_available === false ? 0 : 99);
  return {
    id: p._id || p.id || ('safka-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)),
    source: 'safka', sourceId: String(p._id || p.id || ''),
    name: p.name || p.title || 'منتج', description: p.description || p.desc || p.note || '',
    image: (Array.isArray(p.images) && p.images[0]) || p.image || '',
    price: Math.round(cost), cost, base_price: cost, commission: 0,
    stock, available: prop.is_available !== false && stock > 0, active: prop.is_available !== false && stock > 0,
    cat: p.category || p._cat || 'أخرى', barcode: p.barcode || '', updatedAt: new Date().toISOString()
  };
}

function tokenFrom(req) {
  const h = String(req.headers.authorization || '');
  return String(req.headers['x-auth-token'] || (h.toLowerCase().startsWith('bearer ') ? h.slice(7) : '') || '').trim();
}

const ADMIN_PERMISSIONS = ['dashboard', 'orders', 'products', 'users', 'withdrawals', 'chats', 'notifications', 'settings', 'admins'];
const ROLE_PERMISSIONS = {
  owner: ADMIN_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  manager: ['dashboard', 'orders', 'products', 'users', 'withdrawals', 'chats', 'notifications', 'settings'],
  support: ['dashboard', 'orders', 'chats', 'notifications'],
  finance: ['dashboard', 'orders', 'withdrawals'],
  products: ['dashboard', 'products']
};
function hasPermission(user, permission) {
  if (!user) return false;
  if (user.__envAdmin || user.role === 'owner' || user.role === 'admin') return true;
  const role = String(user.role || '').toLowerCase();
  const fromRole = ROLE_PERMISSIONS[role] || [];
  const custom = Array.isArray(user.permissions) ? user.permissions : [];
  return fromRole.includes(permission) || custom.includes(permission);
}
function rolePermissions(role) { return ROLE_PERMISSIONS[String(role || '').toLowerCase()] || []; }
function hashAdminPassword(password) { return crypto.createHash('sha256').update('earnify:' + String(password)).digest('hex'); }

async function requireAdmin(req, res, next) {
  try {
    const payload = global.verifyJWT && global.verifyJWT(tokenFrom(req));
    if (!payload) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
    const user = await store.getUser(payload.uid);
    if (!user || user.banned) return res.status(403).json({ error: 'الحساب غير مسموح له بالدخول' });
    const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminUid = String(process.env.ADMIN_USER_ID || '').trim();
    const envAllowed = (adminEmail && [user.email, user.contact, user.username].some(v => String(v || '').trim().toLowerCase() === adminEmail)) ||
      (adminUid && String(user.id) === adminUid);
    const allowed = hasPermission(user, 'dashboard') || user.isAdmin === true || envAllowed;
    if (!allowed) return res.status(403).json({ error: 'هذه الصفحة مخصصة لمدير المنصة فقط' });
    req.adminUser = envAllowed ? Object.assign({}, user, { __envAdmin: true, role: user.role || 'owner' }) : user;
    next();
  } catch (e) {
    console.error('admin auth:', e.message);
    return res.status(500).json({ error: 'تعذر التحقق من صلاحيات المدير' });
  }
}

function allowedStatus(status) {
  return ['جديد', 'تم التأكيد', 'تم الشحن', 'تم التوصيل', 'تم التحصيل', 'تم التسليم', 'مرتجع', 'طلب استبدال', 'ملغي'].includes(String(status || ''));
}

async function data() { return store.getAffiliateData(); }
async function users() { return { users: await store.getUsers() }; }
async function chats() { return store.getChats(); }
async function writeData(d) { await store.saveAffiliateData(d); }
async function writeUsers(u) { await store.saveUsers(u.users || []); }

global.requireAdmin = requireAdmin;

module.exports = function (app) {
  app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
  app.use('/api/admin', requireAdmin);
  app.use('/api/admin', (req, res, next) => {
    const p = req.path || '';
    let permission = 'dashboard';
    if (/^\/(orders|order-status)/.test(p)) permission = 'orders';
    else if (/^\/(products|product|product-delete|price|price-up)/.test(p)) permission = 'products';
    else if (/^\/(users|user-ban)/.test(p)) permission = 'users';
    else if (/^\/(withdrawals|withdrawal-status)/.test(p)) permission = 'withdrawals';
    else if (/^\/(chats|chat-reply|chat-stream)/.test(p)) permission = 'chats';
    else if (/^\/(settings)/.test(p)) permission = 'settings';
    else if (/^\/(notifications|notify)/.test(p)) permission = 'notifications';
    else if (/^\/(admins|admin-users)/.test(p)) permission = 'admins';
    if (!hasPermission(req.adminUser, permission)) return res.status(403).json({ error: 'ليس لديك صلاحية لهذا القسم', permission });
    next();
  });
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const [d, u, c] = await Promise.all([data(), users(), chats()]);
      const orders = d.orders || [];
      const commission = orders.reduce((s, o) => s + (+o.commission || 0), 0);
      const sales = orders.filter(o => o.status === 'تم التسليم').length;
      const byStatus = {}; orders.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
      res.json({ orders: orders.length, commission, sales, users: u.users.length, products: (d.products || []).length, withdrawals: (d.withdrawals || []).filter(w => w.status === 'pending').length, chats: Object.keys(c).length, byStatus, recent: orders.slice(0, 8) });
    } catch (e) { res.status(500).json({ error: 'تعذر تحميل الإحصائيات' }); }
  });
  app.get('/api/admin/orders', async (req, res) => { try { res.json((await data()).orders || []); } catch (e) { res.status(500).json({ error: 'تعذر تحميل الطلبات' }); } });
  app.post('/api/admin/order-status', async (req, res) => {
    try {
      const b = req.body || {}; const d = await data(); const o = (d.orders || []).find(x => String(x.id) === String(b.id));
      if (!o) return res.json({ error: 'الطلب غير موجود' });
      if (!allowedStatus(b.status)) return res.status(400).json({ error: 'حالة الطلب غير صحيحة' });
      const previous = o.status; o.status = String(b.status);
      await writeData(d);
      if (o.userId != null) {
        const u = await store.getUser(o.userId);
        if (u) {
          if (b.status === 'تم التسليم' && previous !== 'تم التسليم' && (+o.commission || 0) > 0) u.totalEarned = (+u.totalEarned || 0) + (+o.commission || 0);
          u.balance = availableBalance(u, d);
          await store.saveUser(u);
        }
      }
      if (global.notifyUser && o.userId != null) global.notifyUser(o.userId, 'تحديث حالة طلب', 'حالة طلبك الآن: ' + b.status, '/', 'order-status');
      res.json({ ok: true });
    } catch (e) { console.error('order-status:', e.message); res.status(500).json({ error: 'تعذر تحديث الطلب' }); }
  });
  app.get('/api/admin/products', async (req, res) => { try { res.json((await data()).products || []); } catch (e) { res.status(500).json({ error: 'تعذر تحميل المنتجات' }); } });
  app.post('/api/admin/product', async (req, res) => {
    try { const b = req.body || {}; const d = await data(); d.products = d.products || []; if (b.id) { const p = d.products.find(x => String(x.id) === String(b.id)); if (p) Object.assign(p, b); } else { b.id = Date.now(); d.products.push(b); if (global.sendPush) global.sendPush({ headings: 'منتج جديد', contents: b.name, url: '/' }); } await writeData(d); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: 'تعذر حفظ المنتج' }); }
  });
  app.post('/api/admin/product-delete', async (req, res) => { try { const d = await data(); d.products = (d.products || []).filter(x => String(x.id) !== String(req.body.id)); await writeData(d); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'تعذر حذف المنتج' }); } });
  app.post('/api/admin/products/import', async (req, res) => {
    try {
      const incoming = (await fetchSafkaProducts()).map(mapSafkaProduct);
      const d = await data();
      const current = Array.isArray(d.products) ? d.products : [];
      const byId = new Map(current.map(p => [String(p.id), p]));
      let added = 0, updated = 0;
      for (const product of incoming) {
        const old = byId.get(String(product.id));
        if (old) { byId.set(String(product.id), Object.assign({}, old, product)); updated++; }
        else { byId.set(String(product.id), product); added++; }
      }
      d.products = Array.from(byId.values());
      await writeData(d);
      res.json({ ok: true, fetched: incoming.length, added, updated, total: d.products.length });
    } catch (e) {
      console.error('products import:', e.message);
      res.status(502).json({ ok: false, error: e.message === 'مفتاح Safka غير مضبوط' ? e.message : 'تعذر استيراد المنتجات من Safka' });
    }
  });
  app.get('/api/admin/price', async (req, res) => { try { res.json({ up: (await data()).priceUp || 0 }); } catch (e) { res.status(500).json({ error: 'تعذر تحميل السعر' }); } });
  app.post('/api/admin/price-up', async (req, res) => { try { const d = await data(); let v = +(req.body && req.body.up) || 0; v = Math.max(0, Math.min(200, v)); d.priceUp = v; await writeData(d); res.json({ ok: true, up: v }); } catch (e) { res.status(500).json({ error: 'تعذر حفظ الزيادة' }); } });
  app.get('/api/admin/users', async (req, res) => { try { const db = await users(); const now = Date.now(); res.json((db.users || []).map(u => ({ id: u.id, name: u.name, contact: u.contact, balance: u.balance || 0, created: u.created, lastSeen: u.lastSeen || 0, banned: !!u.banned, lastAction: u.lastAction || '', activity: (u.activity || []).slice(0, 50), online: !!(u.lastSeen && now - u.lastSeen < 120000) }))); } catch (e) { res.status(500).json({ error: 'تعذر تحميل المستخدمين' }); } });
  app.post('/api/admin/user-ban', async (req, res) => { try { const db = await users(); const u = (db.users || []).find(x => String(x.id) === String(req.body.id)); if (!u) return res.json({ error: 'مش موجود' }); u.banned = !!req.body.banned; await store.saveUser(u); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'تعذر تحديث الحساب' }); } });
  app.get('/api/admin/admins', async (req, res) => {
    try {
      const db = await users();
      res.json((db.users || []).filter(u => u.role || u.isAdmin).map(u => ({ id: u.id, name: u.name || u.display_name || u.username, contact: u.contact || u.email || u.phone, email: u.email || '', role: u.role || (u.isAdmin ? 'admin' : 'user'), permissions: Array.isArray(u.permissions) ? u.permissions : [], banned: !!u.banned, created: u.created || '' })));
    } catch (e) { res.status(500).json({ error: 'تعذر تحميل المديرين' }); }
  });
  app.post('/api/admin/admins', async (req, res) => {
    try {
      const b = req.body || {}; const name = String(b.name || '').trim(); const contact = String(b.contact || b.email || '').trim().toLowerCase(); const password = String(b.password || '');
      const role = String(b.role || 'manager').trim().toLowerCase();
      if (role === 'owner' && !(req.adminUser && (req.adminUser.__envAdmin || req.adminUser.role === 'owner'))) return res.status(403).json({ error: 'إنشاء مالك جديد متاح لمالك المنصة فقط' });
      if (!name || !contact || password.length < 6) return res.status(400).json({ error: 'أدخل الاسم وبيانات الدخول وكلمة مرور من 6 أحرف على الأقل' });
      if (!['owner', 'admin', 'manager', 'support', 'finance', 'products'].includes(role)) return res.status(400).json({ error: 'دور المدير غير صحيح' });
      const db = await users(); const all = db.users || [];
      if (all.some(u => [u.email, u.contact, u.username].some(v => String(v || '').trim().toLowerCase() === contact))) return res.status(409).json({ error: 'بيانات الدخول مستخدمة بالفعل' });
      const u = { id: Date.now(), name, display_name: name, username: contact, contact, email: contact.includes('@') ? contact : '', pass: hashAdminPassword(password), role, isAdmin: true, permissions: Array.isArray(b.permissions) ? b.permissions.filter(p => ADMIN_PERMISSIONS.includes(p)) : rolePermissions(role), created: new Date().toISOString(), balance: 0 };
      await store.saveUser(u); res.json({ ok: true, admin: { id: u.id, name: u.name, contact: u.contact, role: u.role, permissions: u.permissions } });
    } catch (e) { console.error('create admin:', e.message); res.status(500).json({ error: 'تعذر إضافة المدير' }); }
  });
  app.patch('/api/admin/admins/:id', async (req, res) => {
    try {
      const u = await store.getUser(req.params.id); if (!u) return res.status(404).json({ error: 'المدير غير موجود' });
      const b = req.body || {}; if (b.role === 'owner' && !(req.adminUser && (req.adminUser.__envAdmin || req.adminUser.role === 'owner'))) return res.status(403).json({ error: 'تعيين دور المالك متاح لمالك المنصة فقط' }); if (b.role && ['owner', 'admin', 'manager', 'support', 'finance', 'products'].includes(String(b.role))) u.role = String(b.role); if (Array.isArray(b.permissions)) u.permissions = b.permissions.filter(p => ADMIN_PERMISSIONS.includes(p)); if (typeof b.banned === 'boolean') u.banned = b.banned; if (b.password && String(b.password).length >= 6) u.pass = hashAdminPassword(b.password);
      await store.saveUser(u); res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'تعذر تحديث المدير' }); }
  });
  app.get('/api/admin/withdrawals', async (req, res) => { try { res.json((await data()).withdrawals || []); } catch (e) { res.status(500).json({ error: 'تعذر تحميل السحوبات' }); } });
  app.post('/api/admin/withdrawal-status', async (req, res) => { try { const d = await data(); const w = (d.withdrawals || []).find(x => String(x.id) === String(req.body.id)); if (!w) return res.json({ error: 'مش موجود' }); w.status = req.body.status; await writeData(d); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'تعذر تحديث السحب' }); } });
  app.get('/api/admin/chats', async (req, res) => { try { res.json(await chats()); } catch (e) { res.status(500).json({ error: 'تعذر تحميل المحادثات' }); } });
  app.post('/api/admin/chat-reply', async (req, res) => { try { const b = req.body || {}; const all = await chats(); all[b.key] = all[b.key] || []; all[b.key].push({ id: Date.now(), from: 'support', type: 'text', text: b.text || '', time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }); await store.saveChats(all); if (global.notifyChat) global.notifyChat(); if (global.notifyUser && b.key && b.key[0] === 'u') global.notifyUser(b.key.slice(1), 'رد من الدعم', b.text, '/'); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'تعذر إرسال الرد' }); } });
  let sse = []; global.notifyChat = () => sse.forEach(f => { try { f(); } catch (e) {} });
  app.get('/api/admin/chat-stream', (req, res) => { res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }); res.flushHeaders(); res.write('data: ok\n\n'); const push = () => res.write('data: ' + Date.now() + '\n\n'); sse.push(push); req.on('close', () => { sse = sse.filter(x => x !== push); }); });
  app.get('/api/admin/settings', async (req, res) => { try { res.json((await data()).settings || { name: 'Rab7na', currency: 'ج.م', whatsapp: '', commission: 30, announcement: '' }); } catch (e) { res.status(500).json({ error: 'تعذر تحميل الإعدادات' }); } });
  app.post('/api/admin/settings', async (req, res) => { try { const d = await data(); d.settings = Object.assign(d.settings || {}, req.body || {}); await writeData(d); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: 'تعذر حفظ الإعدادات' }); } });
};
