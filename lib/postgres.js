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
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

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
    CREATE INDEX IF NOT EXISTS idx_affiliate_order_requests_user ON affiliate_order_requests(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_affiliate_order_requests_status ON affiliate_order_requests(status, next_attempt_at, updated_at);
    CREATE INDEX IF NOT EXISTS idx_affiliate_order_requests_order ON affiliate_order_requests(order_id);

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
    SELECT collection, doc_id, data
    FROM app_documents
    WHERE collection IN ('orders', 'withdrawals') AND data->>'userId'=$1
    ORDER BY updated_at DESC
  `, [String(userId)]);
  const queueResult = await client.query(`
    SELECT order_id, status, supplier_order_id, failure_reason, cancel_reason, cancel_requested_at, cancelled_at, updated_at, request_data, supplier_response
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
      updatedAt: row.updated_at || null
    };
    if (candidateId) queueByOrderId.set(String(candidateId), queueView);
    if (!row.order_id && requestOrder && requestOrder.id) {
      orphanOrders.push(Object.assign({ id: String(requestOrder.id), userId: String(userId) }, requestOrder, { _queue: queueView }));
    }
  }
  const orders = [], withdrawals = [], documentOrderIds = new Set();
  for (const row of result.rows) {
    const value = Object.assign({ id: row.doc_id }, row.data || {});
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

async function getAffiliateCatalogData() {
  const [products, meta, live] = await Promise.all([
    query("SELECT doc_id AS id, data FROM app_documents WHERE collection='affiliateProducts' ORDER BY updated_at DESC"),
    query("SELECT data FROM app_documents WHERE collection='affiliateMeta' AND doc_id='main' LIMIT 1"),
    query("SELECT external_id AS id, name, description, image, price, base_price, commission, stock, active, raw_data, updated_at FROM products ORDER BY updated_at DESC").catch(() => ({ rows: [] }))
  ]);
  const priceUp = meta.rows[0] && meta.rows[0].data ? Number(meta.rows[0].data.priceUp || 0) : 0;
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
      image: row.image || local.image || '',
      price: row.price,
      basePrice: row.base_price,
      commission: row.commission,
      stock: row.stock,
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
    settings: meta.rows[0] && meta.rows[0].data ? (meta.rows[0].data.settings || {}) : {}
  };
}

async function getProductsByExternalIds(ids) {
  const values = (Array.isArray(ids) ? ids : []).map(value => String(value || '').trim()).filter(Boolean).slice(0, 100);
  if (!values.length) return [];
  const result = await query(`
    SELECT external_id AS id, name, description, image, price, base_price, commission, stock, active, raw_data, updated_at
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
      image: row.image,
      price: row.price,
      basePrice: row.base_price,
      commission: row.commission,
      stock: row.stock,
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
    SET status=CASE WHEN status IN ('cancel_requested','cancelled') THEN status ELSE $2 END,
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
      return { order: before, delivered: false, cancellationProtected: true };
    }
    const next = Object.assign({}, before, requested);
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
      const exists = await client.query("SELECT 1 FROM app_documents WHERE collection='affiliateProducts' AND doc_id=$1", [docId]);
      await client.query(`
        INSERT INTO app_documents(collection, doc_id, data, updated_at)
        VALUES ('affiliateProducts',$1,$2::jsonb,NOW())
        ON CONFLICT (collection, doc_id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()
      `, [docId, JSON.stringify(value)]);
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
    return { withdrawal: Object.assign({ id: String(docId) }, next), balance };
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

async function updateUserAdminFields(userId, patch) {
  const role = String(patch && patch.role || 'user').trim().toLowerCase();
  const permissions = Array.isArray(patch && patch.permissions) ? patch.permissions : [];
  const banned = Boolean(patch && patch.banned);
  const result = await query(`
    UPDATE users SET role=$2, permissions=$3::jsonb, banned=$4, updated_at=NOW()
    WHERE id=$1
    RETURNING id,email,name,created_at,last_login,balance,role,permissions,banned
  `, [String(userId), role, JSON.stringify(permissions), banned]);
  return result.rows[0] || null;
}

async function updateUserBanned(userId, banned) {
  const result = await query(`UPDATE users SET banned=$2, updated_at=NOW() WHERE id=$1 RETURNING id,email,name,balance,role,permissions,banned`, [String(userId), Boolean(banned)]);
  return result.rows[0] || null;
}

async function close() {
  if (pool) { await pool.end(); pool = null; }
}

module.exports = {
  getPool, query, migrate, upsertProducts, getProductsByExternalIds, close,
  getAffiliateUserData, getAffiliateCatalogData, saveAffiliateOrder, updateAffiliateOrder, updateAffiliateOrderStatus, listAffiliateOrdersForSync, saveAffiliateWithdrawal,
  claimAffiliateOrderRequest, createQueuedAffiliateOrder, claimAffiliateOrderJobs, updateAffiliateOrderQueueState, getAffiliateOrderStatus, completeAffiliateOrderRequest, repairAcceptedUntrackedAffiliateOrders, createAffiliateWithdrawal, cancelAffiliateOrder,
  saveAffiliateProduct, updateAffiliateProduct, deleteAffiliateProduct, upsertAffiliateProducts, updateAffiliateWithdrawalStatus,
  appendChatMessage, getChatMessages, getAiConversation, saveAiConversation, clearAiConversation, updateAffiliateMeta, updateUserAdminFields, updateUserBanned
};
