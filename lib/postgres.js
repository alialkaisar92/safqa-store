'use strict';

const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
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
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_suspended_until ON users(suspended_until);

    CREATE TABLE IF NOT EXISTS admin_user_actions (
      id BIGSERIAL PRIMARY KEY,
      target_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      admin_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_admin_user_actions_target ON admin_user_actions(target_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_admin_user_actions_created ON admin_user_actions(created_at DESC);

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
      description_generated BOOLEAN NOT NULL DEFAULT FALSE,
      description_generated_at TIMESTAMPTZ,
      description_model TEXT,
      category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
      image TEXT,
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      commission NUMERIC(12,2) NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      stock_quantity INTEGER,
      in_stock BOOLEAN,
      stock_updated_at TIMESTAMPTZ,
      source_product_id TEXT,
      stock_source_path TEXT,
      stock_details JSONB NOT NULL DEFAULT '[]'::jsonb,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS description_generated BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS description_generated_at TIMESTAMPTZ;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS description_model TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_updated_at TIMESTAMPTZ;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS source_product_id TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_source_path TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_details JSONB NOT NULL DEFAULT '[]'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_products_stock_updated_at ON products(stock_updated_at);
    CREATE INDEX IF NOT EXISTS idx_products_source_product_id ON products(source_product_id);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS admin_price_locked BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS admin_sale_price NUMERIC(12,2);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS admin_base_price NUMERIC(12,2);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS admin_commission NUMERIC(12,2);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS admin_price_updated_at TIMESTAMPTZ;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS admin_price_updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_products_admin_price_locked ON products(admin_price_locked);

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
      url TEXT NOT NULL DEFAULT '/store',
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      event_key TEXT,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS url TEXT NOT NULL DEFAULT '/store';
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_key TEXT;
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC, id DESC) WHERE read_at IS NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_event ON notifications(user_id, event_key) WHERE event_key IS NOT NULL;
    CREATE TABLE IF NOT EXISTS affiliate_rewards (
      id BIGSERIAL PRIMARY KEY,
      reward_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
      audience TEXT NOT NULL DEFAULT 'all',
      conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS affiliate_reward_grants (
      id BIGSERIAL PRIMARY KEY,
      reward_id BIGINT NOT NULL REFERENCES affiliate_rewards(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
      granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(reward_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_reward_grants_user_date ON affiliate_reward_grants(user_id, granted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reward_grants_reward ON affiliate_reward_grants(reward_id);
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      expiration_time BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_success_at TIMESTAMPTZ,
      failure_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

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
    CREATE INDEX IF NOT EXISTS idx_app_documents_user_updated ON app_documents(collection, ((data->>'userId')), updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_app_documents_orders_external ON app_documents(collection, ((data->>'externalId')));
    CREATE INDEX IF NOT EXISTS idx_app_documents_orders_request_key ON app_documents(collection, ((data->>'requestKey'))) WHERE collection='orders';

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
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS order_id TEXT;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS failure_reason TEXT;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMPTZ;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS last_manual_retry_at TIMESTAMPTZ;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS last_manual_retry_by TEXT;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS manual_retry_reason TEXT;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS manual_review_decision TEXT;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS manual_review_at TIMESTAMPTZ;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS manual_review_by TEXT;
    ALTER TABLE affiliate_order_requests ADD COLUMN IF NOT EXISTS manual_review_reason TEXT;
    CREATE INDEX IF NOT EXISTS idx_affiliate_order_requests_user ON affiliate_order_requests(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_affiliate_order_requests_status ON affiliate_order_requests(status, next_attempt_at, updated_at);
    CREATE INDEX IF NOT EXISTS idx_affiliate_order_requests_order ON affiliate_order_requests(order_id);

    CREATE TABLE IF NOT EXISTS affiliate_order_attempts (
      id BIGSERIAL PRIMARY KEY,
      request_key TEXT NOT NULL REFERENCES affiliate_order_requests(request_key) ON DELETE CASCADE,
      order_id TEXT,
      attempt_number INTEGER NOT NULL,
      request_status TEXT NOT NULL,
      http_status INTEGER,
      response_time_ms INTEGER,
      supplier_status TEXT,
      error_message TEXT,
      next_attempt_at TIMESTAMPTZ,
      supplier_contacted BOOLEAN,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(request_key, attempt_number)
    );
    ALTER TABLE affiliate_order_attempts ADD COLUMN IF NOT EXISTS supplier_contacted BOOLEAN;
    CREATE INDEX IF NOT EXISTS idx_affiliate_order_attempts_order ON affiliate_order_attempts(order_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_affiliate_order_attempts_request ON affiliate_order_attempts(request_key, attempt_number DESC);

    CREATE TABLE IF NOT EXISTS affiliate_order_webhook_events (
      event_key TEXT PRIMARY KEY,
      supplier_order_id TEXT,
      supplier_serial TEXT,
      supplier_status TEXT NOT NULL,
      previous_status TEXT,
      matched_order_id TEXT,
      matched BOOLEAN NOT NULL DEFAULT FALSE,
      review_required BOOLEAN NOT NULL DEFAULT FALSE,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ,
      last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_affiliate_order_webhook_events_received ON affiliate_order_webhook_events(received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_affiliate_order_webhook_events_review ON affiliate_order_webhook_events(review_required, processed_at, received_at DESC);

    CREATE TABLE IF NOT EXISTS affiliate_commissions (
      order_id TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'earned',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_user ON affiliate_commissions(user_id, created_at DESC);
  `);
}

async function affiliateRowsForUser(client, userId) {
  const result = await client.query(`
    SELECT collection, doc_id, data, updated_at AS document_updated_at
    FROM app_documents
    WHERE collection IN ('orders', 'withdrawals') AND data->>'userId'=$1
    ORDER BY updated_at DESC
  `, [String(userId)]);
  const queueResult = await client.query(`
          SELECT order_id, status, supplier_order_id, failure_reason, cancel_reason, cancel_requested_at, cancelled_at,
           retry_count, last_attempt_at, next_attempt_at, last_manual_retry_at, last_manual_retry_by, manual_retry_reason,
           manual_review_decision, manual_review_at, manual_review_by, manual_review_reason,
           updated_at, request_data, supplier_response

    FROM affiliate_order_requests
    WHERE user_id=$1 AND (order_id IS NOT NULL OR request_data ? 'affiliateOrder')
  `, [String(userId)]);
  const queueByOrderId = new Map();
  const orphanOrders = [];
  for (const row of queueResult.rows || []) {
    const requestOrder = row.request_data && typeof row.request_data === 'object' ? row.request_data.affiliateOrder : null;
    const responseOrder = row.supplier_response && typeof row.supplier_response === 'object' ? row.supplier_response.affiliateOrder : null;
    const candidateId = row.order_id || (requestOrder && requestOrder.id) || (responseOrder && responseOrder.id);
    const queueView = {
      status: String(row.status || ''),
      supplierOrderId: row.supplier_order_id || null,
      failureReason: row.failure_reason || null,
      cancelReason: row.cancel_reason || null,
      cancelRequestedAt: row.cancel_requested_at || null,
      cancelledAt: row.cancelled_at || null,
      retryCount: Number(row.retry_count || 0),
      lastAttemptAt: row.last_attempt_at || null,
      nextAttemptAt: row.next_attempt_at || null,
      manualRetryAt: row.last_manual_retry_at || null,
      manualRetryBy: row.last_manual_retry_by || null,
      manualRetryReason: row.manual_retry_reason || null,
      reviewRequired: String(row.status || '').toLowerCase() === 'unknown',
      manualReviewStatus: String(row.status || '').toLowerCase() === 'unknown' ? 'manual_review' : null,
      manualReviewDecision: row.manual_review_decision || null,
      manualReviewAt: row.manual_review_at || null,
      manualReviewBy: row.manual_review_by || null,
      manualReviewReason: row.manual_review_reason || null,
      updatedAt: row.updated_at || null
    };
    if (candidateId) queueByOrderId.set(String(candidateId), queueView);
    if (!row.order_id && requestOrder && requestOrder.id) {
      orphanOrders.push(Object.assign({ id: String(requestOrder.id), userId: String(userId) }, requestOrder, { _queue: queueView }));
    }
  }
  const orders = [], withdrawals = [], documentOrderIds = new Set();
  for (const row of result.rows) {
    const value = Object.assign({ id: row.doc_id, _documentUpdatedAt: row.document_updated_at || null }, row.data || {});
    if (row.collection === 'orders') {
      documentOrderIds.add(String(row.doc_id));
      const queue = queueByOrderId.get(String(row.doc_id));
      if (queue) value._queue = queue;
      orders.push(value);
    }
    if (row.collection === 'withdrawals') withdrawals.push(value);
  }
  orphanOrders.forEach(order => { if (!documentOrderIds.has(String(order.id))) orders.push(order); });
  return { orders, withdrawals };
}

async function getAffiliateUserData(userId) {
  const client = await getPool().connect();
  try { return await affiliateRowsForUser(client, userId); }
  finally { client.release(); }
}

async function getAffiliateOrderUpdates(userId, since, limit = 60) {
  const id = String(userId || '').trim();
  if (!id) return { orders: [], cursor: null };
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 60));
  const parsedSince = since ? new Date(since) : new Date(0);
  const sinceDate = Number.isNaN(parsedSince.getTime()) ? new Date(0) : parsedSince;
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT d.doc_id, d.data, d.updated_at AS document_updated_at,
             q.status, q.supplier_order_id, q.failure_reason, q.cancel_reason,
             q.cancel_requested_at, q.cancelled_at, q.retry_count, q.last_attempt_at,
             q.next_attempt_at, q.last_manual_retry_at, q.last_manual_retry_by,
             q.manual_retry_reason, q.manual_review_decision, q.manual_review_at,
             q.manual_review_by, q.manual_review_reason, q.updated_at AS queue_updated_at,
             GREATEST(d.updated_at, COALESCE(q.updated_at, 'epoch'::timestamptz)) AS changed_at
      FROM app_documents d
      LEFT JOIN affiliate_order_requests q ON q.order_id=d.doc_id AND q.user_id=$1
      WHERE d.collection='orders'
        AND d.data->>'userId'=$1
        AND GREATEST(d.updated_at, COALESCE(q.updated_at, 'epoch'::timestamptz)) > $2::timestamptz
      ORDER BY changed_at ASC
      LIMIT $3
    `, [id, sinceDate.toISOString(), safeLimit]);
    const orders = (result.rows || []).map(row => {
      const value = Object.assign({ id: row.doc_id, _documentUpdatedAt: row.document_updated_at || null }, row.data || {});
      if (row.status || row.queue_updated_at) {
        value._queue = {
          status: String(row.status || ''),
          supplierOrderId: row.supplier_order_id || null,
          failureReason: row.failure_reason || null,
          cancelReason: row.cancel_reason || null,
          cancelRequestedAt: row.cancel_requested_at || null,
          cancelledAt: row.cancelled_at || null,
          retryCount: Number(row.retry_count || 0),
          lastAttemptAt: row.last_attempt_at || null,
          nextAttemptAt: row.next_attempt_at || null,
          manualRetryAt: row.last_manual_retry_at || null,
          manualRetryBy: row.last_manual_retry_by || null,
          manualRetryReason: row.manual_retry_reason || null,
          reviewRequired: String(row.status || '').toLowerCase() === 'unknown',
          manualReviewStatus: String(row.status || '').toLowerCase() === 'unknown' ? 'manual_review' : null,
          manualReviewDecision: row.manual_review_decision || null,
          manualReviewAt: row.manual_review_at || null,
          manualReviewBy: row.manual_review_by || null,
          manualReviewReason: row.manual_review_reason || null,
          updatedAt: row.queue_updated_at || null
        };
      }
      return value;
    });
    const cursor = result.rows && result.rows.length ? result.rows.reduce((latest, row) => {
      const candidate = row.changed_at && new Date(row.changed_at).getTime() > new Date(latest).getTime() ? row.changed_at : latest;
      return candidate;
    }, sinceDate.toISOString()) : sinceDate.toISOString();
    return { orders, cursor };
  } finally {
    client.release();
  }
}

async function getAffiliatePricingPolicy() {
  const result = await query("SELECT data, updated_at FROM app_documents WHERE collection='affiliateMeta' AND doc_id='main' LIMIT 1");
  const row = result.rows[0] || {};
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  return {
    priceUp: Math.max(0, Math.min(200, Number(data.priceUp) || 0)),
    pricePolicyUpdatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
}

async function getAffiliateCatalogData() {
  const [products, meta, live] = await Promise.all([
    query("SELECT doc_id AS id, data FROM app_documents WHERE collection='affiliateProducts' ORDER BY updated_at DESC"),
    query("SELECT data, updated_at FROM app_documents WHERE collection='affiliateMeta' AND doc_id='main' LIMIT 1"),
          query("SELECT external_id AS id, name, description, description_generated, description_generated_at, description_model, image, price, base_price, commission, stock, stock_quantity, in_stock, stock_updated_at, source_product_id, stock_source_path, stock_details, active, raw_data, admin_price_locked, admin_sale_price, admin_base_price, admin_commission, admin_price_updated_at, admin_price_updated_by, updated_at FROM products ORDER BY updated_at DESC").catch(() => ({ rows: [] }))

  ]);
  const priceUp = meta.rows[0] && meta.rows[0].data ? Number(meta.rows[0].data.priceUp || 0) : 0;
  const pricePolicyUpdatedAt = meta.rows[0] && meta.rows[0].updated_at ? new Date(meta.rows[0].updated_at).toISOString() : null;
  const saved = products.rows.map(row => Object.assign({ id: row.id }, row.data || {}));
  const savedById = new Map(saved.map(item => [String(item.id || item.sourceId || item.source_id || ''), item]));
  const merged = [];
  const seen = new Set();
  for (const row of live.rows || []) {
    const id = String(row.id || '').trim();
    if (!id || seen.has(id)) continue;
    const local = savedById.get(id) || {};
    const raw = Object.assign({}, local.raw && typeof local.raw === 'object' ? local.raw : {}, row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {});
    merged.push(Object.assign({}, local, {
      id,
      sourceId: local.sourceId || id,
      name: row.name || local.name || '',
      description: row.description || local.description || '',
      aiDescription: row.description_generated === true || local.aiDescription === true,
      descriptionGeneratedAt: row.description_generated_at || local.descriptionGeneratedAt || null,
      descriptionSource: row.description_model || local.descriptionSource || null,
      image: row.image || local.image || '',
      adminPriceLocked: row.admin_price_locked === true || local.adminPriceLocked === true,
      adminSalePrice: row.admin_sale_price != null ? row.admin_sale_price : (local.adminSalePrice != null ? local.adminSalePrice : null),
      adminCommission: row.admin_commission != null ? row.admin_commission : (local.adminCommission != null ? local.adminCommission : null),
      adminPriceUpdatedAt: row.admin_price_updated_at || local.adminPriceUpdatedAt || null,
      adminPriceUpdatedBy: row.admin_price_updated_by || local.adminPriceUpdatedBy || null,
      price: (row.admin_price_locked === true && row.admin_sale_price != null) ? row.admin_sale_price : (local.adminPriceLocked === true && local.adminSalePrice != null ? local.adminSalePrice : row.price),
      basePrice: row.base_price,
      commission: (row.admin_price_locked === true && row.admin_commission != null) ? row.admin_commission : (local.adminPriceLocked === true && local.adminCommission != null ? local.adminCommission : row.commission),
      stock: row.stock_quantity != null ? row.stock_quantity : null,
      stockQuantity: row.stock_quantity != null ? row.stock_quantity : null,
      inStock: row.in_stock === true,
      stockUpdatedAt: row.stock_updated_at || null,
      sourceProductId: row.source_product_id || row.id,
      stockSourcePath: row.stock_source_path || null,
      stockDetails: Array.isArray(row.stock_details) ? row.stock_details : [],
      available: row.active === true,
      active: row.active === true,
      raw
    }));
    seen.add(id);
  }
  for (const item of saved) {
    const id = String(item.id || '').trim();
    if (id && !seen.has(id)) merged.push(item);
  }
  return {
    products: merged,
    priceUp,
    pricePolicyUpdatedAt,
    settings: meta.rows[0] && meta.rows[0].data ? (meta.rows[0].data.settings || {}) : {}
  };
}

async function getProductsByExternalIds(ids) {
  const values = (Array.isArray(ids) ? ids : []).map(value => String(value || '').trim()).filter(Boolean).slice(0, 100);
  if (!values.length) return [];
  const result = await query(`
    SELECT external_id AS id, name, description, description_generated, description_generated_at, description_model, image, price, base_price, commission, stock, stock_quantity, in_stock, stock_updated_at, source_product_id, stock_source_path, stock_details, active, raw_data, admin_price_locked, admin_sale_price, admin_commission, admin_price_updated_at, admin_price_updated_by, updated_at
    FROM products
    WHERE external_id = ANY($1::text[])
  `, [values]);
  return result.rows.map(row => {
    const raw = row.raw_data && typeof row.raw_data === 'object' ? row.raw_data : {};
    const props = Array.isArray(raw.properties) ? raw.properties : [];
    const rawFlags = props.map(prop => prop && prop.is_available).filter(value => typeof value === 'boolean');
    const available = typeof raw.is_available === 'boolean' ? raw.is_available : (rawFlags.length ? rawFlags.some(Boolean) : row.active === true);
    return Object.assign({}, raw, {
      id: row.id,
      _id: row.id,
      name: row.name,
      title: row.name,
      description: row.description,
      aiDescription: row.description_generated === true,
      descriptionGeneratedAt: row.description_generated_at || null,
      descriptionSource: row.description_model || null,
      image: row.image,
      price: row.price,
      basePrice: row.base_price,
      commission: row.commission,
      stock: row.stock_quantity != null ? row.stock_quantity : null,
      stockQuantity: row.stock_quantity != null ? row.stock_quantity : null,
      inStock: row.in_stock === true,
      stockUpdatedAt: row.stock_updated_at || null,
      sourceProductId: row.source_product_id || row.id,
      stockSourcePath: row.stock_source_path || null,
      adminPriceLocked: row.admin_price_locked === true,
      adminSalePrice: row.admin_sale_price != null ? row.admin_sale_price : null,
      adminCommission: row.admin_commission != null ? row.admin_commission : null,
      adminPriceUpdatedAt: row.admin_price_updated_at || null,
      adminPriceUpdatedBy: row.admin_price_updated_by || null,
      is_active: row.active === true,
      is_available: available,
      updated_at: row.updated_at
    });
  });
}

async function saveAffiliateOrder(order) {
  const value = Object.assign({}, order || {});
  const docId = String(value.id || value.serial || '').trim();
  if (!docId) throw new Error('معرّف الطلب المحلي مفقود');
  await query(`
    INSERT INTO app_documents(collection, doc_id, data, updated_at)
    VALUES ('orders',$1,$2::jsonb,NOW())
    ON CONFLICT (collection, doc_id) DO UPDATE SET
      data = CASE
        WHEN app_documents.data->>'requestStatus' IN ('cancel_requested','cancelled')
        THEN app_documents.data || EXCLUDED.data || jsonb_build_object(
          'status', CASE WHEN app_documents.data->>'requestStatus'='cancelled' THEN 'تم إلغاء الطلب' ELSE 'طلب الإلغاء قيد المراجعة' END,
          'requestStatus', app_documents.data->>'requestStatus',
          'cancelReason', COALESCE(app_documents.data->>'cancelReason', EXCLUDED.data->>'cancelReason')
        )
        ELSE EXCLUDED.data
      END,
      updated_at=NOW()
  `, [docId, JSON.stringify(value)]);
  return value;
}

async function updateAffiliateOrder(docId, patch) {
  const result = await query(`
    UPDATE app_documents
    SET data = CASE
      WHEN data->>'requestStatus' IN ('cancel_requested','cancelled')
       AND COALESCE(($2::jsonb)->>'requestStatus','') NOT IN ('cancel_requested','cancelled')
      THEN data || $2::jsonb || jsonb_build_object(
        'status', CASE WHEN data->>'requestStatus'='cancelled' THEN 'تم إلغاء الطلب' ELSE 'طلب الإلغاء قيد المراجعة' END,
        'requestStatus', data->>'requestStatus',
        'cancelReason', COALESCE(data->>'cancelReason', ($2::jsonb)->>'cancelReason')
      )
      ELSE data || $2::jsonb
    END, updated_at=NOW()
    WHERE collection='orders' AND doc_id=$1
    RETURNING data
  `, [String(docId), JSON.stringify(patch || {})]);
  return result.rows[0] ? result.rows[0].data : null;
}

async function cancelAffiliateOrder(userId, orderId, reason) {
  const safeUserId = String(userId || '').trim();
  const safeOrderId = String(orderId || '').trim();
  const safeReason = String(reason || '').trim().slice(0, 500);
  if (!safeUserId || !safeOrderId || safeReason.length < 3) {
    const error = new Error('سبب الإلغاء مطلوب'); error.code = 'INVALID_CANCEL_REASON'; throw error;
  }
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const docResult = await client.query("SELECT data FROM app_documents WHERE collection='orders' AND doc_id=$1 AND data->>'userId'=$2 FOR UPDATE", [safeOrderId, safeUserId]);
    if (!docResult.rows[0]) { await client.query('ROLLBACK'); const error = new Error('الطلب غير موجود'); error.code = 'ORDER_NOT_FOUND'; throw error; }
    const before = docResult.rows[0].data || {};
    const queueResult = await client.query('SELECT * FROM affiliate_order_requests WHERE user_id=$1 AND order_id=$2 FOR UPDATE', [safeUserId, safeOrderId]);
    const queue = queueResult.rows[0] || null;
    const currentStatus = String((queue && queue.status) || before.requestStatus || before.status || '').trim().toLowerCase();
    if (currentStatus === 'cancelled' || currentStatus === 'cancel_requested') {
      const savedReason = String((queue && queue.cancel_reason) || before.cancelReason || '').trim();
      await client.query('COMMIT');
      return { order: Object.assign({}, before, { cancelReason: savedReason }), status: currentStatus, cancelRequested: currentStatus === 'cancel_requested', duplicate: true };
    }
    const finalStatuses = new Set(['confirmed','delivered','completed','shipped','تم التأكيد','تم التسليم','تم التوصيل','تم الشحن','returned','rejected','failed']);
    if (finalStatuses.has(currentStatus)) {
      await client.query('ROLLBACK');
      const error = new Error('لا يمكن إلغاء الطلب بعد بدء الشحن أو اكتماله'); error.code = 'ORDER_NOT_CANCELLABLE'; throw error;
    }
    const hasSupplierId = Boolean((queue && queue.supplier_order_id) || before.externalId || before.supplierOrderId);
    const nextStatus = hasSupplierId || currentStatus === 'processing' || currentStatus === 'accepted' || currentStatus === 'unknown' ? 'cancel_requested' : 'cancelled';
    const nextDisplayStatus = nextStatus === 'cancelled' ? 'تم إلغاء الطلب' : 'طلب الإلغاء قيد المراجعة';
    if (queue) {
      await client.query(`
        UPDATE affiliate_order_requests
        SET status=$3, cancel_reason=$4, cancel_requested_at=COALESCE(cancel_requested_at,NOW()), cancelled_at=CASE WHEN $3='cancelled' THEN NOW() ELSE cancelled_at END,
            next_attempt_at=NULL, lease_expires_at=NULL, updated_at=NOW()
        WHERE user_id=$1 AND order_id=$2
      `, [safeUserId, safeOrderId, nextStatus, safeReason]);
    }
    const next = Object.assign({}, before, { status: nextDisplayStatus, requestStatus: nextStatus, cancelReason: safeReason, cancelRequestedAt: before.cancelRequestedAt || new Date().toISOString(), cancelledAt: nextStatus === 'cancelled' ? new Date().toISOString() : (before.cancelledAt || null) });
    await client.query("UPDATE app_documents SET data=$3::jsonb, updated_at=NOW() WHERE collection='orders' AND doc_id=$1 AND data->>'userId'=$2", [safeOrderId, safeUserId, JSON.stringify(next)]);
    await client.query('COMMIT');
    return { order: next, status: nextStatus, cancelRequested: nextStatus === 'cancel_requested' };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
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

    // إذا وصل المورد بنجاح ثم تعطل حفظ سجل الأفليت، لا نعيد إرسال الطلب.
    // نبحث عن سجل محلي يحمل نفس المفتاح ونحوّل الحالة إلى accepted قبل أي POST جديد.
    const recovered = await client.query(`
      SELECT doc_id, data
      FROM app_documents
      WHERE collection='orders' AND data->>'requestKey'=$1
      LIMIT 1
      FOR UPDATE
    `, [key]);
    if (recovered.rows[0]) {
      const affiliateOrder = Object.assign({ id: recovered.rows[0].doc_id }, recovered.rows[0].data || {});
      const supplierOrderId = String(affiliateOrder.id || affiliateOrder.serial || '').trim() || null;
      const recoveredResponse = { order: affiliateOrder.external || affiliateOrder, affiliateOrder };
      await client.query(`
        UPDATE affiliate_order_requests
        SET status='accepted', supplier_response=$2::jsonb, supplier_order_id=$3, updated_at=NOW()
        WHERE request_key=$1
      `, [key, JSON.stringify(recoveredResponse), supplierOrderId]);
      await client.query('COMMIT');
      return {
        mode: 'duplicate',
        row: Object.assign({}, row, {
          status: 'accepted',
          supplier_response: recoveredResponse,
          supplier_order_id: supplierOrderId
        })
      };
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

async function createQueuedAffiliateOrder(userId, requestKey, requestData, order) {
  const key = String(requestKey || '').trim();
  const orderId = String(order && order.id || '').trim();
  if (!key || key.length < 16 || key.length > 160 || !orderId) throw new Error('بيانات الطلب المؤجل غير مكتملة');
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(`
      INSERT INTO affiliate_order_requests(request_key,user_id,order_id,status,request_data,next_attempt_at,updated_at)
      VALUES ($1,$2,$3,'pending',$4::jsonb,NOW(),NOW())
      ON CONFLICT (request_key) DO NOTHING
      RETURNING *
    `, [key, userId, orderId, JSON.stringify(requestData || {})]);
    const result = inserted.rows[0]
      ? inserted
      : await client.query('SELECT * FROM affiliate_order_requests WHERE request_key=$1 FOR UPDATE', [key]);
    const row = result.rows[0];
    if (!row || String(row.user_id) !== String(userId)) {
      const error = new Error('مفتاح الطلب مستخدم لحساب آخر'); error.code = 'IDEMPOTENCY_CONFLICT'; throw error;
    }
    if (inserted.rows[0]) {
      await client.query(`
        INSERT INTO app_documents(collection,doc_id,data,updated_at)
        VALUES ('orders',$1,$2::jsonb,NOW())
        ON CONFLICT (collection,doc_id) DO NOTHING
      `, [orderId, JSON.stringify(order)]);
      await client.query('COMMIT');
      return { mode: 'created', row };
    }
    // إعادة المحاولة قد تصل إلى queue قديم أنشئ قبل ربط order_id أو بعد فشل حفظ document.
    // نصلح الرابط وننشئ document مفقودًا فقط؛ لا نُعيد كتابة document موجود ولا نغير حالته.
    const canonicalOrderId = String(row.order_id || orderId).trim();
    if (!row.order_id && canonicalOrderId) {
      await client.query('UPDATE affiliate_order_requests SET order_id=$2, updated_at=NOW() WHERE request_key=$1 AND order_id IS NULL', [key, canonicalOrderId]);
      row.order_id = canonicalOrderId;
    }
    if (canonicalOrderId) {
      await client.query(`
        INSERT INTO app_documents(collection,doc_id,data,updated_at)
        VALUES ('orders',$1,$2::jsonb,NOW())
        ON CONFLICT (collection,doc_id) DO NOTHING
      `, [canonicalOrderId, JSON.stringify(order)]);
    }
    await client.query('COMMIT');
    if (['accepted', 'confirmed'].includes(String(row.status))) return { mode: 'duplicate', row };
    if (['pending', 'processing', 'retry'].includes(String(row.status))) return { mode: 'in_progress', row };
    return { mode: 'duplicate', row };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
}

async function claimAffiliateOrderJobByKey(requestKey) {
  const key = String(requestKey || '').trim();
  if (!key) return null;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT * FROM affiliate_order_requests WHERE request_key=$1 FOR UPDATE', [key]);
    const row = current.rows[0];
    if (!row || !['pending', 'retry'].includes(String(row.status || '').toLowerCase())) {
      await client.query('COMMIT');
      return null;
    }
    const updated = await client.query(`
      UPDATE affiliate_order_requests
      SET status='processing', processing_started_at=COALESCE(processing_started_at,NOW()), last_attempt_at=NOW(),
          lease_expires_at=NOW() + INTERVAL '90 seconds', retry_count=retry_count+1, failure_reason=NULL, updated_at=NOW()
      WHERE request_key=$1 AND status IN ('pending','retry')
        AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
      RETURNING *
    `, [key]);
    const claimed = updated.rows[0] || null;
    if (claimed && claimed.order_id) {
      await client.query(`
        UPDATE app_documents
        SET data = data || jsonb_build_object('status','جاري تجهيز الطلب','requestStatus','processing','statusSyncedAt',NOW()::text), updated_at=NOW()
        WHERE collection='orders' AND doc_id=$1
      `, [String(claimed.order_id)]);
    }
    await client.query('COMMIT');
    return claimed;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
}

async function claimAffiliateOrderJobs(limit = 5) {
  const safeLimit = Math.min(20, Math.max(1, Number(limit) || 5));
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const expired = await client.query(`
      UPDATE affiliate_order_requests
      SET status='unknown', failure_reason='انتهت مهلة العامل أثناء معالجة الطلب؛ جارٍ التحقق من حالة المورد', lease_expires_at=NULL, updated_at=NOW()
      WHERE status='processing' AND lease_expires_at IS NOT NULL AND lease_expires_at < NOW()
      RETURNING order_id
    `);
    for (const row of expired.rows || []) {
      if (!row.order_id) continue;
      await client.query(`
        UPDATE app_documents
        SET data = data || jsonb_build_object('status','قيد التحقق','requestStatus','unknown','failureReason','انتهت مهلة العامل أثناء معالجة الطلب؛ جارٍ التحقق من حالة المورد','statusSyncedAt',NOW()::text), updated_at=NOW()
        WHERE collection='orders' AND doc_id=$1
      `, [String(row.order_id)]);
    }
    await client.query(`
      UPDATE affiliate_order_requests
      SET status='unknown', failure_reason='وظيفة قديمة بلا معرّف طلب محلي؛ لم تتم إعادة إرسالها للمورد', updated_at=NOW()
      WHERE status='processing' AND order_id IS NULL AND retry_count=0 AND lease_expires_at IS NULL AND supplier_response='{}'::jsonb
    `);
    const candidates = await client.query(`
      SELECT * FROM affiliate_order_requests
      WHERE status IN ('pending','retry')
        AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
      ORDER BY COALESCE(next_attempt_at, created_at) ASC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT $1
    `, [safeLimit]);
    const claimed = [];
    for (const row of candidates.rows) {
      const updated = await client.query(`
        UPDATE affiliate_order_requests
        SET status='processing', processing_started_at=COALESCE(processing_started_at,NOW()), last_attempt_at=NOW(),
            lease_expires_at=NOW() + INTERVAL '90 seconds', retry_count=retry_count+1, failure_reason=NULL, updated_at=NOW()
        WHERE request_key=$1
        RETURNING *
      `, [row.request_key]);
      if (updated.rows[0]) {
        const claimedRow = updated.rows[0];
        if (claimedRow.order_id) {
          await client.query(`
            UPDATE app_documents
            SET data = data || jsonb_build_object('status','جاري تجهيز الطلب','requestStatus','processing','statusSyncedAt',NOW()::text), updated_at=NOW()
            WHERE collection='orders' AND doc_id=$1
          `, [String(claimedRow.order_id)]);
        }
        claimed.push(claimedRow);
      }
    }
    await client.query('COMMIT');
    return claimed;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
}

async function updateAffiliateOrderQueueState(requestKey, status, details = {}) {
  const patch = details || {};
  const result = await query(`
    UPDATE affiliate_order_requests
    SET status=CASE
          WHEN status IN ('cancel_requested','cancelled') AND $2 NOT IN ('cancel_requested','cancelled') THEN status
          WHEN status='unknown' AND $2 IN ('pending','retry','processing') THEN status
          WHEN status='unknown' AND $2 IN ('accepted','confirmed') AND COALESCE($4,'')='' THEN status
          ELSE $2
        END,
        supplier_response=COALESCE($3::jsonb, supplier_response),
        supplier_order_id=COALESCE($4, supplier_order_id),
        failure_reason=CASE
          WHEN status IN ('cancel_requested','cancelled') AND $2 NOT IN ('cancel_requested','cancelled') THEN failure_reason
          ELSE $5
        END,
        next_attempt_at=CASE
          WHEN status IN ('cancel_requested','cancelled') THEN NULL
          ELSE $6
        END,
        lease_expires_at=NULL,
        updated_at=NOW()
    WHERE request_key=$1
    RETURNING *
  `, [String(requestKey), String(status), patch.supplierResponse ? JSON.stringify(patch.supplierResponse) : null,
    patch.supplierOrderId ? String(patch.supplierOrderId) : null, patch.failureReason || null, patch.nextAttemptAt || null]);
  return result.rows[0] || null;
}

async function getAffiliateOrderStatus(userId, orderId) {
  const result = await query(`
    SELECT r.*, d.data AS order_data
    FROM affiliate_order_requests r
    LEFT JOIN app_documents d ON d.collection='orders' AND d.doc_id=r.order_id
    WHERE r.user_id=$1 AND (r.order_id=$2 OR r.request_key=$2)
    ORDER BY r.updated_at DESC
    LIMIT 1
  `, [String(userId), String(orderId)]);
  return result.rows[0] || null;
}

async function completeAffiliateOrderRequest(requestKey, status, supplierResponse, supplierOrderId) {
  const result = await query(`
    UPDATE affiliate_order_requests
    SET status=CASE
          WHEN status IN ('cancel_requested','cancelled') THEN status
          WHEN status='unknown' AND $2 IN ('pending','retry','processing') THEN status
          WHEN status='unknown' AND $2 IN ('accepted','confirmed') AND COALESCE($4,'')='' THEN status
          ELSE $2
        END,
        supplier_response=$3::jsonb,
        supplier_order_id=COALESCE($4, supplier_order_id),
        next_attempt_at=NULL,
        lease_expires_at=NULL,
        updated_at=NOW()
    WHERE request_key=$1
    RETURNING *
  `, [String(requestKey), String(status), JSON.stringify(supplierResponse || {}), supplierOrderId ? String(supplierOrderId) : null]);
  return result.rows[0] || null;
}

async function repairAcceptedUntrackedAffiliateOrders(limit = 100) {
  const safeLimit = Math.min(500, Math.max(1, Number(limit) || 100));
  const candidates = await query(`
    SELECT request_key, supplier_response
    FROM affiliate_order_requests
    WHERE status='accepted_untracked'
    ORDER BY updated_at ASC
    LIMIT $1
  `, [safeLimit]);
  let repaired = 0;
  for (const candidate of candidates.rows) {
    const payload = candidate.supplier_response || {};
    const affiliateOrder = payload.affiliateOrder;
    if (!affiliateOrder || !affiliateOrder.id) continue;
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        INSERT INTO app_documents(collection, doc_id, data, updated_at)
        VALUES ('orders',$1,$2::jsonb,NOW())
        ON CONFLICT (collection, doc_id) DO NOTHING
      `, [String(affiliateOrder.id), JSON.stringify(affiliateOrder)]);
      await client.query(`
        UPDATE affiliate_order_requests
        SET status='accepted', updated_at=NOW()
        WHERE request_key=$1 AND status='accepted_untracked'
      `, [String(candidate.request_key)]);
      await client.query('COMMIT');
      repaired++;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.warn('[postgres] accepted-untracked repair skipped:', error.message);
    } finally { client.release(); }
  }
  return { scanned: candidates.rows.length, repaired };
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
    const requested = patch || {};
    if (['cancel_requested','cancelled'].includes(String(before.requestStatus || '').toLowerCase()) && !['cancel_requested','cancelled'].includes(String(requested.requestStatus || '').toLowerCase())) {
      await client.query('COMMIT');
      return { order: before, delivered: false, changed: false, statusChanged: false, cancellationProtected: true };
    }
    const next = Object.assign({}, before, requested);
    const statusChanged = String(before.status || '') !== String(next.status || '');
    const changed = statusChanged || Object.keys(requested).some(key => key !== 'adminUpdatedAt' && String(before[key] == null ? '' : before[key]) !== String(next[key] == null ? '' : next[key]));
    await client.query("UPDATE app_documents SET data=$2::jsonb, updated_at=NOW() WHERE collection='orders' AND doc_id=$1", [String(docId), JSON.stringify(next)]);
    let delivered = false;
    const previousDelivered = deliveredStatus(before.status);
    const nextDelivered = deliveredStatus(next.status);
    const commission = Math.max(0, Number(next.commission) || 0);
    const previousCommissionEligible = ['تم التأكيد', 'تم التاكيد', 'confirmed', 'تم التسليم', 'تم التوصيل', 'delivered', 'completed'].includes(String(before.status || '').trim().toLowerCase());
    const nextCommissionEligible = ['تم التأكيد', 'تم التاكيد', 'confirmed', 'تم التسليم', 'تم التوصيل', 'delivered', 'completed'].includes(String(next.status || '').trim().toLowerCase());
    if (next.userId != null && nextCommissionEligible && !previousCommissionEligible && commission > 0) {
      const ledger = await client.query(`
        INSERT INTO affiliate_commissions(order_id,user_id,amount,status,updated_at)
        VALUES ($1,$2,$3,'earned',NOW())
        ON CONFLICT (order_id) DO NOTHING
        RETURNING order_id
      `, [String(docId), String(next.userId), commission]);
      if (ledger.rows[0]) {
        await client.query('UPDATE users SET total_earned=COALESCE(total_earned,0)+$2, updated_at=NOW() WHERE id=$1', [String(next.userId), commission]);
      }
    }
    if (next.userId != null && nextDelivered && !previousDelivered) {
      const salesResult = await client.query('UPDATE users SET sales_count=COALESCE(sales_count,0)+1, updated_at=NOW() WHERE id=$1 RETURNING *', [String(next.userId)]);
      delivered = Boolean(salesResult.rows[0]);
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
    return { order: next, delivered, changed, statusChanged };
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
  const beforeById = new Map();
  const stockChanges = [];
  try {
    const ids = rows.map(product => String(product.external_id || product.externalId || product.id || product._id || '').trim()).filter(Boolean);
    if (ids.length) {
      const previous = await client.query('SELECT external_id, stock_quantity, in_stock, stock_updated_at FROM products WHERE external_id = ANY($1::text[])', [ids]);
      previous.rows.forEach(row => beforeById.set(String(row.external_id), row));
    }
    await client.query('BEGIN');
    for (const product of rows) {
      const externalId = String(product.external_id || product.externalId || product.id || product._id || '').trim();
      if (!externalId) continue;
      const nextStockQuantity = product.stock_quantity == null ? null : Math.max(0, Math.floor(Number(product.stock_quantity) || 0));
      const nextInStock = product.in_stock == null ? (product.available === true ? true : product.available === false ? false : null) : Boolean(product.in_stock);
      const previous = beforeById.get(externalId);
      if (stockChanges.length < 100 && (!previous || previous.stock_quantity !== nextStockQuantity || previous.in_stock !== nextInStock)) {
        stockChanges.push({ productId: externalId, stockBefore: previous?.stock_quantity ?? null, stockAfter: nextStockQuantity, inStockBefore: previous?.in_stock ?? null, inStockAfter: nextInStock, stockUpdatedAt: product.stock_updated_at || new Date().toISOString(), sourcePath: product.stock_source_path || null });
      }
      const result = await client.query(`
        INSERT INTO products(external_id,name,description,description_generated,description_generated_at,description_model,image,price,base_price,commission,stock,stock_quantity,in_stock,stock_updated_at,source_product_id,stock_source_path,stock_details,active,raw_data,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19::jsonb,NOW())
        ON CONFLICT (external_id) DO UPDATE SET
          name=EXCLUDED.name,
          description=CASE WHEN products.description_generated THEN products.description ELSE EXCLUDED.description END,
          description_generated=CASE WHEN products.description_generated THEN TRUE ELSE EXCLUDED.description_generated END,
          description_generated_at=CASE WHEN products.description_generated THEN products.description_generated_at ELSE EXCLUDED.description_generated_at END,
          description_model=CASE WHEN products.description_generated THEN products.description_model ELSE EXCLUDED.description_model END,
          image=EXCLUDED.image,
          price=CASE WHEN products.admin_price_locked THEN COALESCE(products.admin_sale_price, products.price) ELSE EXCLUDED.price END,
          base_price=CASE WHEN products.admin_price_locked THEN COALESCE(products.admin_base_price, EXCLUDED.base_price) ELSE EXCLUDED.base_price END,
          commission=CASE WHEN products.admin_price_locked THEN COALESCE(products.admin_commission, products.commission) ELSE EXCLUDED.commission END,
          stock=EXCLUDED.stock,
          stock_quantity=EXCLUDED.stock_quantity,
          in_stock=EXCLUDED.in_stock,
          stock_updated_at=EXCLUDED.stock_updated_at,
          source_product_id=EXCLUDED.source_product_id,
          stock_source_path=EXCLUDED.stock_source_path,
          stock_details=EXCLUDED.stock_details,
          active=EXCLUDED.active,
          raw_data=EXCLUDED.raw_data,
          updated_at=NOW()
        RETURNING (xmax = 0) AS inserted
      `, [
        externalId,
        String(product.name || product.title || ''),
        String(product.description || product.desc || ''),
        product.aiDescription === true,
        product.descriptionUpdatedAt ? new Date(product.descriptionUpdatedAt) : null,
        product.descriptionSource == null ? null : String(product.descriptionSource),
        String(product.image || (Array.isArray(product.images) ? product.images[0] || '' : '') || ''),
        Number(product.price || 0),
        Number(product.basePrice != null ? product.basePrice : (product.base_price != null ? product.base_price : product.sale_price || 0)),
        Number(product.commission || 0),
        nextStockQuantity == null ? 0 : nextStockQuantity,
        nextStockQuantity,
        nextInStock,
        product.stock_updated_at ? new Date(product.stock_updated_at) : null,
        String(product.source_product_id || externalId),
        product.stock_source_path == null ? null : String(product.stock_source_path),
        JSON.stringify(Array.isArray(product.stock_details) ? product.stock_details : Array.isArray(product.stockDetails) ? product.stockDetails : []),
        product.active !== false && product.available === true,
        JSON.stringify(product)
      ]);
      if (result.rows[0] && result.rows[0].inserted) inserted++; else updated++;
    }
    await client.query('COMMIT');
    stockChanges.forEach(change => console.log('[stock-sync] change:', JSON.stringify(change)));
    return { inserted, updated, stockChanges: stockChanges.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function setAdminProductPricing(docId, pricing, adminUserId) {
  const value = pricing && typeof pricing === 'object' ? pricing : {};
  const locked = value.locked === true;
  const salePrice = Number(value.salePrice);
  const commission = Number(value.commission);
  const safeSale = Number.isFinite(salePrice) && salePrice >= 0 ? Math.round(salePrice * 100) / 100 : null;
  const safeCommission = Number.isFinite(commission) && commission >= 0 ? Math.round(commission * 100) / 100 : null;
  const current = await query('SELECT base_price FROM products WHERE external_id=$1 LIMIT 1', [String(docId)]);
  if (!current.rows[0]) return null;
  if (locked && safeSale != null && safeSale < Number(current.rows[0].base_price || 0)) throw new Error('سعر البيع لا يمكن أن يقل عن سعر التكلفة');
  const result = await query(`
    UPDATE products
    SET admin_price_locked=$2,
        admin_sale_price=$3,
        admin_base_price=NULL,
        admin_commission=$4,
        admin_price_updated_at=CASE WHEN $2 THEN NOW() ELSE NULL END,
        admin_price_updated_by=CASE WHEN $2 THEN $5::bigint ELSE NULL END,
        price=CASE WHEN $2 THEN COALESCE($3, price) ELSE base_price END,
        commission=CASE WHEN $2 THEN COALESCE($4, commission) ELSE commission END,
        updated_at=NOW()
    WHERE external_id=$1
    RETURNING external_id AS id, admin_price_locked, admin_sale_price, admin_base_price, admin_commission, admin_price_updated_at, admin_price_updated_by, price, base_price, commission
  `, [String(docId), locked, safeSale, safeCommission, adminUserId == null ? null : String(adminUserId)]);
  return result.rows[0] || null;
}

async function saveAffiliateProduct(product) {
  const value = Object.assign({}, product || {});
  const docId = String(value.id || value.external_id || value.externalId || '').trim();
  if (!docId) throw new Error('معرّف المنتج مفقود');
  await query(`
    INSERT INTO app_documents(collection, doc_id, data, updated_at)
    VALUES ('affiliateProducts',$1,$2::jsonb,NOW())
    ON CONFLICT (collection, doc_id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()
  `, [docId, JSON.stringify(value)]);
  return Object.assign({ id: docId }, value);
}

async function saveAiProductDescription(docId, description, metadata, baseProduct) {
  const id = String(docId || '').trim();
  const text = String(description || '').trim().slice(0, 1800);
  if (!id) throw new Error('معرّف المنتج مفقود');
  if (text.length < 20) throw new Error('وصف المنتج قصير جدًا');
  const now = new Date().toISOString();
  const model = String(metadata && metadata.model || 'gemini-2.5-flash-lite').trim().slice(0, 120);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query("SELECT data FROM app_documents WHERE collection='affiliateProducts' AND doc_id=$1 FOR UPDATE", [id]);
    const seed = baseProduct && typeof baseProduct === 'object' ? Object.assign({}, baseProduct, { id }) : { id };
    const current = existing.rows[0] && existing.rows[0].data && typeof existing.rows[0].data === 'object' ? Object.assign({}, seed, existing.rows[0].data) : seed;
    const next = Object.assign({}, current, {
      id,
      description: text,
      aiDescription: true,
      descriptionSource: model,
      descriptionUpdatedAt: now,
      updatedAt: now
    });
    await client.query(`
      INSERT INTO app_documents(collection, doc_id, data, updated_at)
      VALUES ('affiliateProducts',$1,$2::jsonb,NOW())
      ON CONFLICT (collection, doc_id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()
    `, [id, JSON.stringify(next)]);
    await client.query('UPDATE products SET description=$2, description_generated=TRUE, description_generated_at=$3, description_model=$4, updated_at=NOW() WHERE external_id=$1', [id, text, now, model]);
    await client.query('COMMIT');
    return Object.assign({ id }, next, { description: text, descriptionUpdatedAt: now, descriptionSource: model, aiDescription: true, metadata: metadata || null });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

async function updateAffiliateProduct(docId, patch) {
  const result = await query(`
    UPDATE app_documents
    SET data=data || $2::jsonb, updated_at=NOW()
    WHERE collection='affiliateProducts' AND doc_id=$1
    RETURNING data
  `, [String(docId), JSON.stringify(patch || {})]);
  return result.rows[0] ? Object.assign({ id: String(docId) }, result.rows[0].data || {}) : null;
}

async function deleteAffiliateProduct(docId) {
  const result = await query("DELETE FROM app_documents WHERE collection='affiliateProducts' AND doc_id=$1", [String(docId)]);
  return result.rowCount > 0;
}

async function upsertAffiliateProducts(products) {
  const rows = Array.isArray(products) ? products : [];
  if (!rows.length) return { inserted: 0, updated: 0 };
  const client = await getPool().connect();
  let inserted = 0;
  let updated = 0;
  try {
    await client.query('BEGIN');
    for (const product of rows) {
      const value = Object.assign({}, product || {});
      const docId = String(value.id || value.external_id || value.externalId || '').trim();
      if (!docId) continue;
      const exists = await client.query("SELECT data FROM app_documents WHERE collection='affiliateProducts' AND doc_id=$1 FOR UPDATE", [docId]);
      const current = exists.rows[0] && exists.rows[0].data && typeof exists.rows[0].data === 'object' ? exists.rows[0].data : {};
      const next = Object.assign({}, current, value);
      if (current.aiDescription === true || (typeof current.descriptionSource === 'string' && current.descriptionSource.startsWith('gemini-'))) {
        next.description = current.description;
        next.aiDescription = true;
        next.descriptionSource = current.descriptionSource || 'gemini-2.5-flash-lite';
        next.descriptionUpdatedAt = current.descriptionUpdatedAt || null;
      }
      if (current.adminPriceLocked === true) {
        next.adminPriceLocked = true;
        next.adminSalePrice = current.adminSalePrice;
        next.adminCommission = current.adminCommission;
        next.adminPriceUpdatedAt = current.adminPriceUpdatedAt;
        next.adminPriceUpdatedBy = current.adminPriceUpdatedBy;
        if (current.adminSalePrice != null) next.price = current.adminSalePrice;
      }
      await client.query(`
        INSERT INTO app_documents(collection, doc_id, data, updated_at)
        VALUES ('affiliateProducts',$1,$2::jsonb,NOW())
        ON CONFLICT (collection, doc_id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()
      `, [docId, JSON.stringify(next)]);
      if (exists.rows[0]) updated++; else inserted++;
    }
    await client.query('COMMIT');
    return { inserted, updated };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
}

async function updateAffiliateWithdrawalStatus(docId, status) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await client.query("SELECT data FROM app_documents WHERE collection='withdrawals' AND doc_id=$1 FOR UPDATE", [String(docId)]);
    if (!result.rows[0]) { await client.query('COMMIT'); return null; }
    const before = result.rows[0].data || {};
    const next = Object.assign({}, before, { status: String(status) });
    const changed = String(before.status || '') !== String(next.status || '');
    await client.query("UPDATE app_documents SET data=$2::jsonb, updated_at=NOW() WHERE collection='withdrawals' AND doc_id=$1", [String(docId), JSON.stringify(next)]);
    let balance = null;
    if (next.userId != null) {
      const userResult = await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [String(next.userId)]);
      if (userResult.rows[0]) {
        const rows = await affiliateRowsForUser(client, next.userId);
        balance = availableBalanceFromRecords(userResult.rows[0], rows.orders, rows.withdrawals);
        await client.query('UPDATE users SET balance=$2, updated_at=NOW() WHERE id=$1', [String(next.userId), balance]);
      }
    }
    await client.query('COMMIT');
    return { withdrawal: Object.assign({ id: String(docId) }, next), balance, changed };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
}

async function getChatMessages(key) {
  const chatKey = String(key || '').trim();
  if (!chatKey) return [];
  const result = await query("SELECT data FROM app_documents WHERE collection='chats' AND doc_id=$1", [chatKey]);
  const messages = result.rows[0] && result.rows[0].data && result.rows[0].data.messages;
  return Array.isArray(messages) ? messages : [];
}

async function appendChatMessage(key, message) {
  const chatKey = String(key || '').trim();
  if (!chatKey) throw new Error('معرّف المحادثة مفقود');
  const value = Object.assign({}, message || {});
  const result = await query(`
    INSERT INTO app_documents(collection,doc_id,data,updated_at)
    VALUES ('chats',$1,jsonb_build_object('messages',jsonb_build_array($2::jsonb)),NOW())
    ON CONFLICT (collection,doc_id) DO UPDATE SET
      data=jsonb_set(COALESCE(app_documents.data,'{}'::jsonb), '{messages}',
        COALESCE(app_documents.data->'messages','[]'::jsonb) || jsonb_build_array($2::jsonb), true),
      updated_at=NOW()
    RETURNING data
  `, [chatKey, JSON.stringify(value)]);
  return result.rows[0] ? result.rows[0].data : null;
}

async function getAiConversation(userId) {
  const key = 'u' + String(userId || '').trim();
  if (key === 'u') return [];
  const result = await query("SELECT data FROM app_documents WHERE collection='aiConversations' AND doc_id=$1", [key]);
  const messages = result.rows[0] && result.rows[0].data && result.rows[0].data.messages;
  return Array.isArray(messages) ? messages.slice(-18) : [];
}

async function saveAiConversation(userId, messages) {
  const key = 'u' + String(userId || '').trim();
  if (key === 'u') throw new Error('معرّف المسوق مفقود');
  const safeMessages = (Array.isArray(messages) ? messages : []).slice(-18).map(item => ({
    role: item && item.role === 'assistant' ? 'assistant' : 'user',
    content: String(item && item.content || '').slice(0, 4000)
  }));
  const result = await query(`
    INSERT INTO app_documents(collection,doc_id,data,updated_at)
    VALUES ('aiConversations',$1,$2::jsonb,NOW())
    ON CONFLICT (collection,doc_id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()
    RETURNING data
  `, [key, JSON.stringify({ messages: safeMessages })]);
  return result.rows[0] ? result.rows[0].data : { messages: safeMessages };
}

async function clearAiConversation(userId) {
  const key = 'u' + String(userId || '').trim();
  if (key === 'u') return false;
  const result = await query("DELETE FROM app_documents WHERE collection='aiConversations' AND doc_id=$1", [key]);
  return result.rowCount > 0;
}

async function updateAffiliateMeta(patch) {
  const value = patch && typeof patch === 'object' ? patch : {};
  const result = await query(`
    INSERT INTO app_documents(collection,doc_id,data,updated_at)
    VALUES ('affiliateMeta','main',$1::jsonb,NOW())
    ON CONFLICT (collection,doc_id) DO UPDATE SET data=app_documents.data || EXCLUDED.data, updated_at=NOW()
    RETURNING data
  `, [JSON.stringify(value)]);
  return result.rows[0] ? result.rows[0].data : {};
}

async function recordAdminUserAction(targetUserId, adminUserId, action, reason = '', metadata = {}) {
  await query(`INSERT INTO admin_user_actions(target_user_id,admin_user_id,action,reason,metadata)
    VALUES ($1,$2,$3,$4,$5::jsonb)`, [targetUserId == null ? null : String(targetUserId), adminUserId == null ? null : String(adminUserId), String(action || 'unknown').slice(0, 80), String(reason || '').slice(0, 500), JSON.stringify(metadata || {})]);
}

function normalizeAdminEmail(value) { return String(value || '').trim().toLowerCase(); }
function validateAdminPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}
function userAccountReturning() {
  return `id,email,name,created_at,updated_at,email_verified,last_login,balance,welcome_bonus_granted,manual_credits,total_earned,sales_count,sales,role,permissions,banned,suspended_until,ban_reason,password_changed_at`;
}

async function createAdminUser(input, adminUserId) {
  const body = input && typeof input === 'object' ? input : {};
  const name = String(body.name || '').trim();
  const email = normalizeAdminEmail(body.email);
  const password = body.password;
  if (name.length < 2 || name.length > 100) { const e = new Error('اكتب اسم المستخدم بشكل صحيح'); e.code = 'INVALID_USER_NAME'; throw e; }
  if (!/^\S+@\S+\.\S+$/.test(email)) { const e = new Error('اكتب بريدًا إلكترونيًا صحيحًا'); e.code = 'INVALID_USER_EMAIL'; throw e; }
  if (!validateAdminPassword(password)) { const e = new Error('كلمة المرور يجب أن تكون بين 8 و128 حرفًا'); e.code = 'INVALID_USER_PASSWORD'; throw e; }
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const result = await query(`INSERT INTO users(name,email,password_hash,email_verified,balance,welcome_bonus_granted)
      VALUES ($1,$2,$3,$4,70.00,TRUE) RETURNING ${userAccountReturning()}`, [name, email, passwordHash, body.emailVerified === true]);
    const user = result.rows[0];
    await recordAdminUserAction(user.id, adminUserId, 'create', 'إنشاء حساب بواسطة الأدمن');
    return user;
  } catch (error) {
    if (error && error.code === '23505') { const e = new Error('هذا البريد مستخدم بالفعل'); e.code = 'DUPLICATE_USER_EMAIL'; throw e; }
    throw error;
  }
}

async function updateAdminUser(userId, patch, adminUserId) {
  const id = String(userId || '').trim();
  const current = await query(`SELECT name,email,email_verified FROM users WHERE id=$1`, [id]);
  if (!current.rows[0]) return null;
  const body = patch && typeof patch === 'object' ? patch : {};
  const name = body.name == null ? current.rows[0].name : String(body.name).trim();
  const email = body.email == null ? current.rows[0].email : normalizeAdminEmail(body.email);
  const verified = body.emailVerified == null ? current.rows[0].email_verified : body.emailVerified === true;
  if (name.length < 2 || name.length > 100) { const e = new Error('اكتب اسم المستخدم بشكل صحيح'); e.code = 'INVALID_USER_NAME'; throw e; }
  if (!/^\S+@\S+\.\S+$/.test(email)) { const e = new Error('اكتب بريدًا إلكترونيًا صحيحًا'); e.code = 'INVALID_USER_EMAIL'; throw e; }
  try {
    const result = await query(`UPDATE users SET name=$2,email=$3,email_verified=$4,updated_at=NOW()
      WHERE id=$1 RETURNING ${userAccountReturning()}`, [id, name, email, verified]);
    const user = result.rows[0] || null;
    if (user) await recordAdminUserAction(id, adminUserId, 'update_profile', 'تعديل بيانات الحساب');
    return user;
  } catch (error) {
    if (error && error.code === '23505') { const e = new Error('هذا البريد مستخدم بالفعل'); e.code = 'DUPLICATE_USER_EMAIL'; throw e; }
    throw error;
  }
}

async function resetAdminUserPassword(userId, password, adminUserId) {
  if (!validateAdminPassword(password)) { const e = new Error('كلمة المرور يجب أن تكون بين 8 و128 حرفًا'); e.code = 'INVALID_USER_PASSWORD'; throw e; }
  const hash = await bcrypt.hash(password, 12);
  const result = await query(`UPDATE users SET password_hash=$2,password_changed_at=NOW(),updated_at=NOW()
    WHERE id=$1 RETURNING ${userAccountReturning()}`, [String(userId), hash]);
  if (!result.rows[0]) return null;
  await query('DELETE FROM auth_sessions WHERE user_id=$1', [String(userId)]);
  await recordAdminUserAction(userId, adminUserId, 'reset_password', 'إعادة تعيين كلمة المرور بواسطة الأدمن', { sessionsRevoked: true });
  return result.rows[0];
}

async function setUserAccessState(userId, state, adminUserId) {
  const body = state && typeof state === 'object' ? state : {};
  const mode = String(body.mode || '').trim().toLowerCase();
  const reason = String(body.reason || '').trim().slice(0, 500);
  let banned = false;
  let suspendedUntil = null;
  let action = 'restore_access';
  if (mode === 'permanent') { banned = true; action = 'ban_permanent'; }
  else if (mode === 'temporary') {
    const until = new Date(body.until);
    if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) { const e = new Error('حدد وقتًا مستقبليًا للحظر المؤقت'); e.code = 'INVALID_SUSPENSION_DATE'; throw e; }
    suspendedUntil = until.toISOString(); action = 'ban_temporary';
  } else if (mode !== 'active') { const e = new Error('حالة الحساب غير صحيحة'); e.code = 'INVALID_ACCESS_STATE'; throw e; }
  const result = await query(`UPDATE users SET banned=$2,suspended_until=$3,ban_reason=$4,updated_at=NOW()
    WHERE id=$1 RETURNING ${userAccountReturning()}`, [String(userId), banned, suspendedUntil, reason]);
  if (!result.rows[0]) return null;
  if (banned || suspendedUntil) await query('DELETE FROM auth_sessions WHERE user_id=$1', [String(userId)]);
  await recordAdminUserAction(userId, adminUserId, action, reason, { until: suspendedUntil });
  return result.rows[0];
}

async function updateUserAdminFields(userId, patch) {
  const role = String(patch && patch.role || 'user').trim().toLowerCase();
  const permissions = Array.isArray(patch && patch.permissions) ? patch.permissions : [];
  const banned = Boolean(patch && patch.banned);
  const result = await query(`
    UPDATE users SET role=$2, permissions=$3::jsonb, banned=$4, updated_at=NOW()
    WHERE id=$1
    RETURNING ${userAccountReturning()}
  `, [String(userId), role, JSON.stringify(permissions), banned]);
  return result.rows[0] || null;
}

async function updateUserBanned(userId, banned) {
  return setUserAccessState(userId, Boolean(banned) ? { mode: 'permanent', reason: 'حظر من لوحة الإدارة' } : { mode: 'active', reason: '' }, null);
}

async function listAdminUserActions(userId, limit = 50) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const params = [safeLimit];
  let where = '';
  if (userId != null && String(userId).trim()) { params.unshift(String(userId).trim()); where = 'WHERE target_user_id=$1'; }
  const limitParam = '$' + params.length;
  const result = await query(`SELECT id,target_user_id,admin_user_id,action,reason,metadata,created_at FROM admin_user_actions ${where} ORDER BY created_at DESC,id DESC LIMIT ${limitParam}`, params);
  return result.rows;
}

function rewardInput(input) {
  const value = input && typeof input === 'object' ? input : {};
  const rewardKey = String(value.rewardKey || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
  const title = String(value.title || '').replace(/[\u0000]/g, '').trim().slice(0, 180);
  const note = String(value.note || '').replace(/[\u0000]/g, '').trim().slice(0, 500);
  const amount = Math.round(Number(value.amount) * 100) / 100;
  const audience = ['one', 'group', 'all'].includes(String(value.audience || '')) ? String(value.audience) : 'all';
  const conditions = value.conditions && typeof value.conditions === 'object' ? value.conditions : {};
  const minSales = Math.max(0, Math.floor(Number(conditions.minSales) || 0));
  const minEarned = Math.max(0, Math.round(Number(conditions.minEarned || 0) * 100) / 100);
  const verifiedOnly = conditions.verifiedOnly === true || conditions.verifiedOnly === 'true';
  const activeOnly = conditions.activeOnly !== false && conditions.activeOnly !== 'false';
  const userIds = [...new Set((Array.isArray(value.userIds) ? value.userIds : [value.userId]).map(id => String(id || '').trim()).filter(id => /^\d+$/.test(id)))].slice(0, 5000);
  if (!rewardKey) throw new Error('مفتاح المكافأة مطلوب');
  if (!title) throw new Error('عنوان المكافأة مطلوب');
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) throw new Error('قيمة المكافأة غير صحيحة');
  if (audience === 'one' && userIds.length !== 1) throw new Error('اختر مستخدمًا واحدًا للمكافأة الفردية');
  if (audience === 'group' && !userIds.length) throw new Error('اختر مستخدمين للمكافأة الجماعية');
  return { rewardKey, title, note, amount, audience, conditions: { minSales, minEarned, verifiedOnly, activeOnly }, userIds };
}

async function grantAffiliateReward(input, createdBy) {
  const value = rewardInput(input);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const rewardResult = await client.query(`
      INSERT INTO affiliate_rewards(reward_key,title,note,amount,audience,conditions,created_by)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
      ON CONFLICT (reward_key) DO NOTHING
      RETURNING id,reward_key,title,note,amount,audience,conditions,created_by,created_at
    `, [value.rewardKey, value.title, value.note, value.amount, value.audience, JSON.stringify(value.conditions), createdBy == null ? null : String(createdBy)]);
    if (!rewardResult.rows[0]) {
      await client.query('ROLLBACK');
      const existing = await query(`SELECT r.id,r.reward_key,r.title,r.note,r.amount,r.audience,r.conditions,r.created_by,r.created_at,COUNT(g.id)::int AS grant_count,COALESCE(SUM(g.amount),0)::numeric AS total_granted FROM affiliate_rewards r LEFT JOIN affiliate_reward_grants g ON g.reward_id=r.id WHERE r.reward_key=$1 GROUP BY r.id`, [value.rewardKey]);
      return { duplicate: true, reward: existing.rows[0] || null, granted: 0, userIds: [] };
    }
    const reward = rewardResult.rows[0];
    const params = [String(reward.id), value.amount];
    const where = ['u.banned IS NOT TRUE'];
    if (value.audience === 'one' || value.audience === 'group') { params.push(value.userIds); where.push(`u.id = ANY($${params.length}::bigint[])`); }
    if (value.conditions.minSales > 0) { params.push(value.conditions.minSales); where.push(`COALESCE(u.sales_count,0) >= $${params.length}`); }
    if (value.conditions.minEarned > 0) { params.push(value.conditions.minEarned); where.push(`COALESCE(u.total_earned,0) >= $${params.length}`); }
    if (value.conditions.verifiedOnly) where.push('u.email_verified IS TRUE');
    if (value.conditions.activeOnly) where.push('u.last_login IS NOT NULL');
    const grants = await client.query(`
      INSERT INTO affiliate_reward_grants(reward_id,user_id,amount)
      SELECT $1::bigint,u.id,$2::numeric FROM users u WHERE ${where.join(' AND ')}
      ON CONFLICT (reward_id,user_id) DO NOTHING
      RETURNING user_id,amount
    `, params);
    if (!grants.rowCount) { await client.query('ROLLBACK'); const error = new Error('لا يوجد مستخدم مؤهل لهذه المكافأة'); error.code = 'NO_ELIGIBLE_USERS'; throw error; }
    const grantedIds = grants.rows.map(row => String(row.user_id));
    await client.query('UPDATE users SET manual_credits=COALESCE(manual_credits,0)+$2::numeric, updated_at=NOW() WHERE id=ANY($1::bigint[])', [grantedIds, value.amount]);
    const notificationTitle = 'تمت إضافة مكافأة إلى رصيدك';
    const notificationBody = value.note ? value.note + ' — قيمة المكافأة: ' + value.amount + ' ج.م' : 'أضافت الإدارة مكافأة بقيمة ' + value.amount + ' ج.م إلى رصيدك.';
    const notificationResult = await client.query(`
      INSERT INTO notifications(user_id,title,body,type,url,payload,event_key)
      SELECT u.id,$2,$3,'reward','/store',jsonb_build_object('rewardKey',$4,'amount',$5::numeric),$6 || ':' || u.id::text
      FROM users u WHERE u.id=ANY($1::bigint[])
      ON CONFLICT (user_id,event_key) WHERE event_key IS NOT NULL DO NOTHING
      RETURNING id,user_id,title,body,type,url,payload,event_key,read_at,created_at
    `, [grantedIds, notificationTitle, notificationBody, value.rewardKey, value.amount, 'reward:' + value.rewardKey]);
    await client.query('COMMIT');
    return { duplicate: false, reward: Object.assign({}, reward, { grant_count: grants.rowCount, total_granted: value.amount * grants.rowCount }), granted: grants.rowCount, userIds: grantedIds, notifications: notificationResult.rows.map(notificationRow), notificationTitle, notificationBody };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
}

async function listAffiliateRewards(limit = 100) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
  const result = await query(`SELECT r.id,r.reward_key,r.title,r.note,r.amount,r.audience,r.conditions,r.created_by,r.created_at,COUNT(g.id)::int AS grant_count,COALESCE(SUM(g.amount),0)::numeric AS total_granted FROM affiliate_rewards r LEFT JOIN affiliate_reward_grants g ON g.reward_id=r.id GROUP BY r.id ORDER BY r.created_at DESC,r.id DESC LIMIT $1`, [safeLimit]);
  return result.rows;
}

async function deleteNotificationById(notificationId) {
  const result = await query('DELETE FROM notifications WHERE id=$1 RETURNING id,user_id', [String(notificationId || '')]);
  return result.rows[0] || null;
}

async function deleteAllNotifications() {
  const result = await query('DELETE FROM notifications');
  return result.rowCount || 0;
}

function notificationRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    userId: row.user_id == null ? null : String(row.user_id),
    title: String(row.title || ''),
    body: String(row.body || ''),
    type: String(row.type || 'info'),
    url: String(row.url || '/store'),
    payload: row.payload && typeof row.payload === 'object' ? row.payload : {},
    eventKey: row.event_key || null,
    readAt: row.read_at || null,
    createdAt: row.created_at || null
  };
}

function notificationInput(input) {
  const value = input && typeof input === 'object' ? input : {};
  const title = String(value.title || '').replace(/[\u0000]/g, '').trim().slice(0, 180);
  const body = String(value.body || '').replace(/[\u0000]/g, '').trim().slice(0, 2000);
  const type = String(value.type || 'info').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'info';
  const url = String(value.url || '/store').trim().slice(0, 500) || '/store';
  const eventKey = value.eventKey == null ? null : String(value.eventKey).replace(/[\u0000]/g, '').trim().slice(0, 240) || null;
  if (!title) throw new Error('عنوان الإشعار مطلوب');
  return { title, body, type, url, eventKey, payload: value.payload && typeof value.payload === 'object' ? value.payload : {} };
}

async function createNotification(input) {
  const value = notificationInput(input);
  const userId = String(input && input.userId || '').trim();
  if (!userId) throw new Error('المستخدم المستهدف مطلوب');
  const result = await query(`
    INSERT INTO notifications(user_id,title,body,type,url,payload,event_key)
    VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
    ON CONFLICT (user_id,event_key) WHERE event_key IS NOT NULL DO NOTHING
    RETURNING *
  `, [userId, value.title, value.body, value.type, value.url, JSON.stringify(value.payload), value.eventKey]);
  if (result.rows[0]) return { created: true, notification: notificationRow(result.rows[0]) };
  if (value.eventKey) {
    const existing = await query('SELECT * FROM notifications WHERE user_id=$1 AND event_key=$2 LIMIT 1', [userId, value.eventKey]);
    if (existing.rows[0]) return { created: false, notification: notificationRow(existing.rows[0]) };
  }
  return { created: false, notification: null };
}

async function createBroadcastNotifications(input) {
  const value = notificationInput(input);
  const eventKey = value.eventKey || ('broadcast-' + crypto.randomUUID());
  const result = await query(`
    INSERT INTO notifications(user_id,title,body,type,url,payload,event_key)
    SELECT id,$1,$2,$3,$4,$5::jsonb,$6 || ':' || id::text
    FROM users
    WHERE banned IS NOT TRUE
    ON CONFLICT (user_id,event_key) WHERE event_key IS NOT NULL DO NOTHING
    RETURNING id,user_id,title,body,type,url,payload,event_key,read_at,created_at
  `, [value.title, value.body, value.type, value.url, JSON.stringify(value.payload), eventKey]);
  return { created: result.rowCount || 0, notifications: result.rows.map(notificationRow), eventKey };
}

async function listNotifications(userId, options) {
  const id = String(userId || '').trim();
  if (!id) return [];
  const opts = options && typeof options === 'object' ? options : {};
  const limit = Math.max(1, Math.min(50, Number(opts.limit) || 20));
  const beforeId = String(opts.beforeId || '').trim();
  const result = await query(`
    SELECT * FROM notifications
    WHERE user_id=$1 ${beforeId ? 'AND id < $2' : ''}
    ORDER BY created_at DESC, id DESC
    LIMIT ${beforeId ? '$3' : '$2'}
  `, beforeId ? [id, beforeId, limit] : [id, limit]);
  return result.rows.map(notificationRow);
}

async function listRecentNotifications(limit = 100) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
  const result = await query(`SELECT id,user_id,title,body,type,url,payload,event_key,read_at,created_at FROM notifications ORDER BY created_at DESC,id DESC LIMIT $1`, [safeLimit]);
  return result.rows.map(notificationRow);
}

async function countUnreadNotifications(userId) {
  const id = String(userId || '').trim();
  if (!id) return 0;
  const result = await query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND read_at IS NULL', [id]);
  return Number(result.rows[0] && result.rows[0].count || 0);
}

async function markNotificationRead(userId, notificationId) {
  const result = await query('UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=$1 AND user_id=$2 RETURNING *', [String(notificationId || ''), String(userId || '')]);
  return result.rows[0] ? notificationRow(result.rows[0]) : null;
}

async function markAllNotificationsRead(userId) {
  const result = await query('UPDATE notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL', [String(userId || '')]);
  return result.rowCount || 0;
}

async function upsertPushSubscription(userId, subscription) {
  const value = subscription && typeof subscription === 'object' ? subscription : {};
  const endpoint = String(value.endpoint || '').trim();
  const keys = value.keys && typeof value.keys === 'object' ? value.keys : {};
  const p256dh = String(keys.p256dh || '').trim();
  const auth = String(keys.auth || '').trim();
  if (!endpoint || endpoint.length > 2000 || !p256dh || !auth) throw new Error('اشتراك الإشعارات غير مكتمل');
  const expiration = value.expirationTime == null ? null : Number(value.expirationTime);
  const result = await query(`
    INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth,expiration_time,updated_at)
    VALUES ($1,$2,$3,$4,$5,NOW())
    ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,expiration_time=EXCLUDED.expiration_time,updated_at=NOW(),failure_count=0
    RETURNING id,user_id,endpoint,expiration_time,created_at,updated_at,last_success_at,failure_count
  `, [String(userId || ''), endpoint, p256dh, auth, Number.isFinite(expiration) ? Math.floor(expiration) : null]);
  return result.rows[0] || null;
}

async function listPushSubscriptions(userId) {
  const result = await query('SELECT id,user_id,endpoint,p256dh,auth,expiration_time,created_at,updated_at,last_success_at,failure_count FROM push_subscriptions WHERE user_id=$1 ORDER BY updated_at DESC', [String(userId || '')]);
  return result.rows;
}

async function listPushSubscriptionsForUsers(userIds) {
  const ids = (Array.isArray(userIds) ? userIds : []).map(value => String(value || '').trim()).filter(Boolean).slice(0, 5000);
  if (!ids.length) return [];
  const result = await query('SELECT id,user_id,endpoint,p256dh,auth,expiration_time,created_at,updated_at,last_success_at,failure_count FROM push_subscriptions WHERE user_id = ANY($1::bigint[])', [ids]);
  return result.rows;
}

async function deletePushSubscription(userId, endpoint) {
  const result = await query('DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2', [String(userId || ''), String(endpoint || '').trim()]);
  return (result.rowCount || 0) > 0;
}

async function markPushSuccess(endpoint) {
  await query('UPDATE push_subscriptions SET last_success_at=NOW(), failure_count=0, updated_at=NOW() WHERE endpoint=$1', [String(endpoint || '')]);
}

async function markPushFailure(endpoint, remove) {
  if (remove) await query('DELETE FROM push_subscriptions WHERE endpoint=$1', [String(endpoint || '')]);
  else await query('UPDATE push_subscriptions SET failure_count=failure_count+1, updated_at=NOW() WHERE endpoint=$1', [String(endpoint || '')]);
}

async function recordAffiliateOrderAttempt(input) {
  const value = input && typeof input === 'object' ? input : {};
  const requestKey = String(value.requestKey || '').trim();
  const attemptNumber = Math.max(1, Number(value.attemptNumber) || 1);
  const requestStatus = String(value.requestStatus || 'processing').trim().slice(0, 40) || 'processing';
  if (!requestKey) return null;
  const httpStatus = Number.isInteger(Number(value.httpStatus)) ? Number(value.httpStatus) : null;
  const responseTimeMs = Number.isFinite(Number(value.responseTimeMs)) ? Math.max(0, Math.min(3600000, Math.round(Number(value.responseTimeMs)))) : null;
  const supplierStatus = value.supplierStatus == null ? null : String(value.supplierStatus).slice(0, 120);
  const errorMessage = value.errorMessage == null ? null : String(value.errorMessage).replace(/[\u0000]/g, '').slice(0, 500);
  const nextAttemptAt = value.nextAttemptAt || null;
  const result = await query(`
    INSERT INTO affiliate_order_attempts(request_key,order_id,attempt_number,request_status,http_status,response_time_ms,supplier_status,error_message,next_attempt_at,supplier_contacted)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (request_key,attempt_number) DO UPDATE SET
      request_status=EXCLUDED.request_status,http_status=EXCLUDED.http_status,response_time_ms=EXCLUDED.response_time_ms,
      supplier_status=EXCLUDED.supplier_status,error_message=EXCLUDED.error_message,next_attempt_at=EXCLUDED.next_attempt_at,
      supplier_contacted=EXCLUDED.supplier_contacted
    RETURNING *
  `, [requestKey, value.orderId == null ? null : String(value.orderId), attemptNumber, requestStatus, httpStatus, responseTimeMs, supplierStatus, errorMessage, nextAttemptAt, value.supplierContacted == null ? null : Boolean(value.supplierContacted)]);
  return result.rows[0] || null;
}

async function listAffiliateOrderAttempts(userId, orderId, limit = 50) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
  const result = await query(`
    SELECT a.* FROM affiliate_order_attempts a
    JOIN affiliate_order_requests r ON r.request_key=a.request_key
    WHERE r.user_id=$1 AND (a.order_id=$2 OR r.order_id=$2)
    ORDER BY a.attempt_number DESC, a.created_at DESC LIMIT $3
  `, [String(userId || ''), String(orderId || ''), safeLimit]);
  return result.rows;
}

async function listAffiliateOrderAttemptsForAdmin(orderId, limit = 100) {
  const safeOrderId = String(orderId || '').trim();
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 100));
  if (!safeOrderId) return [];
  const result = await query(`
    SELECT a.request_key, a.order_id, a.attempt_number, a.request_status, a.http_status,
           a.response_time_ms, a.supplier_status, a.error_message, a.next_attempt_at, a.supplier_contacted, a.created_at
    FROM affiliate_order_attempts a
    JOIN affiliate_order_requests r ON r.request_key=a.request_key
    WHERE r.order_id=$1 OR a.order_id=$1
    ORDER BY a.attempt_number DESC, a.created_at DESC
    LIMIT $2
  `, [safeOrderId, safeLimit]);
  return result.rows;
}

async function retryAffiliateOrderRequest(orderId, adminId, reason) {
  const safeOrderId = String(orderId || '').trim();
  const safeAdminId = String(adminId || '').trim().slice(0, 120);
  const safeReason = String(reason || '').trim().slice(0, 500);
  if (!safeOrderId) { const error = new Error('رقم الطلب مطلوب'); error.code = 'ORDER_NOT_FOUND'; throw error; }
  if (safeReason.length < 3) { const error = new Error('سبب إعادة المحاولة مطلوب'); error.code = 'INVALID_RETRY_REASON'; throw error; }
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT * FROM affiliate_order_requests WHERE order_id=$1 FOR UPDATE', [safeOrderId]);
    const row = found.rows[0];
    if (!row) { const error = new Error('الطلب غير موجود في قائمة الإرسال'); error.code = 'ORDER_NOT_FOUND'; throw error; }
    if (String(row.status || '') !== 'failed') { const error = new Error('إعادة المحاولة متاحة للطلبات الفاشلة فقط؛ الطلبات غير المؤكدة تحتاج مراجعة'); error.code = 'ORDER_NOT_RETRYABLE'; throw error; }
    const response = row.supplier_response && typeof row.supplier_response === 'object' ? row.supplier_response : {};
    const nested = [response, response.data, response.order].filter(value => value && typeof value === 'object');
    const hasSupplierAcknowledgement = Boolean(row.supplier_order_id || nested.some(value => value.id || value._id || value.serial || value.serial_number || value.supplier_order_id));
    if (hasSupplierAcknowledgement) { const error = new Error('لا يمكن إعادة إرسال طلب له إقرار أو معرّف من المورد'); error.code = 'ORDER_RETRY_UNSAFE'; throw error; }
    const updated = await client.query(`
      UPDATE affiliate_order_requests
      SET status='pending', next_attempt_at=NOW(), lease_expires_at=NULL, failure_reason=NULL,
          last_manual_retry_at=NOW(), last_manual_retry_by=$2, manual_retry_reason=$3, updated_at=NOW()
      WHERE request_key=$1
      RETURNING request_key, order_id, status, retry_count, next_attempt_at, last_manual_retry_at, last_manual_retry_by, manual_retry_reason
    `, [String(row.request_key), safeAdminId || null, safeReason]);
    await client.query(`
      UPDATE app_documents
      SET data = data || jsonb_build_object(
        'status','جاري تجهيز الطلب','requestStatus','pending','failureReason',NULL,
        'manualRetryAt',NOW()::text
      ), updated_at=NOW()
      WHERE collection='orders' AND doc_id=$1
    `, [safeOrderId]);
    await client.query('COMMIT');
    return updated.rows[0] || null;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
}

async function listSafkaOrderWebhookReviews(limit = 50) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const result = await query(`
    SELECT event_key, supplier_order_id, supplier_serial, supplier_status, previous_status,
           matched, review_required, received_at, processed_at, last_error
    FROM affiliate_order_webhook_events
    WHERE review_required=TRUE
    ORDER BY received_at DESC
    LIMIT $1
  `, [safeLimit]);
  return result.rows || [];
}

async function reviewAffiliateOrderRequest(orderId, adminId, decision, supplierOrderId, reason) {
  const safeOrderId = String(orderId || '').trim();
  const safeAdminId = String(adminId || '').trim().slice(0, 120);
  const safeDecision = String(decision || '').trim().toLowerCase();
  const safeSupplierOrderId = String(supplierOrderId || '').trim().slice(0, 180);
  const safeReason = String(reason || '').replace(/[\u0000]/g, '').trim().slice(0, 500);
  if (!safeOrderId) { const error = new Error('رقم الطلب مطلوب'); error.code = 'ORDER_NOT_FOUND'; throw error; }
  if (!['supplier_received', 'supplier_not_found'].includes(safeDecision)) { const error = new Error('قرار المراجعة غير صحيح'); error.code = 'INVALID_REVIEW_DECISION'; throw error; }
  if (safeDecision === 'supplier_received' && safeSupplierOrderId.length < 3) { const error = new Error('معرّف الطلب عند المورد مطلوب'); error.code = 'SUPPLIER_ORDER_ID_REQUIRED'; throw error; }
  if (safeReason.length < 3) { const error = new Error('سبب المراجعة مطلوب'); error.code = 'INVALID_REVIEW_REASON'; throw error; }
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT * FROM affiliate_order_requests WHERE order_id=$1 FOR UPDATE', [safeOrderId]);
    const row = found.rows[0];
    if (!row) { const error = new Error('الطلب غير موجود في قائمة الإرسال'); error.code = 'ORDER_NOT_FOUND'; throw error; }
    if (String(row.status || '') !== 'unknown') { const error = new Error('المراجعة اليدوية متاحة فقط للطلبات غير المحسومة'); error.code = 'ORDER_NOT_REVIEWABLE'; throw error; }
    const reviewAt = new Date().toISOString();
    const isReceived = safeDecision === 'supplier_received';
    const queueStatus = isReceived ? 'accepted' : 'failed';
    const failureReason = isReceived ? null : 'تم التحقق يدويًا من عدم إنشاء الطلب عند المورد؛ يلزم إجراء إعادة تجهيز منفصل';
    const supplierResponse = Object.assign({}, row.supplier_response && typeof row.supplier_response === 'object' ? row.supplier_response : {}, {
      manualReview: { decision: safeDecision, reason: safeReason, reviewedAt: reviewAt, reviewedBy: safeAdminId || null, supplierOrderId: isReceived ? safeSupplierOrderId : null }
    });
    const updated = await client.query(`
      UPDATE affiliate_order_requests
      SET status=$2, supplier_order_id=CASE WHEN $3 THEN $4 ELSE supplier_order_id END,
          supplier_response=$5::jsonb, failure_reason=$6, next_attempt_at=NULL, lease_expires_at=NULL,
          manual_review_decision=$7, manual_review_at=NOW(), manual_review_by=$8, manual_review_reason=$9, updated_at=NOW()
      WHERE request_key=$1
      RETURNING request_key, order_id, status, supplier_order_id, failure_reason, retry_count,
                manual_review_decision, manual_review_at, manual_review_by, manual_review_reason
    `, [String(row.request_key), queueStatus, isReceived, isReceived ? safeSupplierOrderId : null, JSON.stringify(supplierResponse), failureReason, safeDecision, safeAdminId || null, safeReason]);
    await client.query(`
      UPDATE app_documents
      SET data = data || $2::jsonb, updated_at=NOW()
      WHERE collection='orders' AND doc_id=$1
    `, [safeOrderId, JSON.stringify(Object.assign({
      status: isReceived ? 'قيد التأكيد' : 'فشل',
      requestStatus: queueStatus,
      failureReason,
      manualReviewDecision: safeDecision,
      manualReviewAt: reviewAt,
      manualReviewBy: safeAdminId || null,
      manualReviewReason: safeReason
    }, isReceived ? { externalId: safeSupplierOrderId, supplierOrderId: safeSupplierOrderId } : {}))]);
    await client.query('COMMIT');
    return updated.rows[0] || null;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
}

function webhookStatusDisplay(rawStatus) {
  const value = String(rawStatus || '').trim().toLowerCase();
  const map = {
    pending: 'قيد التأكيد', accepted: 'قيد التأكيد', confirmed: 'تم التأكيد', processing: 'جاري التجهيز', preparing: 'جاري التجهيز', printing: 'جاري التجهيز', shipped: 'تم الشحن', out_for_delivery: 'تم الشحن', available: 'تم التوصيل', delivered: 'تم التسليم', completed: 'تم التسليم', collected: 'تم التحصيل',
    skip: 'جارٍ الاسترجاع', holding: 'مؤجل', ask_to_exchange: 'طلب استبدال', returned_exchange: 'مرتجع استبدال', ask_to_return: 'طلب استرجاع',
    returned: 'مرتجع', returned1: 'مرتجع', returned2: 'مرتجع بعد التسليم', declined: 'ملغي', declined1: 'ملغي', declined2: 'ملغي بعد التجهيز', canceled: 'ملغي', cancelled: 'ملغي', rejected: 'مرفوض', failed: 'فشل',
    'معلق': 'قيد التأكيد', 'جار التحضير': 'جاري التجهيز', 'جار الطباعة': 'جاري التجهيز', 'في الشحن': 'تم الشحن', 'تم التوصيل': 'تم التوصيل', 'تم التحصيل': 'تم التحصيل', 'جار الاسترجاع': 'جارٍ الاسترجاع', 'طلب العميل الإستبدال': 'طلب استبدال', 'مرتجع الإستبدال': 'مرتجع استبدال', 'طلب العميل الإسترجاع': 'طلب استرجاع', 'مرتجع': 'مرتجع', 'مرتجع بعد التسليم': 'مرتجع بعد التسليم', 'ملغي': 'ملغي', 'ملغي بعد التحضير': 'ملغي بعد التجهيز'
  };
  return map[value] || String(rawStatus || 'قيد المتابعة');
}
function webhookShipmentFields(input, order) {
  const root = input && typeof input === 'object' ? input : {};
  const candidates = [
    order,
    order && order.shipment,
    order && order.shipping,
    root.shipment,
    root.shipping,
    root.data && root.data.shipment,
    root.data && root.data.shipping,
    root.order && root.order.shipment,
    root.order && root.order.shipping
  ].filter(value => value && typeof value === 'object');
  const first = keys => {
    for (const source of candidates) {
      for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
      }
    }
    return '';
  };
  return {
    trackingNumber: first(['tracking_number', 'trackingNumber', 'tracking_no', 'trackingNo', 'waybill', 'awb', 'shipment_id', 'shipmentId']),
    carrier: first(['carrier', 'courier', 'shipping_company', 'shippingCompany', 'delivery_company', 'deliveryCompany'])
  };
}

async function applySafkaOrderWebhook(input) {
  const value = input && typeof input === 'object' ? input : {};
  const order = value.order && typeof value.order === 'object' ? value.order : value;
  const supplierOrderId = String(order._id || order.id || '').trim();
  const supplierSerial = String(order.serial_number || order.serial || '').trim();
  const rawStatus = String(order.status || order.order_status || order.status_ar || '').trim();
  const rawStatusAr = String(order.status_ar || '').trim();
  const previousStatus = String(order.previous_status || order.previous_status_ar || '').trim();
  const shipment = webhookShipmentFields(value, order);
  if (!supplierOrderId || !rawStatus) { const error = new Error('بيانات webhook غير مكتملة'); error.code = 'INVALID_SUPPLIER_WEBHOOK'; throw error; }
  const explicitEventId = String(value.event_id || value.eventId || '').trim();
  const eventKey = ('safka:' + (explicitEventId || crypto.createHash('sha256').update(JSON.stringify({ supplierOrderId, supplierSerial, rawStatus, previousStatus, updatedAt: order.updated_at || '' })).digest('hex'))).slice(0, 240);
  const client = await getPool().connect();
  let matched = null;
  try {
    await client.query('BEGIN');
    const inserted = await client.query(`
      INSERT INTO affiliate_order_webhook_events(event_key,supplier_order_id,supplier_serial,supplier_status,previous_status)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT (event_key) DO NOTHING RETURNING event_key
    `, [eventKey, supplierOrderId, supplierSerial || null, rawStatus.slice(0, 120), previousStatus.slice(0, 120) || null]);
    if (!inserted.rows[0]) {
      await client.query('ROLLBACK');
      return { duplicate: true, eventKey, supplierOrderId, status: rawStatus };
    }
    const found = await client.query(`
      SELECT r.*, d.data AS order_data
      FROM affiliate_order_requests r
      LEFT JOIN app_documents d ON d.collection='orders' AND d.doc_id=r.order_id
      WHERE r.supplier_order_id=$1
         OR d.data->>'externalId'=$1
         OR d.data->>'supplierOrderId'=$1
         OR ($2 <> '' AND d.data->>'serial'=$2)
      ORDER BY r.updated_at DESC
      LIMIT 1 FOR UPDATE OF r
    `, [supplierOrderId, supplierSerial]);
    matched = found.rows[0] || null;
    if (!matched || !matched.order_id) {
      await client.query(`UPDATE affiliate_order_webhook_events SET review_required=TRUE, processed_at=NOW(), last_error=$2 WHERE event_key=$1`, [eventKey, 'وصل تحديث من المورد ولم يمكن ربطه بطلب محلي؛ مطلوب مراجعة يدوية']);
      await client.query('COMMIT');
      return { duplicate: false, matched: false, reviewRequired: true, eventKey, supplierOrderId, status: rawStatus };
    }
    const displayStatus = webhookStatusDisplay(rawStatusAr || rawStatus);
    const cancellationProtected = ['cancel_requested', 'cancelled'].includes(String(matched.status || '').toLowerCase()) || ['cancel_requested', 'cancelled'].includes(String(matched.order_data && matched.order_data.requestStatus || '').toLowerCase());
    const responsePatch = { event: value.event || 'order.status.updated', order: { _id: supplierOrderId, serial_number: supplierSerial || null, status: rawStatus, status_ar: rawStatusAr || null, previous_status: previousStatus || null, updated_at: order.updated_at || null, tracking_number: shipment.trackingNumber || null, carrier: shipment.carrier || null } };
    await client.query(`
      UPDATE affiliate_order_requests
      SET status=CASE WHEN status IN ('cancel_requested','cancelled') THEN status ELSE 'accepted' END,
          supplier_order_id=COALESCE(supplier_order_id,$2), supplier_response=supplier_response || $3::jsonb,
          failure_reason=NULL, next_attempt_at=NULL, lease_expires_at=NULL,
          manual_review_decision='supplier_received', manual_review_at=NOW(), manual_review_by='safka-order-hook', manual_review_reason='وصل تحديث رسمي من orderHook', updated_at=NOW()
      WHERE request_key=$1
    `, [String(matched.request_key), supplierOrderId, JSON.stringify({ webhook: responsePatch })]);
    const documentPatch = Object.assign({ externalId: supplierOrderId, supplierOrderId, status: displayStatus, safkaStatus: rawStatus, requestStatus: cancellationProtected ? String((matched.order_data && matched.order_data.requestStatus) || matched.status || 'cancelled') : 'accepted', statusSyncedAt: new Date().toISOString() }, shipment.trackingNumber ? { trackingNumber: shipment.trackingNumber } : {}, shipment.carrier ? { carrier: shipment.carrier } : {});
    await client.query(`
      UPDATE app_documents
      SET data=data || $2::jsonb, updated_at=NOW()
      WHERE collection='orders' AND doc_id=$1
    `, [String(matched.order_id), JSON.stringify(documentPatch)]);
    await client.query(`UPDATE affiliate_order_webhook_events SET matched_order_id=$2, matched=TRUE, processed_at=NOW() WHERE event_key=$1`, [eventKey, String(matched.order_id)]);
    await client.query('COMMIT');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally { client.release(); }
  return { duplicate: false, matched: true, reviewRequired: false, eventKey, orderId: String(matched.order_id), userId: matched.user_id, supplierOrderId, status: rawStatus, displayStatus: webhookStatusDisplay(rawStatus) };
}

async function close() {
  if (pool) { await pool.end(); pool = null; }
}

async function issuePasswordResetToken(email) {
  const normalized = normalizeAdminEmail(email);
  if (!/^\S+@\S+\.\S+$/.test(normalized)) return { found: false };
  const userResult = await query('SELECT id,email,name FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [normalized]);
  const user = userResult.rows[0];
  if (!user) return { found: false };
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await query('DELETE FROM password_reset_tokens WHERE user_id=$1 OR expires_at<=NOW()', [String(user.id)]);
  await query("INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES ($1,$2,NOW()+INTERVAL '30 minutes')", [String(user.id), tokenHash]);
  return { found: true, token, user: { id: user.id, email: user.email, name: user.name } };
}

async function revokePasswordResetToken(token) {
  const raw = String(token || '').trim();
  if (!raw) return false;
  const result = await query('DELETE FROM password_reset_tokens WHERE token_hash=$1', [crypto.createHash('sha256').update(raw).digest('hex')]);
  return result.rowCount > 0;
}

async function consumePasswordResetToken(token, password) {
  const raw = String(token || '').trim();
  if (!raw || !validateAdminPassword(password)) {
    const e = new Error('رمز الاستعادة أو كلمة المرور غير صالح');
    e.code = 'INVALID_PASSWORD_RESET';
    throw e;
  }
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const tokenResult = await client.query(`SELECT id,user_id FROM password_reset_tokens
      WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW() FOR UPDATE`, [tokenHash]);
    const resetToken = tokenResult.rows[0];
    if (!resetToken) {
      await client.query('ROLLBACK');
      const e = new Error('رابط الاستعادة غير صالح أو انتهت صلاحيته');
      e.code = 'INVALID_PASSWORD_RESET';
      throw e;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await client.query(`UPDATE users SET password_hash=$2,password_changed_at=NOW(),updated_at=NOW()
      WHERE id=$1 RETURNING id,email,name,email_verified`, [String(resetToken.user_id), passwordHash]);
    if (!userResult.rows[0]) {
      await client.query('ROLLBACK');
      const e = new Error('تعذر تحديث الحساب');
      e.code = 'INVALID_PASSWORD_RESET';
      throw e;
    }
    await client.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1', [String(resetToken.id)]);
    await client.query('DELETE FROM auth_sessions WHERE user_id=$1', [String(resetToken.user_id)]);
    await client.query('COMMIT');
    return userResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getPool, query, migrate, upsertProducts, getProductsByExternalIds, close,
  getAffiliateUserData, getAffiliateOrderUpdates, getAffiliatePricingPolicy, getAffiliateCatalogData, saveAffiliateOrder, updateAffiliateOrder, updateAffiliateOrderStatus, listAffiliateOrdersForSync, saveAffiliateWithdrawal,
  claimAffiliateOrderRequest, createQueuedAffiliateOrder, claimAffiliateOrderJobByKey, claimAffiliateOrderJobs, updateAffiliateOrderQueueState, getAffiliateOrderStatus, completeAffiliateOrderRequest, repairAcceptedUntrackedAffiliateOrders, createAffiliateWithdrawal, cancelAffiliateOrder,
  saveAffiliateProduct, saveAiProductDescription, setAdminProductPricing, updateAffiliateProduct, deleteAffiliateProduct, upsertAffiliateProducts, updateAffiliateWithdrawalStatus,
  appendChatMessage, getChatMessages, getAiConversation, saveAiConversation, clearAiConversation, updateAffiliateMeta, updateUserAdminFields, updateUserBanned, createAdminUser, updateAdminUser, resetAdminUserPassword, setUserAccessState, issuePasswordResetToken, revokePasswordResetToken, consumePasswordResetToken, listAdminUserActions, grantAffiliateReward, listAffiliateRewards, deleteNotificationById, deleteAllNotifications,
  createNotification, createBroadcastNotifications, listNotifications, listRecentNotifications, countUnreadNotifications, markNotificationRead, markAllNotificationsRead,
  upsertPushSubscription, listPushSubscriptions, listPushSubscriptionsForUsers, deletePushSubscription, markPushSuccess, markPushFailure,
  recordAffiliateOrderAttempt, listAffiliateOrderAttempts, listAffiliateOrderAttemptsForAdmin, retryAffiliateOrderRequest, reviewAffiliateOrderRequest, listSafkaOrderWebhookReviews, applySafkaOrderWebhook
};
