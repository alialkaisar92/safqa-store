const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const store = require('./firestore');
const postgres = require('./lib/postgres');

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
  const rows = await store.all('affiliateMeta');
  const row = rows.find(item => String(item.id) === META_DOC);
  return row || {};
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
function productStock(product) {
  const prop = (product && product.properties && product.properties[0]) || {};
  const inventory = product && product.inventory;
  const candidates = [
    prop.stock, prop.quantity, prop.available_qty, prop.availableQuantity,
    product && product.stock, product && product.quantity, product && product.available_qty,
    product && product.availableQuantity, product && product.inventory_quantity,
    inventory && inventory.stock, inventory && inventory.quantity, inventory && inventory.available,
    inventory && inventory.available_qty
  ];
  for (const value of candidates) {
    if (value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value))) return Math.max(0, Math.floor(Number(value)));
  }
  return null;
}

function sourceAvailable(product) {
  if (!product || product.is_active === false) return false;
  if (typeof product.is_available === 'boolean') return product.is_available;
  const props = Array.isArray(product.properties) ? product.properties : [];
  const flags = props.map(item => item && item.is_available).filter(value => typeof value === 'boolean');
  return flags.some(Boolean);
}

function dbProduct(product) {
  const stock = productStock(product);
  const base = Number(product.basePrice != null ? product.basePrice : (product.sale_price != null ? product.sale_price : (product.price || 0)));
  return Object.assign({}, product, {
    external_id: product.id || product._id,
    stock,
    active: product.is_active !== false,
    basePrice: Number.isFinite(base) ? base : 0,
    available: sourceAvailable(product)
  });
}

async function syncProducts(options) {
  const products = await fetchAllProducts();
  const meta = await getMeta();
  const initialized = Array.isArray(meta.productIds);
  const previous = new Set((meta.productIds || []).map(String));
  const newProducts = initialized ? products.filter(p => p && p._id && !previous.has(String(p._id)) && p.is_active !== false) : [];
  const prepared = products.map(dbProduct);
  console.log('[availability-sync] sample:', JSON.stringify(products.slice(0, 5).map(product => ({
    id: product && (product.id || product._id),
    name: product && (product.name || product.title),
    is_available: product && product.is_available,
    propertyAvailability: Array.isArray(product && product.properties) ? product.properties.slice(0, 5).map(item => item && item.is_available) : [],
    available: prepared.find(item => String(item.external_id) === String(product && (product.id || product._id)))?.available === true
  }))));
  let database = null;
  try { database = await postgres.upsertProducts(prepared); }
  catch (e) { console.warn('Safka PostgreSQL stock import skipped:', e.message); }
  const missingStock = prepared.filter(product => product.stock === null);
  if (missingStock.length) console.warn('[stock-sync] Missing explicit stock field for ' + missingStock.length + ' products; stored as unavailable instead of using a guessed quantity. Sample IDs: ' + missingStock.slice(0, 5).map(product => String(product.external_id || '')).join(', '));
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(prepared)); } catch (e) { console.warn('Safka cache write skipped:', e.message); }
  await saveMeta({ productIds: products.map(p => String(p._id || p.id)).filter(Boolean), productCount: products.length, productsSyncedAt: new Date().toISOString(), stockImportedAt: new Date().toISOString(), stockImported: database || { inserted: 0, updated: 0 } });
  if (newProducts.length && options && options.notify !== false) {
    await notifyAll('منتجات جديدة على rab7na', 'تمت إضافة ' + newProducts.length + ' منتج جديد متاح للتسويق.', 'new-product');
  }
  return { ok: true, products: products.length, newProducts: newProducts.length, stockImported: database || { inserted: 0, updated: 0 } };
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
  const orders = await postgres.listAffiliateOrdersForSync();
  let changed = 0; let delivered = 0; let cursor = 0;
  const worker = async () => {
    while (true) {
      const order = orders[cursor++];
      if (!order) return;
      if (!statusUrl(order)) continue;
      try {
        const body = await requestJson(statusUrl(order));
        const raw = body.status || (body.data && (body.data.status || body.data.order_status)) || (body.order && body.order.status);
        const next = mapStatus(raw);
        if (!raw || next === order.status) continue;
        const updated = await postgres.updateAffiliateOrderStatus(order.id || order.serial, { status: next, safkaStatus: raw, statusSyncedAt: new Date().toISOString() });
        if (!updated) continue;
        changed++;
        if (updated.delivered) delivered++;
        if (global.notifyUser && order.userId != null) await global.notifyUser(order.userId, 'تحديث حالة طلب', 'حالة طلبك الآن: ' + next, '/', 'order-status').catch(() => null);
      } catch (e) { console.warn('Safka status sync skipped order', order.id, e.message); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, Math.max(1, orders.length)) }, () => worker()));
  return { ok: true, checked: orders.length, changed, delivered };
}
async function runSync(options) {
  const result = { products: null, orders: null, affiliateRepair: null };
  try {
    result.affiliateRepair = await postgres.repairAcceptedUntrackedAffiliateOrders(100);
  } catch (e) {
    result.affiliateRepair = { ok: false, error: e.message };
  }
  try { result.products = await syncProducts(options || {}); } catch (e) { result.products = { ok: false, error: e.message }; }
  try { result.orders = await syncOrderStatuses(); } catch (e) { result.orders = { ok: false, error: e.message }; }
  await saveMeta({ lastRunAt: new Date().toISOString(), lastResult: result });
  return result;
}
module.exports = { syncProducts, syncOrderStatuses, runSync, fetchAllProducts };
