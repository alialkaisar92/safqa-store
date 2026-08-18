'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { migrate, query, close } = require('../lib/postgres');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL غير مضبوط؛ لا يمكن تنفيذ اختبار PostgreSQL');
  await migrate();
  const email = `db-test-${Date.now()}@rab7na.invalid`;
  const hash = await bcrypt.hash('TestPassword!123', 12);
  const inserted = await query(`INSERT INTO users(email,password_hash,name,email_verified)
    VALUES ($1,$2,$3,$4) RETURNING id,email,name,email_verified`, [email, hash, 'Database Test User', false]);
  const id = inserted.rows[0].id;
  const read = await query('SELECT id,email,password_hash,name FROM users WHERE id=$1', [id]);
  const passwordValid = await bcrypt.compare('TestPassword!123', read.rows[0].password_hash);
  await query('UPDATE users SET name=$1,updated_at=NOW() WHERE id=$2', ['Database Test User Updated', id]);
  const updated = await query('SELECT name FROM users WHERE id=$1', [id]);
  await query('DELETE FROM users WHERE id=$1', [id]);
  const deleted = await query('SELECT id FROM users WHERE id=$1', [id]);
  console.log(JSON.stringify({
    ok: passwordValid && updated.rows[0].name === 'Database Test User Updated' && deleted.rowCount === 0,
    inserted: inserted.rowCount,
    read: read.rowCount,
    password_hash_is_bcrypt: /^\$2[aby]\$/.test(read.rows[0].password_hash),
    updated: updated.rowCount,
    deleted: deleted.rowCount
  }, null, 2));
}
main().catch(error => { console.error('[postgres-test] failed:', error.message); process.exitCode = 1; }).finally(() => close().catch(() => {}));
