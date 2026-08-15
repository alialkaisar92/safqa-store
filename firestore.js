const admin = require('firebase-admin');

let db;

function clean(value) {
  return JSON.parse(JSON.stringify(value, (_, v) => v === undefined ? null : v));
}

function getDb() {
  if (db) return db;
  const encoded = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64 || '').replace(/^\uFEFF/, '').trim();
  const configured = encoded || String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').replace(/^\uFEFF/, '').trim();
  if (!configured) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON غير مضبوط');
  let raw = configured;
  try {
    // Vercel may contain either real Base64 or raw JSON after an env import.
    // Accept both formats so a valid service account is never decoded twice.
    if (!configured.startsWith('{')) raw = Buffer.from(configured, 'base64').toString('utf8');
    let serviceAccount = JSON.parse(raw);
    if (!serviceAccount || typeof serviceAccount !== 'object' || !serviceAccount.private_key) throw new Error('missing private key');
    if (typeof serviceAccount.private_key === 'string') serviceAccount.private_key = serviceAccount.private_key.replace(/\\\\n/g, '\\n');
    raw = JSON.stringify(serviceAccount);
  } catch (e) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON غير صالح');
  }
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (e) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON غير صالح');
  }
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
    });
  }
  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

async function all(collection) {
  const snap = await getDb().collection(collection).get();
  return snap.docs.map(d => Object.assign({}, d.data(), { id: d.id }));
}

async function saveDoc(collection, id, value) {
  await getDb().collection(collection).doc(String(id)).set(clean(value), { merge: true });
}

async function deleteDoc(collection, id) {
  await getDb().collection(collection).doc(String(id)).delete();
}

async function replaceCollection(collection, values) {
  const col = getDb().collection(collection);
  const existing = await col.get();
  const wanted = new Set((values || []).map(v => String(v.id)));
  let batch = getDb().batch();
  let count = 0;
  const commit = async () => { if (count) await batch.commit(); batch = getDb().batch(); count = 0; };
  existing.docs.forEach(doc => { if (!wanted.has(doc.id)) { batch.delete(doc.ref); count++; } });
  for (const value of (values || [])) {
    batch.set(col.doc(String(value.id)), clean(value), { merge: true });
    count++;
    if (count >= 450) await commit();
  }
  await commit();
}

async function getUsers() { return all('users'); }
async function getUser(id) {
  const snap = await getDb().collection('users').doc(String(id)).get();
  return snap.exists ? Object.assign({}, snap.data(), { id: snap.id }) : null;
}
async function findUserByContact(contact) {
  const snap = await getDb().collection('users').where('contact', '==', String(contact)).limit(1).get();
  if (snap.empty) return null;
  return Object.assign({}, snap.docs[0].data(), { id: snap.docs[0].id });
}
async function saveUser(user) { const copy = Object.assign({}, user); delete copy.id; await saveDoc('users', user.id, copy); return user; }
async function saveUsers(users) { await replaceCollection('users', users); }

async function saveToken(token, record) { await saveDoc('authTokens', token, record); }
async function getToken(token) {
  if (!token) return null;
  const snap = await getDb().collection('authTokens').doc(String(token)).get();
  return snap.exists ? snap.data() : null;
}
async function deleteToken(token) { if (token) await deleteDoc('authTokens', token); }

async function getAffiliateData() {
  const [orders, withdrawals, products, tickets, meta] = await Promise.all([
    all('orders'), all('affiliateProducts'), all('withdrawals'), all('tickets'),
    getDb().collection('affiliateMeta').doc('main').get()
  ]);
  const m = meta.exists ? meta.data() : {};
  return { orders, withdrawals, products, tickets, priceUp: m.priceUp || 0, settings: m.settings || {} };
}
async function saveAffiliateData(data) {
  await Promise.all([
    replaceCollection('orders', data.orders || []),
    replaceCollection('withdrawals', data.withdrawals || []),
    replaceCollection('affiliateProducts', data.products || []),
    replaceCollection('tickets', data.tickets || []),
    saveDoc('affiliateMeta', 'main', { priceUp: data.priceUp || 0, settings: data.settings || {} })
  ]);
}

async function getChats() {
  const rows = await all('chats');
  const out = {};
  rows.forEach(row => { const key = row.id; delete row.id; out[key] = row.messages || []; });
  return out;
}
async function saveChats(chats) {
  const values = Object.keys(chats || {}).map(key => ({ id: key, messages: chats[key] || [] }));
  await replaceCollection('chats', values);
}

module.exports = {
  getDb, getUsers, getUser, findUserByContact, saveUser, saveUsers,
  saveToken, getToken, deleteToken, getAffiliateData, saveAffiliateData,
  getChats, saveChats, all, saveDoc, deleteDoc
};
