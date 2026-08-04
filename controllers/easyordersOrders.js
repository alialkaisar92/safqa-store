// وحدة الطلبات وتتبع الحالات والـ Webhooks لتكامل EasyOrders (جزء 1)
const crypto = require('crypto');
const db = require('../services/db');
const client = require('../services/easyordersClient');
const cryptoSvc = require('../services/crypto.service');
const config = require('../config/easyorders.config');
const logger = require('../services/logger');

function statusDisplay(status) {
  const m = config.orderStatusMap[String(status || '').toLowerCase()];
  return m ? { key: String(status).toLowerCase(), ar: m.ar, color: m.color }
           : { key: String(status || ''), ar: String(status || '—'), color: 'muted' };
}

function getConn(marketerId) {
  const row = db.getDb().prepare('SELECT * FROM easyorders_connections WHERE marketer_id = ?').get(marketerId);
  if (!row) return null;
  return Object.assign({}, row, { apiKey: cryptoSvc.decrypt(row.api_key_enc), webhookSecret: cryptoSvc.decrypt(row.webhook_secret_enc) });
}

function generateToken(marketerId) {
  return crypto.createHmac('sha256', String(config.encryption.secret)).update('eo-webhook:' + marketerId).digest('hex').slice(0, 40);
}

function ensureWebhookToken(marketerId) {
  const row = db.getDb().prepare('SELECT webhook_token FROM easyorders_connections WHERE marketer_id = ?').get(marketerId);
  if (row && row.webhook_token) return row.webhook_token;
  const token = generateToken(marketerId);
  db.getDb().prepare("UPDATE easyorders_connections SET webhook_token = ? WHERE marketer_id = ?").run(token, marketerId);
  return token;
}

function webhookUrl(marketerId, baseUrl) {
  const token = ensureWebhookToken(marketerId);
  const base = (baseUrl || process.env.PUBLIC_URL || '').replace(/\/+$/, '');
  return { token: token, url: base + '/api/easyorders/webhook/' + token };
}

function setWebhookSecret(marketerId, secret) {
  db.getDb().prepare("UPDATE easyorders_connections SET webhook_secret_enc = ?, webhook_enabled = ? WHERE marketer_id = ?")
    .run(secret ? cryptoSvc.encrypt(secret) : null, secret ? 1 : 0, marketerId);
}

function buildOrderPayload(marketerId, input) {
  const items = Array.isArray(input.items) ? input.items : [];
  const cart = [];
  for (const it of items) {
    const p = db.getDb().prepare('SELECT eo_product_id, name FROM products WHERE id = ? AND marketer_id = ?').get(it.product_id, marketerId);
    if (!p) continue;
    cart.push({ product_id: Number(p.eo_product_id), quantity: Number(it.quantity || 1) });
  }
  const address = [input.city, input.address].filter(Boolean).join(' - ');
  return {
    full_name: input.customer_name || '', phone: input.customer_phone || '',
    government: input.government || '', address: address, cart_items: cart,
    shipping_cost: Number(input.shipping_cost || 0), payment_method: input.payment_method || 'cod',
    note: input.note || '', total_cost: input.total != null ? Number(input.total) : undefined
  };
}

async function submitOrder(marketerId, input) {
  const conn = getConn(marketerId);
  if (!conn || !conn.apiKey) return { ok: false, error: 'لا يوجد اتصال محفوظ بـ EasyOrders' };
  const payload = buildOrderPayload(marketerId, input);
  if (!payload.cart_items.length) return { ok: false, error: 'لا توجد منتجات صالحة في الطلب' };
  const ins = db.getDb().prepare(`INSERT INTO orders (marketer_id, customer_name, customer_phone, government, city, address, items_json, shipping_cost, total, note, status, send_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'pending')`)
    .run(marketerId, input.customer_name || '', input.customer_phone || '', input.government || '',
         input.city || '', input.address || '', JSON.stringify(payload.cart_items),
         Number(input.shipping_cost || 0), input.total != null ? Number(input.total) : null, input.note || '');
  const orderId = Number(ins.lastInsertRowid);
  const res = await client.createOrder(conn.apiKey, payload);
  if (!res.ok) {
    db.getDb().prepare("UPDATE orders SET send_status='failed', error_msg=?, updated_at=datetime('now') WHERE id=?").run(res.error || 'فشل الإرسال', orderId);
    logger.warn('Order send failed', { marketerId: marketerId, orderId: orderId, error: res.error });
    return { ok: false, orderId: orderId, send_status: 'failed', error: res.error || 'فشل إرسال الطلب لـ EasyOrders' };
  }
  const d = res.data || {};
  const inner = d.data || d;
  const eoId = inner.id || inner.order_id || d.id || d.order_id || null;
  const st = (inner.status || d.status || 'pending');
  db.getDb().prepare("UPDATE orders SET send_status='sent', eo_order_id=?, status=?, updated_at=datetime('now') WHERE id=?")
    .run(eoId ? String(eoId) : null, String(st), orderId);
  logger.info('Order sent to EasyOrders', { marketerId: marketerId, orderId: orderId, eo_order_id: eoId });
  return { ok: true, orderId: orderId, eo_order_id: eoId, send_status: 'sent', status: statusDisplay(st) };
}

// ---------- مزامنة الحالات ----------
async function syncOrderStatuses(marketerId) {
  const conn = getConn(marketerId);
  if (!conn || !conn.apiKey) return { ok: false, error: 'لا يوجد اتصال محفوظ' };
  const rows = db.getDb().prepare(
    "SELECT id, eo_order_id FROM orders WHERE marketer_id=? AND eo_order_id IS NOT NULL AND send_status='sent' AND status NOT IN ('delivered','cancelled','returned')"
  ).all(marketerId);
  let updated = 0;
  for (const r of rows) {
    const res = await client.getOrder(conn.apiKey, r.eo_order_id);
    if (!res.ok) continue;
    const d = res.data || {};
    const inner = d.data || d;
    const st = inner.status || d.status;
    if (st) {
      db.getDb().prepare("UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?").run(String(st), r.id);
      updated++;
    }
  }
  logger.info('Order statuses synced', { marketerId: marketerId, updated: updated });
  return { ok: true, updated: updated };
}

function safeJson(s) { try { return JSON.parse(s || '[]'); } catch (e) { return []; } }

function getOrders(marketerId) {
  return db.getDb().prepare('SELECT * FROM orders WHERE marketer_id=? ORDER BY created_at DESC').all(marketerId)
    .map(o => Object.assign({}, o, { status_display: statusDisplay(o.status), items: safeJson(o.items_json) }));
}

// ---------- معالج الـ Webhooks ----------
function deriveEventId(payload) {
  if (payload && payload.event_id) return String(payload.event_id);
  if (payload && payload.id && payload.event_type) return String(payload.event_type) + ':' + String(payload.id);
  const type = (payload && payload.event_type) || '';
  const oid = (payload && payload.order_id) || (payload && payload.order && payload.order.id) || '';
  const ns = (payload && payload.new_status) || '';
  return 'h:' + crypto.createHash('sha256').update(type + '|' + oid + '|' + ns).digest('hex').slice(0, 24);
}

function extractWebhookSecret(headers) {
  const h = headers || {};
  return h['secret'] || h['x-eo-secret'] || h['x-webhook-secret'] || h['authorization'] || null;
}

async function handleWebhook(token, payload, headers) {
  const conn = db.getDb().prepare('SELECT * FROM easyorders_connections WHERE webhook_token = ?').get(token);
  if (!conn) { logger.warn('Webhook unknown token', { token: token }); return { ok: false, status: 401, error: 'رمز غير صالح' }; }
  const incoming = extractWebhookSecret(headers);
  if (conn.webhook_secret_enc) {
    const stored = cryptoSvc.decrypt(conn.webhook_secret_enc);
    if (!incoming || incoming !== stored) { logger.warn('Webhook secret mismatch', { marketerId: conn.marketer_id }); return { ok: false, status: 401, error: 'توقيع غير صالح' }; }
  }
  const eventId = deriveEventId(payload || {});
  const exists = db.getDb().prepare('SELECT id, processed FROM webhook_events WHERE event_id = ?').get(eventId);
  if (exists && exists.processed) return { ok: true, status: 200, duplicate: true };
  if (!exists) {
    db.getDb().prepare('INSERT INTO webhook_events (event_id, event_type, payload_json) VALUES (?, ?, ?)')
      .run(eventId, String((payload && payload.event_type) || 'unknown'), JSON.stringify(payload || {}));
  }
  const type = String((payload && payload.event_type) || '').toLowerCase();
  const marketerId = conn.marketer_id;
  if (type.indexOf('status') !== -1 || payload.new_status) {
    const eoId = payload.order_id || (payload.order && payload.order.id);
    const newSt = payload.new_status || payload.status;
    if (eoId && newSt) {
      db.getDb().prepare("UPDATE orders SET status=?, updated_at=datetime('now') WHERE marketer_id=? AND eo_order_id=?")
        .run(String(newSt), marketerId, String(eoId));
    }
  } else if (type.indexOf('created') !== -1 || type.indexOf('create') !== -1) {
    const o = payload.order || payload;
    const eoId = o.id || o.order_id;
    if (eoId) {
      const have = db.getDb().prepare('SELECT id FROM orders WHERE marketer_id=? AND eo_order_id=?').get(marketerId, String(eoId));
      if (!have) {
        const items = Array.isArray(o.cart_items) ? o.cart_items : [];
        db.getDb().prepare(`INSERT INTO orders (marketer_id, eo_order_id, customer_name, customer_phone, government, address, items_json, shipping_cost, total, status, send_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received')`)
          .run(marketerId, String(eoId), o.full_name || '', o.phone || '', o.government || '', o.address || '',
               JSON.stringify(items), Number(o.shipping_cost || 0), o.total_cost != null ? Number(o.total_cost) : null, String(o.status || 'new'));
      }
    }
  }
  db.getDb().prepare('UPDATE webhook_events SET processed = 1 WHERE event_id = ?').run(eventId);
  logger.info('Webhook processed', { marketerId: marketerId, event_id: eventId, type: type });
  return { ok: true, status: 200 };
}

module.exports = {
  statusDisplay, getConn, generateToken, ensureWebhookToken, webhookUrl, setWebhookSecret,
  buildOrderPayload, submitOrder, syncOrderStatuses, getOrders, handleWebhook
};
