/**
 * lib/database.js — طبقة قاعدة البيانات الموحدة (SQLite)
 * - يستخدم node:sqlite (built-in في Node.js 22+)
 * - WAL mode للأداء العالي
 * - Schema كامل لكل الجداول
 * - فهارس محسّنة
 * - Seed إعدادات افتراضية
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'safqa.db');
const db = new DatabaseSync(DB_PATH);

// Performance optimizations
try { db.exec('PRAGMA journal_mode = WAL;'); } catch (e) {}
try { db.exec('PRAGMA foreign_keys = ON;'); } catch (e) {}
try { db.exec('PRAGMA synchronous = NORMAL;'); } catch (e) {}

// Schema كامل
db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  category_id INTEGER,
  image TEXT,
  price REAL NOT NULL DEFAULT 0,
  base_price REAL NOT NULL DEFAULT 0,
  commission REAL DEFAULT 0,
  stock INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  phone TEXT,
  email TEXT,
  role TEXT DEFAULT 'customer',
  active INTEGER DEFAULT 1,
  balance REAL DEFAULT 0,
  pending_balance REAL DEFAULT 0,
  total_earned REAL DEFAULT 0,
  total_withdrawn REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  product_id INTEGER,
  customer_name TEXT,
  customer_phone TEXT,
  governorate TEXT,
  address TEXT,
  quantity INTEGER DEFAULT 1,
  product_price REAL DEFAULT 0,
  shipping_cost REAL DEFAULT 0,
  total REAL DEFAULT 0,
  commission REAL DEFAULT 0,
  status TEXT DEFAULT 'new',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS order_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  admin_name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  method TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'info',
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  image TEXT,
  link TEXT,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shipping_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  governorate TEXT NOT NULL,
  cost REAL NOT NULL DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  active INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
`);

// Seed إعدادات افتراضية
const defaultSettings = {
  site_name: 'سوّقلي',
  site_logo: '',
  primary_color: '#0F766E',
  secondary_color: '#14b8a6',
  accent_color: '#f59e0b',
  support_phone: '',
  support_email: '',
  free_shipping_threshold: '0',
  currency: 'ج.م',
  commission_rate: '10',
  meta_title: 'سوّقلي — منصة التسويق بالعمولة',
  meta_description: 'منصة تسويق بالعمولة احترافية',
  meta_keywords: 'تسويق, عمولة, أفلييت, سوّقلي'
};

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(defaultSettings)) {
  insertSetting.run(k, v);
}

console.log('[database] SQLite initialized with', Object.keys(defaultSettings).length, 'default settings');
module.exports = db;
