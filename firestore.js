'use strict';

const { query } = require('./lib/postgres');

function clean(value) {
  return JSON.parse(JSON.stringify(value, (_, v) => v === undefined ? null : v));
}

async function getDb() {
  return require('./lib/postgres').getPool();
}

async function all(collection) {
  const result = await query('SELECT doc_id AS id, data FROM app_documents WHERE collection=$1 ORDER BY updated_at DESC', [collection]);
  return result.rows.map(row => Object.assign({}, row.data || {}, { id: row.id }));
}

async function saveDoc(collection, id, value) {
  await query(`INSERT INTO app_documents(collection, doc_id, data)
    VALUES ($1,$2,$3::jsonb)
    ON CONFLICT (collection, doc_id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()`,
    [collection, String(id), JSON.stringify(clean(value))]);
}

async function deleteDoc(collection, id) {
  await query('DELETE FROM app_documents WHERE collection=$1 AND doc_id=$2', [collection, String(id)]);
}

async function replaceCollection(collection, values) {
  const client = await require('./lib/postgres').getPool().connect();
  try {
    await client.query('BEGIN');
    const wanted = new Set((values || []).map(v => String(v.id)));
    const existing = await client.query('SELECT doc_id FROM app_documents WHERE collection=$1', [collection]);
    for (const row of existing.rows) {
      if (!wanted.has(String(row.doc_id))) await client.query('DELETE FROM app_documents WHERE collection=$1 AND doc_id=$2', [collection, row.doc_id]);
    }
    for (const value of (values || [])) {
      await client.query(`INSERT INTO app_documents(collection, doc_id, data)
        VALUES ($1,$2,$3::jsonb)
        ON CONFLICT (collection, doc_id) DO UPDATE SET data=EXCLUDED.data, updated_at=NOW()`,
        [collection, String(value.id), JSON.stringify(clean(value))]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function getUsers() {
  const result = await query('SELECT id,email,password_hash,name,created_at,updated_at,email_verified,last_login FROM users ORDER BY id DESC');
  return result.rows;
}
async function getUser(id) {
  const result = await query('SELECT id,email,password_hash,name,created_at,updated_at,email_verified,last_login FROM users WHERE id=$1', [String(id)]);
  return result.rows[0] || null;
}
async function findUserByEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!value) return null;
  const result = await query('SELECT id,email,password_hash,name,created_at,updated_at,email_verified,last_login FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [value]);
  return result.rows[0] || null;
}
async function findUserByContact(contact) { return findUserByEmail(contact); }
async function saveUser(user) {
  const result = await query(`INSERT INTO users(id,email,password_hash,name,email_verified,last_login,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,NOW())
    ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,password_hash=EXCLUDED.password_hash,name=EXCLUDED.name,email_verified=EXCLUDED.email_verified,last_login=EXCLUDED.last_login,updated_at=NOW()
    RETURNING id,email,password_hash,name,created_at,updated_at,email_verified,last_login`,
    [user.id || null, String(user.email).trim().toLowerCase(), user.password_hash, user.name || user.display_name || '', Boolean(user.email_verified), user.last_login || null]);
  return result.rows[0];
}
async function saveUsers(users) { for (const user of users || []) await saveUser(user); }

async function saveToken(token, record) { await saveDoc('authTokens', token, record); }
async function getToken(token) { if (!token) return null; const rows = await all('authTokens'); return rows.find(row => row.id === String(token)) || null; }
async function deleteToken(token) { if (token) await deleteDoc('authTokens', token); }
async function purgeAuthCollections() {
  const result = {};
  for (const collection of ['authTokens', 'emailVerifications']) {
    const r = await query('DELETE FROM app_documents WHERE collection=$1', [collection]);
    result[collection] = r.rowCount;
  }
  const r = await query('DELETE FROM users');
  result.users = r.rowCount;
  return result;
}

async function getAffiliateData() {
  const [orders, products, withdrawals, tickets, meta] = await Promise.all([
    all('orders'), all('affiliateProducts'), all('withdrawals'), all('tickets'),
    query("SELECT data FROM app_documents WHERE collection='affiliateMeta' AND doc_id='main'")
  ]);
  const m = meta.rows[0] ? meta.rows[0].data : {};
  return { orders, withdrawals, products, tickets, priceUp: m.priceUp || 0, settings: m.settings || {} };
}
async function saveAffiliateData(data) {
  await Promise.all([
    replaceCollection('orders', data.orders || []), replaceCollection('withdrawals', data.withdrawals || []),
    replaceCollection('affiliateProducts', data.products || []), replaceCollection('tickets', data.tickets || []),
    saveDoc('affiliateMeta', 'main', { priceUp: data.priceUp || 0, settings: data.settings || {} })
  ]);
}
async function getChats() { const rows = await all('chats'); return Object.fromEntries(rows.map(row => [row.id, row.messages || []])); }
async function saveChats(chats) { await replaceCollection('chats', Object.keys(chats || {}).map(id => ({ id, messages: chats[id] || [] }))); }

module.exports = { getDb, getUsers, getUser, findUserByContact, findUserByEmail, saveUser, saveUsers, saveToken, getToken, deleteToken, purgeAuthCollections, getAffiliateData, saveAffiliateData, getChats, saveChats, all, saveDoc, deleteDoc };
