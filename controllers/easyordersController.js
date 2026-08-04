// المتحكم الرئيسي لتكامل EasyOrders — الربط، المزامنة، المنتجات
const db = require('../services/db');
const client = require('../services/easyordersClient');
const crypto = require('../services/crypto.service');
const logger = require('../services/logger');

// ---------- أدوات مساعدة ----------
function updateConnStatus(marketerId, status) {
  db.getDb().prepare("UPDATE easyorders_connections SET connection_status = ?, updated_at = datetime('now') WHERE marketer_id = ?").run(status, marketerId);
}

function upsertConnection(marketerId, data) {
  db.getDb().prepare(`
    INSERT INTO easyorders_connections (marketer_id, api_key_enc, store_id, store_name, connection_status, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(marketer_id) DO UPDATE SET
      api_key_enc = excluded.api_key_enc,
      store_id = excluded.store_id,
      store_name = COALESCE(excluded.store_name, easyorders_connections.store_name),
      connection_status = excluded.connection_status,
      updated_at = datetime('now')
  `).run(marketerId, data.apiKeyEnc, data.storeId || null, data.storeName || null, data.status);
}

// تحويل منتج EasyOrders -> صيغتنا المخزنة
function mapProduct(raw) {
  let image = raw.thumb || null;
  if (!image && Array.isArray(raw.images) && raw.images[0]) {
    image = raw.images[0].url || raw.images[0].path || raw.images[0];
  }
  const qty = raw.quantity != null ? Number(raw.quantity) : null;
  const inStock = raw.track_stock ? (qty == null || qty > 0) : true;
  return {
    eo_product_id: String(raw.id),
    name: raw.name || '',
    sku: raw.sku || '',
    price: raw.price != null ? Number(raw.price) : null,
    sale_price: raw.sale_price != null ? Number(raw.sale_price) : null,
    quantity: qty,
    track_stock: raw.track_stock ? 1 : 0,
    image: image,
    status: inStock ? 'active' : 'out_of_stock',
    raw_json: JSON.stringify(raw)
  };
}

// ---------- الربط ----------
function testKey(apiKey) {
  if (!apiKey || !String(apiKey).trim()) return Promise.resolve({ ok: false, error: 'مفتاح الـ API مطلوب' });
  return client.testConnection(String(apiKey).trim());
}

async function saveConnection(marketerId, payload) {
  const apiKey = payload && payload.apiKey ? String(payload.apiKey).trim() : '';
  const storeId = payload && payload.storeId ? String(payload.storeId).trim() : null;
  if (!apiKey) return { ok: false, error: 'مفتاح الـ API مطلوب' };

  const test = await client.testConnection(apiKey);
  if (!test.ok) {
    upsertConnection(marketerId, { apiKeyEnc: crypto.encrypt(apiKey), storeId: storeId, status: 'error', storeName: null });
    logger.warn('EasyOrders connection failed', { marketerId: marketerId, error: test.error });
    return { ok: false, error: test.error || 'فشل الاتصال بـ EasyOrders' };
  }

  let storeName = null;
  const st = await client.getStore(apiKey);
  if (st.ok && st.data) {
    storeName = st.data.name || st.data.store_name || (st.data.store && st.data.store.name) || null;
  }

  upsertConnection(marketerId, { apiKeyEnc: crypto.encrypt(apiKey), storeId: storeId, status: 'connected', storeName: storeName });
  logger.info('EasyOrders connected', { marketerId: marketerId, storeName: storeName });
  return { ok: true, status: 'connected', storeName: storeName };
}

function getConnection(marketerId) {
  const row = db.getDb().prepare('SELECT * FROM easyorders_connections WHERE marketer_id = ?').get(marketerId);
  if (!row) return null;
  return Object.assign({}, row, { apiKey: crypto.decrypt(row.api_key_enc) });
}

function getConnectionSafe(marketerId) {
  const c = getConnection(marketerId);
  if (!c) return null;
  return {
    store_id: c.store_id,
    store_name: c.store_name,
    connection_status: c.connection_status,
    last_sync: c.last_sync,
    updated_at: c.updated_at,
    has_key: !!c.apiKey
  };
}

// ---------- مزامنة المنتجات ----------
async function syncProducts(marketerId) {
  const conn = getConnection(marketerId);
  if (!conn || !conn.apiKey) return { ok: false, error: 'لا يوجد اتصال محفوظ — اربط متجرك أولاً' };

  const res = await client.fetchAllProducts(conn.apiKey);
  if (!res.ok) {
    updateConnStatus(marketerId, 'error');
    return { ok: false, error: res.error || 'فشل جلب المنتجات' };
  }

  const items = Array.isArray(res.data) ? res.data : [];
  const stmt = db.getDb().prepare(`
    INSERT INTO products (marketer_id, eo_product_id, name, sku, price, sale_price, quantity, track_stock, image, status, raw_json, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(marketer_id, eo_product_id) DO UPDATE SET
      name = excluded.name, sku = excluded.sku, price = excluded.price, sale_price = excluded.sale_price,
      quantity = excluded.quantity, track_stock = excluded.track_stock, image = excluded.image,
      status = excluded.status, raw_json = excluded.raw_json, synced_at = datetime('now')
  `);
  let count = 0;
  for (const raw of items) {
    const p = mapProduct(raw);
    stmt.run(marketerId, p.eo_product_id, p.name, p.sku, p.price, p.sale_price, p.quantity, p.track_stock, p.image, p.status, p.raw_json);
    count++;
  }
  db.getDb().prepare("UPDATE easyorders_connections SET last_sync = datetime('now'), connection_status = 'connected' WHERE marketer_id = ?").run(marketerId);
  logger.info('Products synced', { marketerId: marketerId, count: count });
  return { ok: true, count: count };
}

function getProducts(marketerId) {
  return db.getDb().prepare(
    'SELECT id, eo_product_id, name, sku, price, sale_price, quantity, track_stock, image, status, synced_at FROM products WHERE marketer_id = ? ORDER BY synced_at DESC'
  ).all(marketerId);
}

module.exports = {
  testKey: testKey,
  saveConnection: saveConnection,
  getConnection: getConnection,
  getConnectionSafe: getConnectionSafe,
  syncProducts: syncProducts,
  mapProduct: mapProduct,
  getProducts: getProducts,
  updateConnStatus: updateConnStatus
};
