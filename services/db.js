// طبقة الوصول لقاعدة البيانات — SQLite المدمج في Node (node:sqlite)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const config = require('../config/easyorders.config');
const logger = require('./logger');

const dbPath = path.join(process.cwd(), config.dbFile);
let db = null;

function getDb() {
  if (!db) {
    db = new DatabaseSync(dbPath);
    try { db.exec('PRAGMA journal_mode = WAL;'); } catch (e) {}
    try { db.exec('PRAGMA foreign_keys = ON;'); } catch (e) {}
  }
  return db;
}

// ترحيلات آمنة: إضافة أعمدة جديدة دون المساس بالبيانات الموجودة
function migrate(d) {
  const cols = [
    ['easyorders_connections', 'webhook_secret_enc', 'TEXT'],
    ['easyorders_connections', 'webhook_token',      'TEXT'],
    ['easyorders_connections', 'webhook_enabled',    'INTEGER DEFAULT 0'],
    ['marketers',              'session_token',      'TEXT'],
    ['marketers',              'session_expires',    'TEXT']
  ];
  for (const [tbl, col, type] of cols) {
    try { d.exec('ALTER TABLE ' + tbl + ' ADD COLUMN ' + col + ' ' + type); }
    catch (e) { /* العمود موجود مسبقاً — نتجاهل بأمان */ }
  }
  try { d.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_conn_webhook_token ON easyorders_connections(webhook_token);'); } catch (e) {}
  try { d.exec('CREATE INDEX IF NOT EXISTS idx_marketers_session ON marketers(session_token);'); } catch (e) {}
}

function initDb() {
  const d = getDb();
  d.exec(`CREATE TABLE IF NOT EXISTS marketers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, display_name TEXT, role TEXT DEFAULT 'marketer',
    created_at TEXT DEFAULT (datetime('now')));`);
  d.exec(`CREATE TABLE IF NOT EXISTS easyorders_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT, marketer_id INTEGER UNIQUE NOT NULL,
    api_key_enc TEXT NOT NULL, store_id TEXT, store_name TEXT,
    connection_status TEXT DEFAULT 'disconnected', last_sync TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (marketer_id) REFERENCES marketers(id) ON DELETE CASCADE);`);
  d.exec(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, marketer_id INTEGER NOT NULL,
    eo_product_id TEXT NOT NULL, name TEXT, sku TEXT, price REAL, sale_price REAL,
    quantity INTEGER, track_stock INTEGER DEFAULT 1, image TEXT, status TEXT DEFAULT 'active',
    raw_json TEXT, synced_at TEXT, UNIQUE(marketer_id, eo_product_id),
    FOREIGN KEY (marketer_id) REFERENCES marketers(id) ON DELETE CASCADE);`);
  d.exec(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, marketer_id INTEGER NOT NULL, eo_order_id TEXT,
    customer_name TEXT, customer_phone TEXT, government TEXT, city TEXT, address TEXT,
    items_json TEXT, shipping_cost REAL, total REAL, note TEXT,
    status TEXT DEFAULT 'new', send_status TEXT DEFAULT 'pending', error_msg TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (marketer_id) REFERENCES marketers(id) ON DELETE CASCADE);`);
  d.exec(`CREATE TABLE IF NOT EXISTS webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT UNIQUE, event_type TEXT,
    payload_json TEXT, processed INTEGER DEFAULT 0, received_at TEXT DEFAULT (datetime('now')));`);
  d.exec(`CREATE INDEX IF NOT EXISTS idx_products_marketer ON products(marketer_id);`);
  d.exec(`CREATE INDEX IF NOT EXISTS idx_orders_marketer ON orders(marketer_id);`);
  d.exec(`CREATE INDEX IF NOT EXISTS idx_orders_eo ON orders(eo_order_id);`);
  migrate(d);
  logger.info('Database initialized', { path: dbPath });
  return d;
}

module.exports = { getDb, initDb };
