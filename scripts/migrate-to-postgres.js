'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { migrate, query, close } = require('../lib/postgres');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}
function tableRows(file, table) {
  if (!fs.existsSync(file)) return [];
  const db = new DatabaseSync(file, { readOnly: true });
  try { return db.prepare(`SELECT * FROM ${table}`).all(); }
  catch (_) { return []; }
  finally { db.close(); }
}
async function saveDocument(collection, id, data) {
  await query(`INSERT INTO app_documents(collection, doc_id, data)
    VALUES ($1,$2,$3::jsonb)
    ON CONFLICT (collection, doc_id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()`,
    [collection, String(id), JSON.stringify(data)]);
}
async function migrateUsers(users) {
  let count = 0;
  for (const user of users || []) {
    const email = String(user.email || `${user.username || 'legacy'}-${user.id || Date.now()}@legacy.invalid`).trim().toLowerCase();
    const passwordHash = String(user.password_hash || user.passwordHash || 'legacy-password-disabled');
    await query(`INSERT INTO users(email,password_hash,name,email_verified,last_login,created_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,COALESCE($6,NOW()),NOW())
      ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, password_hash=EXCLUDED.password_hash, updated_at=NOW()`,
      [email, passwordHash, user.name || user.display_name || user.username || 'Legacy user', Boolean(user.email_verified), user.last_login || null, user.created_at || null]);
    count++;
  }
  return count;
}
async function migrateCollection(collection, rows) {
  let count = 0;
  for (const row of rows || []) {
    const id = row.id || row._id || row.external_id || `${collection}-${count + 1}`;
    await saveDocument(collection, id, row);
    count++;
  }
  return count;
}
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL غير مضبوط');
  await migrate();
  const root = path.join(__dirname, '..');
  const json = readJson(path.join(root, 'db.json'), {});
  const users = [].concat(json.users || [], tableRows(path.join(root, 'safqa.db'), 'users'));
  const userCount = await migrateUsers(users);
  const products = [].concat(json.products || [], tableRows(path.join(root, 'safqa.db'), 'products'));
  const productCount = await migrateCollection('affiliateProducts', products);
  const orderCount = await migrateCollection('orders', [].concat(json.orders || [], tableRows(path.join(root, 'safqa.db'), 'orders')));
  const withdrawalsCount = await migrateCollection('withdrawals', [].concat(json.withdrawals || [], tableRows(path.join(root, 'safqa.db'), 'withdrawals')));
  console.log(JSON.stringify({ ok: true, users: userCount, affiliateProducts: productCount, orders: orderCount, withdrawals: withdrawalsCount }, null, 2));
}
main().catch(error => { console.error('[migration] failed:', error.message); process.exitCode = 1; }).finally(() => close().catch(() => {}));
