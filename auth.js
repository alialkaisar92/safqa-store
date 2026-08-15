const crypto = require('crypto');
const path = require('path');
const store = require('./firestore');
const SECRET = process.env.JWT_SECRET || 'earnify_jwt_secret_2026';

function hashPw(p) { return crypto.createHash('sha256').update('earnify:' + String(p)).digest('hex'); }
function b64u(o) { return Buffer.from(JSON.stringify(o)).toString('base64url'); }
function sign(uid, expSec) {
  const h = b64u({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const p = b64u({ uid, iat: now, exp: now + expSec });
  const s = crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url');
  return h + '.' + p + '.' + s;
}
function verify(t) {
  if (!t) return null;
  try {
    const a = String(t).split('.');
    if (a.length !== 3) return null;
    const s = crypto.createHmac('sha256', SECRET).update(a[0] + '.' + a[1]).digest('base64url');
    if (s !== a[2]) return null;
    const pl = JSON.parse(Buffer.from(a[1], 'base64url').toString());
    return pl.exp * 1000 < Date.now() ? null : pl;
  } catch (e) { return null; }
}
global.verifyJWT = verify;
global.requireAuth = function (req, res, next) {
  const t = req.headers['x-auth-token'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const pl = verify(t);
  if (!pl) return res.status(401).json({ error: 'login' });
  req.userId = pl.uid;
  next();
};
function pub(u) { return { id: u.id, username: u.username || u.contact, display_name: u.display_name || u.name, name: u.name || u.display_name, contact: u.contact || u.username, phone: u.phone || u.contact, email: u.email || '', balance: u.balance || 0 }; }
async function issue(u) {
  const access = sign(u.id, 7200);
  const refresh = crypto.randomBytes(24).toString('hex');
  await store.saveToken(refresh, { uid: u.id, exp: Date.now() + 7 * 864e5 });
  return { access, refresh };
}

module.exports = function (app) {
  app.post('/api/auth/register', async (req, res) => {
    try {
      const b = req.body || {};
      const cid = String(b.contact || b.username || '').trim().toLowerCase();
      const display = String(b.name || b.display_name || cid).trim();
      if (!display || !cid || !b.password) return res.json({ error: 'املأ كل الحقول' });
      if (String(b.password).length < 6) return res.json({ error: 'كلمة السر 6 أحرف على الأقل' });
      if (await store.findUserByContact(cid)) return res.json({ error: 'الحساب موجود، سجّل دخول' });
      const u = { id: Date.now(), username: cid, display_name: display, name: display, contact: cid, phone: b.phone || cid, email: b.email || '', pass: hashPw(b.password), balance: 0, created: new Date().toISOString() };
      await store.saveUser(u);
      const t = await issue(u);
      res.json({ ok: true, token: t.access, refresh: t.refresh, user: pub(u) });
    } catch (e) { console.error('register:', e.message); res.status(500).json({ error: 'تعذر إنشاء الحساب حالياً' }); }
  });
  app.post('/api/auth/login', async (req, res) => {
    try {
      const b = req.body || {};
      const u = await store.findUserByContact(String(b.contact || b.username || '').trim().toLowerCase());
      if (!u || u.pass !== hashPw(b.password || '')) return res.json({ error: 'بيانات الدخول غلط' });
      if (u.banned) return res.json({ error: 'الحساب محظور' });
      u.lastSeen = Date.now(); await store.saveUser(u);
      const t = await issue(u);
      res.json({ ok: true, token: t.access, refresh: t.refresh, user: pub(u) });
    } catch (e) { console.error('login:', e.message); res.status(500).json({ error: 'تعذر تسجيل الدخول حالياً' }); }
  });
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const r = req.body && req.body.refresh;
      const rec = await store.getToken(r);
      if (!rec || rec.exp < Date.now()) return res.status(401).json({ error: 'login' });
      const u = await store.getUser(rec.uid);
      if (!u || u.banned) return res.status(401).json({ error: 'login' });
      await store.deleteToken(r); const t = await issue(u);
      res.json({ ok: true, access: t.access, refresh: t.refresh, user: pub(u) });
    } catch (e) { res.status(500).json({ error: 'تعذر تحديث الجلسة' }); }
  });
  app.post('/api/auth/logout', async (req, res) => {
    try { await store.deleteToken(req.body && req.body.refresh); res.json({ ok: true }); }
    catch (e) { res.json({ ok: true }); }
  });
  app.get('/api/auth/me', async (req, res) => {
    try {
      const pl = verify(req.headers['x-auth-token']); const u = pl && await store.getUser(pl.uid);
      if (!u) return res.status(401).json({ logged: false });
      if (u.banned) return res.json({ logged: false, banned: true });
      u.lastSeen = Date.now(); await store.saveUser(u);
      res.json({ logged: true, user: pub(u) });
    } catch (e) { res.status(500).json({ logged: false }); }
  });
  app.post('/api/auth/ping', async (req, res) => {
    try {
      const pl = verify(req.headers['x-auth-token']); const u = pl && await store.getUser(pl.uid);
      if (!u || u.banned) return res.json({ ok: false });
      u.lastSeen = Date.now();
      if (req.body && req.body.action) { u.lastAction = req.body.action; u.activity = [ { a: req.body.action, t: Date.now() }, ...(u.activity || []) ].slice(0, 100); }
      await store.saveUser(u); res.json({ ok: true });
    } catch (e) { res.json({ ok: false }); }
  });
  app.get('/api/my/orders', global.requireAuth, async (req, res) => {
    try {
      const u = await store.getUser(req.userId); const d = await store.getAffiliateData();
      res.json((d.orders || []).filter(o => String(o.userId) === String(req.userId) || (u && o.client_phone1 === u.contact)));
    } catch (e) { res.status(500).json({ error: 'تعذر تحميل الطلبات' }); }
  });
  app.get('/api/my/profile', global.requireAuth, async (req, res) => {
    try { const u = await store.getUser(req.userId); res.json(u ? { name: u.name, phone: u.contact, balance: u.balance || 0 } : {}); }
    catch (e) { res.status(500).json({ error: 'تعذر تحميل الحساب' }); }
  });
  app.post('/api/my/profile', global.requireAuth, async (req, res) => {
    try { const u = await store.getUser(req.userId); if (u) { if (req.body.name) u.name = String(req.body.name); if (req.body.phone) u.contact = String(req.body.phone); await store.saveUser(u); } res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: 'فشل الحفظ' }); }
  });
  app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
  app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
};
