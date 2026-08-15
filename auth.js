const crypto = require('crypto');
const path = require('path');
const fetch = require('node-fetch');
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
const WELCOME_BONUS = 70;
function isEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()); }
function codeHash(code) { return crypto.createHash('sha256').update('rab7na-verification:' + String(code)).digest('hex'); }
async function sendVerificationEmail(email, name, code) {
  const key = String(process.env.RESEND_API_KEY || '').trim();
  if (!key) return { ok: false, reason: 'RESEND_API_KEY غير مضبوط' };
  const from = process.env.RESEND_FROM || 'Rab7na <onboarding@resend.dev>';
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [email], subject: 'كود تفعيل حسابك في Rab7na', html: '<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>أهلاً بك في Rab7na</h2><p>استخدم الكود التالي لتفعيل حسابك:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#087f5b">' + code + '</div><p>صلاحية الكود 10 دقائق. لا تشارك الكود مع أي شخص.</p></div>' }) });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}
function newUser(data) { return Object.assign({ balance: WELCOME_BONUS, welcomeBonus: WELCOME_BONUS, created: new Date().toISOString() }, data); }
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
      const cid = String(b.contact || b.username || b.phone || b.email || '').trim().toLowerCase();
      const display = String(b.name || b.display_name || cid).trim();
      if (!display || !cid || !b.password) return res.json({ error: 'املأ كل الحقول' });
      if (String(b.password).length < 6) return res.json({ error: 'كلمة السر 6 أحرف على الأقل' });
      if (await store.findUserByContact(cid)) return res.json({ error: 'الحساب موجود، سجّل دخول' });
      if (isEmail(cid)) {
        const code = String(crypto.randomInt(100000, 1000000));
        const sent = await sendVerificationEmail(cid, display, code);
        if (!sent.ok) return res.status(503).json({ error: 'تفعيل الإيميل غير متاح حالياً، جرّب التسجيل برقم الهاتف' });
        await store.saveDoc('emailVerifications', cid, { id: cid, email: cid, name: display, phone: b.phone || '', pass: hashPw(b.password), codeHash: codeHash(code), expiresAt: Date.now() + 10 * 60 * 1000, createdAt: new Date().toISOString() });
        return res.json({ ok: false, verificationRequired: true, email: cid, message: 'تم إرسال كود التفعيل إلى بريدك، صالح لمدة 10 دقائق' });
      }
      const u = newUser({ id: Date.now(), username: cid, display_name: display, name: display, contact: cid, phone: b.phone || cid, email: b.email || '', pass: hashPw(b.password) });
      await store.saveUser(u);
      const t = await issue(u);
      res.json({ ok: true, token: t.access, refresh: t.refresh, user: pub(u) });
    } catch (e) { console.error('register:', e.message); res.status(500).json({ error: 'تعذر إنشاء الحساب حالياً' }); }
  });
  app.post('/api/auth/email/verify', async (req, res) => {
    try {
      const email = String((req.body || {}).email || '').trim().toLowerCase();
      const code = String((req.body || {}).code || '').trim();
      if (!isEmail(email) || !/^\d{6}$/.test(code)) return res.json({ error: 'أدخل الإيميل والكود المكوّن من 6 أرقام' });
      const snap = await store.getDb().collection('emailVerifications').doc(email).get();
      if (!snap.exists) return res.json({ error: 'لا يوجد طلب تفعيل لهذا الإيميل' });
      const pending = snap.data() || {};
      if (Number(pending.expiresAt || 0) < Date.now()) return res.json({ error: 'انتهت صلاحية الكود، اطلب كوداً جديداً' });
      if (pending.codeHash !== codeHash(code)) return res.json({ error: 'كود التفعيل غير صحيح' });
      if (await store.findUserByContact(email)) { await store.deleteDoc('emailVerifications', email); return res.json({ error: 'الحساب موجود، سجّل دخول' }); }
      const u = newUser({ id: Date.now(), username: email, display_name: pending.name || email.split('@')[0], name: pending.name || email.split('@')[0], contact: email, phone: pending.phone || email, email, pass: pending.pass, emailVerified: true, verifiedAt: new Date().toISOString() });
      await store.saveUser(u); await store.deleteDoc('emailVerifications', email);
      const t = await issue(u);
      res.json({ ok: true, token: t.access, refresh: t.refresh, user: pub(u) });
    } catch (e) { console.error('email verify:', e.message); res.status(500).json({ error: 'تعذر تفعيل الإيميل حالياً' }); }
  });
  app.post('/api/auth/email/resend', async (req, res) => {
    try {
      const email = String((req.body || {}).email || '').trim().toLowerCase();
      const snap = await store.getDb().collection('emailVerifications').doc(email).get();
      if (!snap.exists) return res.json({ error: 'ابدأ التسجيل أولاً' });
      const pending = snap.data() || {}; const code = String(crypto.randomInt(100000, 1000000));
      const sent = await sendVerificationEmail(email, pending.name || email, code);
      if (!sent.ok) return res.status(503).json({ error: 'خدمة البريد غير متاحة حالياً' });
      await store.saveDoc('emailVerifications', email, { codeHash: codeHash(code), expiresAt: Date.now() + 10 * 60 * 1000 });
      res.json({ ok: true, message: 'تم إرسال كود جديد' });
    } catch (e) { res.status(500).json({ error: 'تعذر إرسال الكود' }); }
  });
  app.get('/api/auth/google-config', (req, res) => {
    res.json({ clientId: process.env.GOOGLE_CLIENT_ID || '' });
  });
  app.post('/api/auth/google', async (req, res) => {
    try {
      const idToken = String((req.body || {}).credential || '').trim();
      const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
      if (!clientId) return res.status(503).json({ error: 'تسجيل Google غير مفعّل حالياً' });
      if (!idToken) return res.status(400).json({ error: 'بيانات Google غير مكتملة' });
      const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
      const profile = await r.json().catch(() => ({}));
      if (!r.ok || profile.aud !== clientId || !profile.sub || !profile.email || String(profile.email_verified) !== 'true') {
        return res.status(401).json({ error: 'تعذر التحقق من حساب Google' });
      }
      const email = String(profile.email).trim().toLowerCase();
      let users = await store.getUsers();
      let u = users.find(x => String(x.googleId || '') === String(profile.sub)) || users.find(x => String(x.email || '').toLowerCase() === email || String(x.contact || '').toLowerCase() === email);
      const display = String(profile.name || email.split('@')[0] || 'مستخدم Google').trim();
      if (!u) {
        u = newUser({ id: Date.now(), username: email, display_name: display, name: display, contact: email, phone: email, email, googleId: String(profile.sub), avatar: profile.picture || '', provider: 'google' });
      } else {
        u.googleId = String(profile.sub); u.provider = u.provider || 'google'; u.email = u.email || email; u.avatar = profile.picture || u.avatar || ''; u.name = u.name || display; u.display_name = u.display_name || display;
      }
      u.lastSeen = Date.now();
      await store.saveUser(u);
      const t = await issue(u);
      res.json({ ok: true, token: t.access, refresh: t.refresh, user: pub(u) });
    } catch (e) { console.error('google auth:', e.message); res.status(500).json({ error: 'تعذر تسجيل الدخول عبر Google حالياً' }); }
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
  const sessionHandler = async (req, res) => {
    try {
      const raw = req.headers['x-auth-token'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const pl = verify(raw); const u = pl && await store.getUser(pl.uid);
      if (!u) return res.status(401).json({ logged: false, authenticated: false });
      if (u.banned) return res.json({ logged: false, authenticated: false, banned: true });
      u.lastSeen = Date.now(); await store.saveUser(u);
      res.json({ logged: true, authenticated: true, user: pub(u) });
    } catch (e) { res.status(500).json({ logged: false, authenticated: false }); }
  };
  app.get('/api/auth/me', sessionHandler);
  app.get('/api/auth/session', sessionHandler);
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
