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
function pub(u) { return { id: u.id, username: u.username || u.contact, display_name: u.display_name || u.name, name: u.name || u.display_name, contact: u.contact || u.username, phone: u.phone || u.contact, email: u.email || '', balance: u.balance || 0, role: u.role || '', isAdmin: !!u.isAdmin, permissions: Array.isArray(u.permissions) ? u.permissions : [] }; }
const WELCOME_BONUS = 70;
function isEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()); }
function codeHash(code) { return crypto.createHash('sha256').update('rab7na-verification:' + String(code)).digest('hex'); }
async function sendVerificationEmail(email, name, code) {
  const key = String(process.env.RESEND_API_KEY || '').trim();
  if (!key) return { ok: false, reason: 'RESEND_API_KEY غير مضبوط' };
  const from = process.env.RESEND_FROM || 'Rab7na <onboarding@resend.dev>';
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [email], subject: 'كود تفعيل حسابك في rab7na', html: '<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>أهلاً بك في rab7na</h2><p>استخدم الكود التالي لتفعيل حسابك:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#087f5b">' + code + '</div><p>صلاحية الكود 10 دقائق. لا تشارك الكود مع أي شخص.</p></div>' }) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const detail = String(data.message || data.name || data.error || '').toLowerCase();
    let reason = 'خدمة البريد رفضت إرسال الرسالة';
    if (r.status === 401 || detail.includes('api key') || detail.includes('unauthorized')) reason = 'مفتاح خدمة البريد غير صحيح أو غير موجود في Vercel Production';
    else if (detail.includes('domain') || detail.includes('sender') || detail.includes('from')) reason = 'عنوان المرسل غير موثّق في Resend؛ أضف RESEND_FROM من نطاق موثّق';
    else if (detail.includes('recipient') || detail.includes('only send') || detail.includes('resend.dev')) reason = 'Resend في الوضع التجريبي لا يسمح بهذا المستلم؛ وثّق نطاق الإرسال أولًا';
    return { ok: false, status: r.status, reason, data };
  }
  return { ok: true, data };
}
async function sendPasswordResetEmail(email, name, code) {
  const key = String(process.env.RESEND_API_KEY || '').trim();
  if (!key) return { ok: false, reason: 'RESEND_API_KEY غير مضبوط' };
  const from = process.env.RESEND_FROM || 'rab7na <onboarding@resend.dev>';
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [email], subject: 'رمز تغيير كلمة المرور في rab7na', html: '<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>تغيير كلمة المرور</h2><p>مرحبًا ' + String(name || '').replace(/[<>]/g, '') + '، استخدم الرمز التالي لتعيين كلمة مرور جديدة:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#087f5b">' + code + '</div><p>صلاحية الرمز 10 دقائق. إذا لم تطلب ذلك تجاهل الرسالة.</p></div>' }) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const detail = String(data.message || data.name || data.error || '').toLowerCase();
    let reason = 'خدمة البريد رفضت إرسال الرسالة';
    if (r.status === 401 || detail.includes('api key') || detail.includes('unauthorized')) reason = 'مفتاح خدمة البريد غير صحيح أو غير موجود في Vercel Production';
    else if (detail.includes('domain') || detail.includes('sender') || detail.includes('from')) reason = 'عنوان المرسل غير موثّق في Resend؛ أضف RESEND_FROM من نطاق موثّق';
    else if (detail.includes('recipient') || detail.includes('only send') || detail.includes('resend.dev')) reason = 'Resend في الوضع التجريبي لا يسمح بهذا المستلم؛ وثّق نطاق الإرسال أولًا';
    return { ok: false, status: r.status, reason, data };
  }
  return { ok: true, data };
}
async function findUserByLogin(value) {
  const login = String(value || '').trim().toLowerCase();
  if (!login) return null;
  const direct = await store.findUserByContact(login);
  if (direct) return direct;
  const users = await store.getUsers();
  return users.find(u => [u.email, u.username, u.phone, u.contact].some(v => String(v || '').trim().toLowerCase() === login)) || null;
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
      const email = String(b.email || '').trim().toLowerCase();
      const phone = String(b.phone || '').replace(/[\s-]/g, '').trim();
      const username = String(b.username || '').trim().toLowerCase();
      const display = String(b.name || b.display_name || username).trim();
      if (!display || !email || !phone || !username || !b.password || !b.password2) return res.json({ error: 'املأ كل الحقول المطلوبة' });
      if (!isEmail(email)) return res.json({ error: 'أدخل بريدًا إلكترونيًا صحيحًا' });
      if (!/^01\d{9}$/.test(phone.replace(/[\s-]/g, ''))) return res.json({ error: 'أدخل رقم هاتف مصري صحيحًا من 11 رقمًا' });
      if (!/^[a-zA-Z0-9_\u0600-\u06ff]{3,30}$/.test(username)) return res.json({ error: 'اسم المستخدم من 3 إلى 30 حرفًا أو رقمًا' });
      if (String(b.password).length < 6) return res.json({ error: 'كلمة السر 6 أحرف على الأقل' });
      if (String(b.password) !== String(b.password2)) return res.json({ error: 'كلمتا السر غير متطابقتين' });
      const existing = await findUserByLogin(email) || await findUserByLogin(username) || await findUserByLogin(phone);
      if (existing) return res.json({ error: 'البريد أو الهاتف أو اسم المستخدم مستخدم بالفعل' });
      const code = String(crypto.randomInt(100000, 1000000));
      const sent = await sendVerificationEmail(email, display, code);
      if (!sent.ok) { console.error('verification email rejected:', sent.status || '', sent.reason || '', sent.data || ''); return res.status(503).json({ error: sent.reason || 'تعذر إرسال رمز البريد حاليًا، حاول لاحقًا' }); }
      await store.saveDoc('emailVerifications', email, { id: email, email, name: display, username, phone, pass: hashPw(b.password), codeHash: codeHash(code), expiresAt: Date.now() + 10 * 60 * 1000, createdAt: new Date().toISOString() });
      return res.json({ ok: false, verificationRequired: true, email, message: 'تم إرسال رمز التحقق إلى بريدك، صالح لمدة 10 دقائق' });
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
      const u = newUser({ id: Date.now(), username: pending.username || email.split('@')[0], display_name: pending.name || pending.username || email.split('@')[0], name: pending.name || pending.username || email.split('@')[0], contact: email, phone: pending.phone || '', email, pass: pending.pass, emailVerified: true, verifiedAt: new Date().toISOString() });
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
      const u = await findUserByLogin(b.contact || b.username || b.email || b.phone);
      const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
      const adminPasswordHash = String(process.env.ADMIN_PASSWORD_HASH || '').trim().toLowerCase();
      const loginContact = String(b.contact || b.username || b.email || b.phone || '').trim().toLowerCase();
      const isConfiguredAdmin = !!adminEmail && loginContact === adminEmail && !!adminPasswordHash && hashPw(b.password || '') === adminPasswordHash;
      if (!u || (!isConfiguredAdmin && u.pass !== hashPw(b.password || ''))) return res.json({ error: 'بيانات الدخول غلط' });
      if (u.banned) return res.json({ error: 'الحساب محظور' });
      u.lastSeen = Date.now(); await store.saveUser(u);
      const t = await issue(u);
      res.json({ ok: true, token: t.access, refresh: t.refresh, user: pub(u) });
    } catch (e) { console.error('login:', e.message); res.status(500).json({ error: 'تعذر تسجيل الدخول حالياً' }); }
  });
  app.post('/api/auth/password/request', async (req, res) => {
    try {
      const email = String((req.body || {}).email || '').trim().toLowerCase();
      if (!isEmail(email)) return res.json({ error: 'أدخل بريدًا إلكترونيًا صحيحًا' });
      const u = await findUserByLogin(email);
      if (!u || String(u.email || '').toLowerCase() !== email) return res.json({ error: 'لا يوجد حساب بهذا البريد' });
      const code = String(crypto.randomInt(100000, 1000000));
      const sent = await sendPasswordResetEmail(email, u.name || u.username, code);
      if (!sent.ok) return res.status(503).json({ error: 'تعذر إرسال رمز تغيير كلمة المرور حاليًا' });
      await store.saveDoc('passwordResets', email, { id: email, email, codeHash: codeHash(code), expiresAt: Date.now() + 10 * 60 * 1000, createdAt: new Date().toISOString() });
      res.json({ ok: true, email, message: 'تم إرسال رمز تغيير كلمة المرور إلى بريدك' });
    } catch (e) { console.error('password request:', e.message); res.status(500).json({ error: 'تعذر إرسال الرمز حاليًا' }); }
  });
  app.post('/api/auth/password/reset', async (req, res) => {
    try {
      const b = req.body || {}; const email = String(b.email || '').trim().toLowerCase(); const code = String(b.code || '').trim();
      if (!isEmail(email) || !/^\d{6}$/.test(code)) return res.json({ error: 'أدخل البريد والرمز المكوّن من 6 أرقام' });
      if (String(b.password || '').length < 6) return res.json({ error: 'كلمة السر 6 أحرف على الأقل' });
      if (String(b.password) !== String(b.password2)) return res.json({ error: 'كلمتا السر غير متطابقتين' });
      const snap = await store.getDb().collection('passwordResets').doc(email).get();
      if (!snap.exists) return res.json({ error: 'اطلب رمز تغيير كلمة المرور أولًا' });
      const reset = snap.data() || {};
      if (Number(reset.expiresAt || 0) < Date.now()) return res.json({ error: 'انتهت صلاحية الرمز، اطلب رمزًا جديدًا' });
      if (reset.codeHash !== codeHash(code)) return res.json({ error: 'رمز التحقق غير صحيح' });
      const u = await findUserByLogin(email);
      if (!u) return res.json({ error: 'الحساب غير موجود' });
      u.pass = hashPw(b.password); u.passwordChangedAt = new Date().toISOString();
      await store.saveUser(u); await store.deleteDoc('passwordResets', email);
      res.json({ ok: true, message: 'تم تغيير كلمة المرور بنجاح، يمكنك تسجيل الدخول الآن' });
    } catch (e) { console.error('password reset:', e.message); res.status(500).json({ error: 'تعذر تغيير كلمة المرور حاليًا' }); }
  });
  app.post('/api/auth/forgot/request', (req, res) => app._router ? res.redirect(307, '/api/auth/password/request') : res.json({ error: 'تعذر الطلب' }));
  app.post('/api/auth/forgot/reset', (req, res) => app._router ? res.redirect(307, '/api/auth/password/reset') : res.json({ error: 'تعذر الطلب' }));
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
