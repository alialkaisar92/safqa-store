/**
 * lib/settings.js — طبقة الإعدادات
 * - Cache محلي (30 ثانية) لتقليل الاستعلامات
 * - get/set/setMany
 * - Transaction-safe updates (BEGIN/COMMIT يدوي)
 */
const db = require('./database');

const cache = new Map();
let cacheTime = 0;
const CACHE_TTL = 30000; // 30 ثانية

function getAll() {
  const now = Date.now();
  if (cache.size > 0 && (now - cacheTime) < CACHE_TTL) {
    return Object.fromEntries(cache);
  }
  const rows = db.prepare('SELECT key, value FROM settings').all();
  cache.clear();
  for (const r of rows) cache.set(r.key, r.value);
  cacheTime = now;
  return Object.fromEntries(cache);
}

function get(key, fallback = '') {
  getAll(); // ensure cache loaded
  return cache.has(key) ? cache.get(key) : fallback;
}

function set(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
  `).run(key, String(value));
  cache.set(key, String(value));
  cacheTime = Date.now();
}

function setMany(obj) {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
  `);
  db.exec('BEGIN');
  try {
    for (const [k, v] of Object.entries(obj)) {
      stmt.run(k, String(v));
      cache.set(k, String(v));
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  cacheTime = Date.now();
}

module.exports = { getAll, get, set, setMany };
