const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const store = require('./firestore');

const BASE_URL = process.env.SAFKA_PUBLIC_BASE_URL || 'https://api.safka-eg.com/api/v1/public';
const CACHE_FILE = path.join(__dirname, 'products-cache.json');
const META_DOC = 'safkaSync';

function apiKey() { return String(process.env.SAFKA_API_KEY || '').trim(); }
function headers() { return { 'api-safka-key': apiKey(), 'Content-Type': 'application/json' }; }
function mapStatus(value) {
  const s = String(value || '').trim().toLowerCase();
  const map = {
    pending: 'قيد التأكيد', confirmed: 'تم التأكيد', processing: 'جاري التجهيز', shipped: 'تم الشحن', delivered: 'تم التسليم', completed: 'تم التسليم', cancelled: 'ملغي', canceled: 'ملغي', returned: 'مرتجع', rejected: 'مرفوض', failed: 'فشل'
  };
  return map[s] || String(value || 'قيد المتابعة');
}
async function requestJson(url, options) {
  const response = await fetch(url, Object.assign({ headers: headers() }, options || {}));
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body.errors || []).map(e => e.msg).join(', ') || ('Safka HTTP ' + response.status));
  return body;
}
async function getMeta() {
  const snap = await store.getDb().collection('affiliateMeta').doc(META_DOC).get();
  return snap.exists ? (snap.data() || {}) : {};
}
async function saveMeta(value) { await store.saveDoc('affiliateMeta', META_DOC, value); }
async function fetchAllProducts() {
  if (!apiKey()) throw new Error('SAFKA_API_KEY غير مضبوط');
  const all = []; let page = 1; let pages = 1;
  while (page <= pages && page <= 100) {
    const data = await requestJson(BASE_URL + '/products?page=' + page + '&size=100');
    const rows = data.data || data.items || (Array.isArray(data) ? data : []);
    if (!rows.length) break;
    all.push(...rows);
    pages = Number(data.pages || pages);
    page++;
  }
  return all;
}
async function notifyAll(title, body, type) {
  if (!global.notifyUser) return;
  const users = await store.getUsers();
  await Promise.all(users.filter(u => u && u.id).map(u => global.notifyUser(u.id, title, body, '/store', type).catch(() => null)));
}
async function syncProducts(options) {
  const products = await fetchAllProducts();
  const meta = await getMeta();
  const initialized = Array.isArray(meta.productIds);
  const previous = new Set((meta.productIds || []).map(String));
  const newProducts = initialized ? products.filter(p => p && p._id && !previous.has(String(p._id)) && p.is_active !== false) : [];
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(products)); } catch (e) { console.warn('Safka cache write skipped:', e.message); }
  await saveMeta({ productIds: products.map(p => String(p._id)).filter(Boolean), productCount: products.length, productsSyncedAt: new Date().toISOString() });
  if (newProducts.length && options && options.notify !== false) {
    await notifyAll('منتجات جديدة على rab7na', 'تمت إضافة ' + newProducts.length + ' منتج جديد متاح للتسويق.', 'new-product');
  }
  return { ok: true, products: products.length, newProducts: newProducts.length };
}
function statusUrl(order) {
  const template = String(process.env.SAFKA_ORDER_STATUS_URL || '').trim();
  if (!template) return '';
  const id = encodeURIComponent(String(order.externalId || order.serial || order.id || ''));
  return template.replace(/\{id\}|:id/g, id);
}
async function syncOrderStatuses() {
  const template = String(process.env.SAFKA_ORDER_STATUS_URL || '').trim();
  if (!template) return { ok: true, skipped: true, reason: 'SAFKA_ORDER_STATUS_URL غير مضبوط في التوثيق العام' };
  const affiliate = await store.getAffiliateData();
  const orders = affiliate.orders || []; let changed = 0; let delivered = 0;
  for (const order of orders) {
    if (!statusUrl(order)) continue;
    try {
      const body = await requestJson(statusUrl(order));
      const raw = body.status || (body.data && (body.data.status || body.data.order_status)) || (body.order && body.order.status);
      const next = mapStatus(raw);
      if (!raw || next === order.status) continue;
      const previous = order.status; order.status = next; order.safkaStatus = raw; order.statusSyncedAt = new Date().toISOString(); changed++;
      if (next === 'تم التسليم' && previous !== 'تم التسليم' && order.userId != null && (+order.commission || 0) > 0) {
        const user = await store.getUser(order.userId);
        if (user) { user.balance = (+user.balance || 0) + (+order.commission || 0); user.totalEarned = (+user.totalEarned || 0) + (+order.commission || 0); await store.saveUser(user); delivered++; }
      }
      if (global.notifyUser && order.userId != null) await global.notifyUser(order.userId, 'تحديث حالة طلب', 'حالة طلبك الآن: ' + next, '/', 'order-status').catch(() => null);
    } catch (e) { console.warn('Safka status sync skipped order', order.id, e.message); }
  }
  if (changed) await store.saveAffiliateData(affiliate);
  return { ok: true, checked: orders.length, changed, delivered };
}
async function runSync(options) {
  const result = { products: null, orders: null };
  try { result.products = await syncProducts(options || {}); } catch (e) { result.products = { ok: false, error: e.message }; }
  try { result.orders = await syncOrderStatuses(); } catch (e) { result.orders = { ok: false, error: e.message }; }
  await saveMeta({ lastRunAt: new Date().toISOString(), lastResult: result });
  return result;
}
module.exports = { syncProducts, syncOrderStatuses, runSync, fetchAllProducts };
