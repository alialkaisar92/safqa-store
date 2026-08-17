const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const path = require('path');
const fetch = require('node-fetch');
const store = require('./firestore');
const SECRET = String(process.env.JWT_SECRET || '').trim();
function ensureSecret() { if (!SECRET) throw new Error('JWT_SECRET is not configured'); }

async function hashPw(p) { return bcrypt.hash(String(p), 12); }
async function verifyPw(p, stored) {
  const value = String(stored || '');
  if (!value) return { ok: false, legacy: false };
  if (/^\$2[aby]\$/.test(value)) return { ok: await bcrypt.compare(String(p), value), legacy: false };
  const legacy = crypto.createHash('sha256').update('earnify:' + String(p)).digest('hex');
  const left = Buffer.from(legacy);
  const right = Buffer.from(value);
  return { ok: left.length === right.length && crypto.timingSafeEqual(left, right), legacy: true };
}
function b64u(o) { return Buffer.from(JSON.stringify(o)).toString('base64url'); }
function sign(uid, expSec) {
  ensureSecret();
  const h = b64u({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const p = b64u({ uid, iat: now, exp: now + expSec });
  const s = crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url');
  return h + '.' + p + '.' + s;
}
function verify(t) {
  if (!t || !SECRET) return null;
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
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_GAP_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
function isEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()); }
function codeHash(code) { return crypto.createHash('sha256').update('rab7na-verification:' + String(code)).digest('hex'); }
function safeName(value) { return String(value || '').replace(/[<>]/g, '').slice(0, 80); }
function otpHtml(title, name, code, purpose) { return '<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#f4faf8;padding:24px;font-family:Arial,sans-serif;color:#153b36"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #dceee9;border-radius:18px;padding:28px;text-align:right"><h2 style="color:#087f5b;margin-top:0">Rab7na</h2><p>مرحبًا ' + safeName(name) + '،</p><p>' + purpose + '</p><div style="margin:24px 0;padding:18px;text-align:center;background:#effaf6;border-radius:14px;font-size:34px;letter-spacing:9px;font-weight:800;color:#087f5b">' + code + '</div><p>صلاحية الرمز <b>10 دقائق</b>. لا تشاركه مع أي شخص.</p><p style="font-size:12px;color:#6b7f7b">إذا لم تطلب هذه العملية، يمكنك تجاهل الرسالة بأمان.</p></div></body></html>'; }
async function sendEmail({ email, name, code, subject, purpose }) {
  const recipient = String(email || '').trim().toLowerCase();
  if (!isEmail(recipient)) return { ok: false, reason: 'أدخل بريدًا إلكترونيًا صحيحًا لإرسال كود التحقق.' };
  // Support both the current Resend names and the older generic names.
  // Vercel Production currently stores RESEND_API_KEY and RESEND_FROM.
  const apiKey = String(process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY || '').trim();
  const from = String(process.env.RESEND_FROM || process.env.EMAIL_FROM || '').trim();
  if (!apiKey || !from) {
    console.error('email api unavailable: RESEND_API_KEY/EMAIL_API_KEY or RESEND_FROM/EMAIL_FROM is missing');
    return { ok: false, reason: 'خدمة البريد غير مهيأة حاليًا. يلزم إعداد مزود البريد في Production.' };
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject,
        text: 'رمزك في Rab7na هو ' + code + '. صالح لمدة 10 دقائق.',
        html: otpHtml(subject, name, code, purpose)
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('email api rejected:', response.status, body && body.name ? body.name : 'provider_error');
      return { ok: false, reason: 'تعذر إرسال كود التحقق حاليًا. راجع إعدادات مزود البريد.' };
    }
    return { ok: true, provider: 'resend', id: body && body.id ? body.id : undefined };
  } catch (e) {
    console.error('email api request failed:', String(e && e.message || 'network_error'));
    return { ok: false, reason: 'تعذر الاتصال بخدمة البريد حاليًا. حاول مرة أخرى بعد قليل.' };
  }
}
async function sendVerificationEmail(email, name, code) { return sendEmail({ email, name, code, subject: 'كود تفعيل حسابك في Rab7na', purpose: 'استخدم الرمز التالي لتفعيل حسابك:' }); }
async function sendPasswordResetEmail(email, name, code) { return sendEmail({ email, name, code, subject: 'رمز تغيير كلمة المرور في Rab7na', purpose: 'استخدم الرمز التالي لتعيين كلمة مرور جديدة:' }); }
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
    let registrationStage = 'start';
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
      // Use indexed direct lookups instead of reading the entire users collection.
      // This keeps registration fast and avoids a collection-read failure on Production.
      const normalizedPhone = phone.replace(/[\s-]/g, '');
      registrationStage = 'users_lookup';
      const userCol = store.getDb().collection('users');
      const lookups = await Promise.all([
        userCol.where('contact', '==', email).limit(1).get(),
        userCol.where('email', '==', email).limit(1).get(),
        userCol.where('username', '==', username).limit(1).get(),
        userCol.where('phone', '==', normalizedPhone).limit(1).get()
      ]);
      if (lookups.some(snap => !snap.empty)) return res.json({ error: 'البريد أو الهاتف أو اسم المستخدم مستخدم بالفعل' });
      const code = String(crypto.randomInt(100000, 1000000));
      registrationStage = 'pending_read';
      const pendingSnap = await store.getDb().collection('emailVerifications').doc(email).get();
      if (pendingSnap.exists) {
        const lastSentAt = Number((pendingSnap.data() || {}).lastSentAt || 0);
        const remainingSec = Math.max(0, Math.ceil((OTP_RESEND_GAP_MS - (Date.now() - lastSentAt)) / 1000));
        if (remainingSec > 0) return res.status(429).json({ error: 'تم إرسال كود بالفعل', remainingSec, message: 'انتظر ' + remainingSec + ' ثانية قبل إعادة المحاولة' });
      }
      const pending = { id: email, email, name: display, username, phone: normalizedPhone, pass: await hashPw(b.password), codeHash: codeHash(code), expiresAt: Date.now() + OTP_TTL_MS, attempts: 0, lastSentAt: Date.now(), createdAt: new Date().toISOString() };
      // Save first so the verification step can never receive a code that has no record.
      registrationStage = 'pending_write';
      await store.saveDoc('emailVerifications', email, pending);
      registrationStage = 'email_send';
      const sent = await sendVerificationEmail(email, display, code);
      if (!sent.ok) {
        await store.deleteDoc('emailVerifications', email).catch(() => {});
        console.error('verification email rejected:', sent.status || '', sent.reason || '');
        return res.status(503).json({ error: sent.reason || 'تعذر إرسال رمز البريد حاليًا، حاول لاحقًا' });
      }
      return res.json({ ok: false, verificationRequired: true, email, message: 'تم إرسال رمز التحقق إلى بريدك، صالح لمدة 10 دقائق' });
    } catch (e) {
      console.error('register failed at ' + registrationStage + ':', e && e.stack ? e.stack : e);
      res.status(500).json({ error: 'تعذر إنشاء الحساب حالياً' });
    }
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
      if (Number(pending.attempts || 0) >= OTP_MAX_ATTEMPTS) return res.status(429).json({ error: 'تم تجاوز عدد المحاولات، اطلب كوداً جديداً' });
      if (pending.codeHash !== codeHash(code)) { await store.saveDoc('emailVerifications', email, { attempts: Number(pending.attempts || 0) + 1 }); return res.json({ error: 'كود التفعيل غير صحيح' }); }
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
      const pending = snap.data() || {};
      const remainingSec = Math.max(0, Math.ceil((OTP_RESEND_GAP_MS - (Date.now() - Number(pending.lastSentAt || 0))) / 1000));
      if (remainingSec > 0) return res.status(429).json({ error: 'تم إرسال كود بالفعل', remainingSec, message: 'انتظر ' + remainingSec + ' ثانية قبل إعادة إرسال الكود' });
      const code = String(crypto.randomInt(100000, 1000000));
      const sent = await sendVerificationEmail(email, pending.name || email, code);
      if (!sent.ok) return res.status(503).json({ error: sent.reason || 'خدمة البريد غير متاحة حالياً' });
      await store.saveDoc('emailVerifications', email, { codeHash: codeHash(code), expiresAt: Date.now() + OTP_TTL_MS, attempts: 0, lastSentAt: Date.now() });
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
      const adminPasswordHash = String(process.env.ADMIN_PASSWORD_HASH || '').trim();
      const loginContact = String(b.contact || b.username || b.email || b.phone || '').trim().toLowerCase();
      const adminCheck = !!adminEmail && loginContact === adminEmail && !!adminPasswordHash ? await verifyPw(b.password || '', adminPasswordHash) : { ok: false, legacy: false };
      const passwordCheck = u ? await verifyPw(b.password || '', u.pass) : { ok: false, legacy: false };
      if (!u || (!adminCheck.ok && !passwordCheck.ok)) return res.json({ error: 'بيانات الدخول غلط' });
      if (u.banned) return res.json({ error: 'الحساب محظور' });
      if (u.email && u.emailVerified === false && !u.googleId && !adminCheck.ok) return res.json({ error: 'فعّل بريدك أولاً، ثم أعد تسجيل الدخول', verificationRequired: true, email: u.email });
      if (passwordCheck.ok && passwordCheck.legacy && !adminCheck.ok) u.pass = await hashPw(b.password || '');
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
      const resetSnap = await store.getDb().collection('passwordResets').doc(email).get();
      if (resetSnap.exists && Date.now() - Number((resetSnap.data() || {}).lastSentAt || 0) < OTP_RESEND_GAP_MS) return res.status(429).json({ error: 'تم إرسال كود بالفعل، انتظر دقيقة قبل إعادة المحاولة' });
      const resetRecord = { id: email, email, codeHash: codeHash(code), expiresAt: Date.now() + OTP_TTL_MS, attempts: 0, lastSentAt: Date.now(), createdAt: new Date().toISOString() };
      await store.saveDoc('passwordResets', email, resetRecord);
      const sent = await sendPasswordResetEmail(email, u.name || u.username, code);
      if (!sent.ok) {
        await store.deleteDoc('passwordResets', email).catch(() => {});
        return res.status(503).json({ error: sent.reason || 'تعذر إرسال رمز تغيير كلمة المرور حاليًا' });
      }
      res.json({ ok: true, email, message: 'تم إرسال رمز تغيير كلمة المرور إلى بريدك' });
    } catch (e) { console.error('password request:', e.message); res.status(500).json({ error: 'تعذر إرسال الرمز حاليًا' }); }
  });
  app.post('/api/auth/password/resend', async (req, res) => {
    try {
      const email = String((req.body || {}).email || '').trim().toLowerCase();
      if (!isEmail(email)) return res.json({ error: 'أدخل بريدًا إلكترونيًا صحيحًا' });
      const u = await findUserByLogin(email);
      const current = await store.getDb().collection('passwordResets').doc(email).get();
      if (!u || !current.exists) return res.json({ error: 'ابدأ طلب استعادة كلمة المرور أولًا' });
      const old = current.data() || {};
      const remainingSec = Math.max(0, Math.ceil((OTP_RESEND_GAP_MS - (Date.now() - Number(old.lastSentAt || 0))) / 1000));
      if (remainingSec > 0) return res.status(429).json({ error: 'انتظر قبل إعادة إرسال الرمز', remainingSec });
      const code = String(crypto.randomInt(100000, 1000000));
      const record = { codeHash: codeHash(code), expiresAt: Date.now() + OTP_TTL_MS, attempts: 0, lastSentAt: Date.now() };
      await store.saveDoc('passwordResets', email, record);
      const sent = await sendPasswordResetEmail(email, u.name || u.username, code);
      if (!sent.ok) {
        await store.saveDoc('passwordResets', email, old).catch(() => {});
        return res.status(503).json({ error: sent.reason || 'تعذر إرسال الرمز حاليًا' });
      }
      res.json({ ok: true, message: 'تم إرسال رمز جديد' });
    } catch (e) { console.error('password resend:', e.message); res.status(500).json({ error: 'تعذر إعادة إرسال الرمز حاليًا' }); }
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
      if (Number(reset.attempts || 0) >= OTP_MAX_ATTEMPTS) return res.status(429).json({ error: 'تم تجاوز عدد المحاولات، اطلب رمزًا جديدًا' });
      if (reset.codeHash !== codeHash(code)) { await store.saveDoc('passwordResets', email, { attempts: Number(reset.attempts || 0) + 1 }); return res.json({ error: 'رمز التحقق غير صحيح' }); }
      const u = await findUserByLogin(email);
      if (!u) return res.json({ error: 'الحساب غير موجود' });
      u.pass = await hashPw(b.password); u.passwordChangedAt = new Date().toISOString();
      await store.saveUser(u); await store.deleteDoc('passwordResets', email);
      res.json({ ok: true, message: 'تم تغيير كلمة المرور بنجاح، يمكنك تسجيل الدخول الآن' });
    } catch (e) { console.error('password reset:', e.message); res.status(500).json({ error: 'تعذر تغيير كلمة المرور حاليًا' }); }
  });
  // Spec-compatible aliases; keep the original routes for existing clients.
  app.post('/api/auth/resend-otp', (req, res) => res.redirect(307, '/api/auth/email/resend'));
  app.post('/api/auth/verify-email', (req, res) => res.redirect(307, '/api/auth/email/verify'));
  app.post('/api/auth/forgot-password', (req, res) => res.redirect(307, '/api/auth/password/request'));
  app.post('/api/auth/reset-password', (req, res) => res.redirect(307, '/api/auth/password/reset'));
  app.post('/api/auth/forgot/request', (req, res) => app._router ? res.redirect(307, '/api/auth/password/request') : res.json({ error: 'تعذر الطلب' }));
  app.post('/api/auth/forgot/resend', (req, res) => app._router ? res.redirect(307, '/api/auth/password/resend') : res.json({ error: 'تعذر الطلب' }));
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
