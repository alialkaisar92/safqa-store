'use strict';

const { Pool } = require('pg');
const crypto = require('crypto');
const { availableBalanceFromRecords, deliveredStatus } = require('../balance');

let pool;

function getPool() {
  if (pool) return pool;
  const connectionString = String(process.env.DATABASE_URL || '').trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL غير مضبوط؛ أضفه في بيئة التشغيل قبل استخدام PostgreSQL');
  }
  pool = new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX || 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  });
  pool.on('error', (error) => console.error('[postgres] idle client error:', error.message));
  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      last_login TIMESTAMPTZ
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS balance NUMERIC(12,2) NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_bonus_granted BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS manual_credits NUMERIC(12,2) NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS total_earned NUMERIC(12,2) NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS sales_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS sales JSONB NOT NULL DEFAULT '[]'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));

    CREATE TABLE IF NOT EXISTS categories (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id BIGSERIAL PRIMARY KEY,
      external_id TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
      image TEXT,
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      commission NUMERIC(12,2) NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

    CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      external_id TEXT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      governorate TEXT,
      city TEXT,
      address TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      product_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
      total NUMERIC(12,2) NOT NULL DEFAULT 0,
      commission NUMERIC(12,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'new',
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT,
      type TEXT NOT NULL DEFAULT 'info',
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token_hash);

    CREATE TABLE IF NOT EXISTS app_documents (
      collection TEXT NOT NULL,
      doc_id TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (collection, doc_id)
    );
    CREATE INDEX IF NOT EXISTS idx_app_documents_collection ON app_documents(collection);
    CREATE INDEX IF NOT EXISTS idx_app_documents_collection_user ON app_documents(collection, ((data->>'userId')));
    CREATE INDEX IF NOT EXISTS idx_app_documents_orders_external ON app_documents(collection, ((data->>'externalId')));

    CREATE TABLE IF NOT EXISTS affiliate_order_requests (
      request_key TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'processing',
      request_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      supplier_response JSONB NOT NULL DEFAULT '{}'::jsonb,
      supplier_order_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_affiliate_order_requests_user ON affiliate_order_requests(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_affiliate_order_requests_status ON affiliate_order_requests(status, updated_at);
  `);
}

async function affiliateRowsForUser(client, userId) {
  const result = await client.query(`
    SELECT collection, doc_id, data
    FROM app_documents
    WHERE collection IN ('orders', 'withdrawals') AND data->>'userId'=$1
    ORDER BY updated_at DESC
  `, [String(userId)]);
  const orders = [], withdrawals = [];
  for (const row of result.rows) {
    const value = Object.assign({ id: row.doc_id }, row.data || {});
    if (row.collection === 'orders') orders.push(value);
    if (row.collection === 'withdrawals') withdrawals.push(value);
  }
  return { orders, withdrawals };
}

async function getAffiliateUserData(userId) {
  const client = await getPool().connect();
  try { return await affiliateRowsForUser(client, userId); }
  finally { client.release(); }
}

async function getAffiliateCatalogData() {
  const [products, meta] = await Promise.all([
    query("SELECT doc_id AS id, data FROM app_documents WHERE collection='affiliateProducts' ORDER BY updated_at DESC"),
    query("SELECT data FROM app_documents WHERE collection='affiliateMeta' AND doc_id='main' LIMIT 1")
  ]);
  return {
    products: products.rows.map(row => Object.assign({ id: row.id }, row.data || {})),
    priceUp: meta.rows[0] && meta.rows[0].data ? Number(meta.rows[0].data.priceUp || 0) : 0,
    settings: meta.rows[0] && meta.rows[0].data ? (meta.rows[0].data.settings || {}) : {}
  };
}

async function saveAffiliateOrder(order) {
  const value = Object.assign({}, order || {});
  const docId = String(value.id || value.serial || '').trim();
  if (!docId) throw new Error('معرّف الطلب المحلي مفقود');
  await query(`
    INSERT INTO app_documents(collection, doc_id, data, updated_at)
    VALUES ('orders',$1,$2::jsonb,NOW())
    ON CONFLICT (collection, doc_id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()
  `, [docId, JSON.stringify(value)]);
  return value;
}

async function updateAffiliateOrder(docId, patch) {
  const result = await query(`
    UPDATE app_documents
    SET data = data || $2::jsonb, updated_at=NOW()
    WHERE collection='orders' AND doc_id=$1
    RETURNING data
  `, [String(docId), JSON.stringify(patch || {})]);
  return result.rows[0] ? result.rows[0].data : null;
}

async function saveAffiliateWithdrawal(withdrawal) {
  const value = Object.assign({}, withdrawal || {});
  const docId = String(value.id || '').trim();
  if (!docId) throw new Error('معرّف طلب السحب مفقود');
  await query(`
    INSERT INTO app_documents(collection, doc_id, data, updated_at)
    VALUES ('withdrawals',$1,$2::jsonb,NOW())
    ON CONFLICT (collection, doc_id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()
  `, [docId, JSON.stringify(value)]);
  return value;
}

async function claimAffiliateOrderRequest(userId, requestKey, requestData) {
  const key = String(requestKey || '').trim();
  if (key.length < 16 || key.length > 160) throw new Error('مفتاح الطلب غير صالح');
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO affiliate_order_requests(request_key,user_id,status,request_data,updated_at)
      VALUES ($1,$2,'processing',$3::jsonb,NOW())
      ON CONFLICT (request_key) DO NOTHING
    `, [key, userId, JSON.stringify(requestData || {})]);
    const result = await client.query('SELECT * FROM affiliate_order_requests WHERE request_key=$1 FOR UPDATE', [key]);
    const row = result.rows[0];
    if (!row || String(row.user_id) !== String(userId)) {
      const error = new Error('مفتاح الطلب مستخدم لحساب آخر'); error.code = 'IDEMPOTENCY_CONFLICT'; throw error;
    }
    const ageMs = Date.now() - new Date(row.updated_at).getTime();
    if (row.status === 'accepted' || row.status === 'accepted_untracked') {
      await client.query('COMMIT');
      return { mode: 'duplicate', row };
    }
    if (row.status === 'processing' && ageMs < 15 * 60 * 1000 && row.request_data && Object.keys(row.request_data).length) {
      await client.query('COMMIT');
      return { mode: 'in_progress', row };
    }
    await client.query(`UPDATE affiliate_order_requests SET status='processing', request_data=$2::jsonb, updated_at=NOW() WHERE request_key=$1`, [key, JSON.stringify(requestData || {})]);
    await client.query('COMMIT');
    return { mode: 'claimed', row: Object.assign({}, row, { status: 'processing' }) };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
}

async function completeAffiliateOrderRequest(requestKey, status, supplierResponse, supplierOrderId) {
  const result = await query(`
    UPDATE affiliate_order_requests
    SET status=$2, supplier_response=$3::jsonb, supplier_order_id=$4, updated_at=NOW()
    WHERE request_key=$1
    RETURNING *
  `, [String(requestKey), String(status), JSON.stringify(supplierResponse || {}), supplierOrderId ? String(supplierOrderId) : null]);
  return result.rows[0] || null;
}

async function createAffiliateWithdrawal(input) {
  const userId = input && input.userId;
  const amount = Number(input && input.amount);
  const method = String(input && input.method || '').trim();
  const details = String(input && input.details || '').trim();
  const requestKey = String(input && input.requestKey || '').trim();
  if (!userId || !requestKey) throw new Error('بيانات طلب السحب ناقصة');
  const docId = 'wd_' + crypto.createHash('sha256').update(String(userId) + ':' + requestKey).digest('hex').slice(0, 40);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query('SELECT id,manual_credits,total_earned,sales_count,balance FROM users WHERE id=$1 FOR UPDATE', [userId]);
    const dbUser = userResult.rows[0];
    if (!dbUser) throw new Error('المسوق غير موجود');
    const existing = await client.query("SELECT data FROM app_documents WHERE collection='withdrawals' AND doc_id=$1", [docId]);
    if (existing.rows[0]) {
      const rows = await affiliateRowsForUser(client, userId);
      const balance = availableBalanceFromRecords(dbUser, rows.orders, rows.withdrawals);
      await client.query('COMMIT');
      return { duplicate: true, withdrawal: existing.rows[0].data, balance };
    }
    const rows = await affiliateRowsForUser(client, userId);
    const balance = availableBalanceFromRecords(dbUser, rows.orders, rows.withdrawals);
    if (amount > balance) { const error = new Error('المبلغ أكبر من الرصيد المتاح'); error.code = 'INSUFFICIENT_BALANCE'; throw error; }
    const withdrawal = { id: docId, userId: String(userId), method, details, amount, status: 'pending', date: new Date().toISOString(), requestKey };
    await client.query(`INSERT INTO app_documents(collection,doc_id,data,updated_at) VALUES ('withdrawals',$1,$2::jsonb,NOW())`, [docId, JSON.stringify(withdrawal)]);
    const nextBalance = Math.max(0, balance - amount);
    await client.query('UPDATE users SET balance=$2, updated_at=NOW() WHERE id=$1', [userId, nextBalance]);
    await client.query('COMMIT');
    return { duplicate: false, withdrawal, balance: nextBalance };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
}

async function updateAffiliateOrderStatus(docId, patch) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await client.query("SELECT data FROM app_documents WHERE collection='orders' AND doc_id=$1 FOR UPDATE", [String(docId)]);
    if (!result.rows[0]) { await client.query('COMMIT'); return null; }
    const before = result.rows[0].data || {};
    const next = Object.assign({}, before, patch || {});
    await client.query("UPDATE app_documents SET data=$2::jsonb, updated_at=NOW() WHERE collection='orders' AND doc_id=$1", [String(docId), JSON.stringify(next)]);
    let delivered = false;
    const previousDelivered = deliveredStatus(before.status);
    const nextDelivered = deliveredStatus(next.status);
    const commission = Math.max(0, Number(next.commission) || 0);
    if (next.userId != null && nextDelivered && !previousDelivered && commission > 0) {
      const userResult = await client.query('UPDATE users SET total_earned=COALESCE(total_earned,0)+$2, sales_count=COALESCE(sales_count,0)+1, updated_at=NOW() WHERE id=$1 RETURNING *', [String(next.userId), commission]);
      delivered = Boolean(userResult.rows[0]);
    }
    if (next.userId != null) {
      const userResult = await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [String(next.userId)]);
      if (userResult.rows[0]) {
        const rows = await affiliateRowsForUser(client, next.userId);
        const balance = availableBalanceFromRecords(userResult.rows[0], rows.orders, rows.withdrawals);
        await client.query('UPDATE users SET balance=$2, updated_at=NOW() WHERE id=$1', [String(next.userId), balance]);
      }
    }
    await client.query('COMMIT');
    return { order: next, delivered };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
}

async function listAffiliateOrdersForSync() {
  const result = await query("SELECT doc_id AS id, data FROM app_documents WHERE collection='orders' ORDER BY updated_at ASC");
  return result.rows.map(row => Object.assign({ id: row.id }, row.data || {}));
}

async function upsertProducts(products) {
  const rows = Array.isArray(products) ? products : [];
  if (!rows.length) return { inserted: 0, updated: 0 };
  const client = await getPool().connect();
  let inserted = 0;
  let updated = 0;
  try {
    await client.query('BEGIN');
    for (const product of rows) {
      const externalId = String(product.external_id || product.externalId || product.id || product._id || '').trim();
      if (!externalId) continue;
      const result = await client.query(`
        INSERT INTO products(external_id,name,description,image,price,base_price,commission,stock,active,raw_data,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,NOW())
        ON CONFLICT (external_id) DO UPDATE SET
          name=EXCLUDED.name,
          description=EXCLUDED.description,
          image=EXCLUDED.image,
          price=EXCLUDED.price,
          base_price=EXCLUDED.base_price,
          commission=EXCLUDED.commission,
          stock=EXCLUDED.stock,
          active=EXCLUDED.active,
          raw_data=EXCLUDED.raw_data,
          updated_at=NOW()
        RETURNING (xmax = 0) AS inserted
      `, [
        externalId,
        String(product.name || product.title || ''),
        String(product.description || product.desc || ''),
        String(product.image || (Array.isArray(product.images) ? product.images[0] || '' : '') || ''),
        Number(product.price || 0),
        Number(product.basePrice != null ? product.basePrice : (product.base_price != null ? product.base_price : product.sale_price || 0)),
        Number(product.commission || 0),
        product.stock == null ? 0 : Math.max(0, Math.floor(Number(product.stock) || 0)),
        product.active !== false && product.available === true,
        JSON.stringify(product)
      ]);
      if (result.rows[0] && result.rows[0].inserted) inserted++; else updated++;
    }
    await client.query('COMMIT');
    return { inserted, updated };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function close() {
  if (pool) { await pool.end(); pool = null; }
}

module.exports = {
  getPool, query, migrate, upsertProducts, close,
  getAffiliateUserData, getAffiliateCatalogData, saveAffiliateOrder, updateAffiliateOrder, updateAffiliateOrderStatus, listAffiliateOrdersForSync, saveAffiliateWithdrawal,
  claimAffiliateOrderRequest, completeAffiliateOrderRequest, createAffiliateWithdrawal
};
