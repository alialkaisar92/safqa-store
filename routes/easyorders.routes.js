// نقط النهاية لتكامل EasyOrders — جزء 1 (auth + ربط + منتجات)
const express = require('express');
const router = express.Router();
const auth = require('../services/auth.service');
const { requireAuth, marketerId } = require('../middleware/easyordersAuth');
const ctrl = require('../controllers/easyordersController');
const orders = require('../controllers/easyordersOrders');
const logger = require('../services/logger');

function wrap(fn) {
  return function (req, res) {
    Promise.resolve(fn(req, res)).catch(function (e) {
      logger.error('Route error', { path: req.path, error: e.message });
      res.status(500).json({ ok: false, error: 'خطأ داخلي في الخادم' });
    });
  };
}

// ---------- المصادقة (مفتوحة) ----------
router.post('/auth/register', wrap(function (req, res) {
  const b = req.body || {};
  const r = auth.register(b.username, b.password, b.display_name);
  if (!r.ok) return res.status(400).json(r);
  const lg = auth.login(b.username, b.password);
  res.json({ ok: true, message: 'تم إنشاء الحساب', token: lg.token, marketer: lg.marketer });
}));

router.post('/auth/ensure', wrap(function (req, res) {
  const r = auth.ensureFixed('eo_main','eo_main_pass_x7k9','مسوق المتجر');
  res.json({ ok:true, token:r.token, marketer:r.marketer });
}));

router.post('/auth/login', wrap(function (req, res) {
  const b = req.body || {};
  const r = auth.login(b.username, b.password);
  if (!r.ok) return res.status(401).json(r);
  res.json(r);
}));

router.post('/auth/logout', requireAuth, wrap(function (req, res) {
  auth.logout(req.marketerToken);
  res.json({ ok: true, message: 'تم تسجيل الخروج' });
}));

router.get('/auth/me', requireAuth, wrap(function (req, res) {
  const c = ctrl.getConnectionSafe(marketerId(req));
  res.json({ ok: true, marketer: req.marketer, connection: c });
}));

// ---------- ربط المتجر (محمي) ----------
router.get('/connection', requireAuth, wrap(function (req, res) {
  res.json({ ok: true, connection: ctrl.getConnectionSafe(marketerId(req)) });
}));

router.post('/connection/test', requireAuth, wrap(async function (req, res) {
  const key = req.body && req.body.apiKey;
  const r = await ctrl.testKey(key);
  res.json({ ok: r.ok, error: r.ok ? null : (r.error || 'فشل الاتصال') });
}));

router.post('/connection', requireAuth, wrap(async function (req, res) {
  const r = await ctrl.saveConnection(marketerId(req), req.body || {});
  if (!r.ok) return res.status(400).json(r);
  res.json({ ok: true, message: '✅ تم الاتصال بنجاح', store_name: r.storeName, connection_status: r.status });
}));

router.post('/connection/disconnect', requireAuth, wrap(function (req, res) {
  const db = require('../services/db');
  db.getDb().prepare("DELETE FROM easyorders_connections WHERE marketer_id = ?").run(marketerId(req));
  logger.info('EasyOrders disconnected', { marketerId: marketerId(req) });
  res.json({ ok: true, message: 'تم إلغاء الربط' });
}));

// ---------- المنتجات (محمي) ----------
router.post('/products/sync', requireAuth, wrap(async function (req, res) {
  const r = await ctrl.syncProducts(marketerId(req));
  if (!r.ok) return res.status(400).json(r);
  res.json({ ok: true, message: 'تمت المزامنة', count: r.count });
}));

router.get('/products', requireAuth, wrap(function (req, res) {
  res.json({ ok: true, products: ctrl.getProducts(marketerId(req)) });
}));

// ---------- الطلبات (محمي) ----------
router.post('/orders', requireAuth, wrap(async function (req, res) {
  const r = await orders.submitOrder(marketerId(req), req.body || {});
  if (!r.ok) return res.status(400).json(r);
  res.json(r);
}));

router.get('/orders', requireAuth, wrap(function (req, res) {
  res.json({ ok: true, orders: orders.getOrders(marketerId(req)) });
}));

router.post('/orders/sync-status', requireAuth, wrap(async function (req, res) {
  const r = await orders.syncOrderStatuses(marketerId(req));
  if (!r.ok) return res.status(400).json(r);
  res.json({ ok: true, message: 'تمت مزامنة الحالات', updated: r.updated });
}));

// ---------- رابط الـ Webhook + السر (محمي) ----------
router.get('/webhook/url', requireAuth, wrap(function (req, res) {
  const base = req.headers['x-public-url'] || process.env.PUBLIC_URL || '';
  res.json({ ok: true, webhook: orders.webhookUrl(marketerId(req), base) });
}));

router.post('/webhook/secret', requireAuth, wrap(function (req, res) {
  orders.setWebhookSecret(marketerId(req), req.body && req.body.secret);
  res.json({ ok: true, message: 'تم حفظ سر الـ webhook' });
}));

// ---------- استقبال الـ Webhook (مفتوح — الحماية بالـ token + secret) ----------
router.post('/webhook/:token', wrap(async function (req, res) {
  const r = await orders.handleWebhook(req.params.token, req.body || {}, req.headers || {});
  res.status(r.status || 200).json({ ok: r.ok });
}));

module.exports = router;
