'use strict';

const { Pool } = require('pg');

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
  `);
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
        product.active !== false && product.available !== false,
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

module.exports = { getPool, query, migrate, upsertProducts, close };
