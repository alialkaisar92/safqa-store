// middleware المصادقة — يفك الجلسة ويعزل كل مسوق عن بيانات غيره
const auth = require('../services/auth.service');

function readToken(req) {
  const h = req.headers || {};
  const az = h['authorization'] || h['Authorization'];
  if (az && /^Bearer\s+/i.test(az)) return az.replace(/^Bearer\s+/i, '').trim();
  if (h['x-marketer-token']) return String(h['x-marketer-token']).trim();
  const ck = h['cookie'] || h['Cookie'];
  if (ck) {
    const m = String(ck).match(/(?:^|;\s*)marketer_token=([^;]+)/);
    if (m) return decodeURIComponent(m[1]).trim();
  }
  return null;
}

function requireAuth(req, res, next) {
  const token = readToken(req);
  const session = auth.getSession(token);
  if (!session) return res.status(401).json({ ok: false, error: 'غير مصرح — سجّل دخولك أولاً' });
  req.marketer = session;     // المصدر الوحيد الموثوق لـ marketer_id
  req.marketerToken = token;
  next();
}

function marketerId(req) { return req.marketer ? req.marketer.id : null; }

module.exports = { requireAuth: requireAuth, marketerId: marketerId };
