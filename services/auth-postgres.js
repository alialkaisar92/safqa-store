'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../lib/postgres');

const SESSION_DAYS = 30;
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}
function tokenHash(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function newToken() { return crypto.randomBytes(32).toString('hex'); }
function publicUser(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, email_verified: Boolean(row.email_verified), created_at: row.created_at, last_login: row.last_login, balance: Number(row.balance || 0), welcome_bonus_granted: Boolean(row.welcome_bonus_granted) };
}
function allowed(key) {
  const now = Date.now();
  const old = attempts.get(key) || { count: 0, at: now };
  if (now - old.at > WINDOW_MS) { attempts.set(key, { count: 1, at: now }); return true; }
  if (old.count >= MAX_ATTEMPTS) return false;
  old.count += 1; attempts.set(key, old); return true;
}
function validatePassword(password) { return typeof password === 'string' && password.length >= 8 && password.length <= 128; }

async function register({ name, email, password }) {
  name = String(name || '').trim(); email = normalizeEmail(email);
  if (name.length < 2 || name.length > 100) throw new Error('اكتب الاسم بشكل صحيح');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('اكتب بريدًا إلكترونيًا صحيحًا');
  if (!validatePassword(password)) throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const result = await query(`INSERT INTO users(name,email,password_hash,email_verified,balance,welcome_bonus_granted)
      VALUES ($1,$2,$3,FALSE,70.00,TRUE)
      RETURNING id,name,email,email_verified,created_at,last_login,balance,welcome_bonus_granted`, [name, email, passwordHash]);
    return result.rows[0];
  } catch (error) {
    if (error && error.code === '23505') throw new Error('هذا البريد مستخدم بالفعل');
    throw error;
  }
}

async function login({ email, password, ip }) {
  email = normalizeEmail(email);
  if (!allowed(`${ip || 'unknown'}:${email}`)) throw new Error('محاولات كثيرة؛ حاول بعد 15 دقيقة');
  if (!email || typeof password !== 'string') throw new Error('البريد وكلمة المرور مطلوبان');
  const result = await query('SELECT id,name,email,password_hash,email_verified,created_at,last_login,balance,welcome_bonus_granted FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
  const user = result.rows[0];
  const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!valid) throw new Error('البريد أو كلمة المرور غير صحيحة');
  await query('UPDATE users SET last_login=NOW(),updated_at=NOW() WHERE id=$1', [user.id]);
  const token = newToken();
  await query(`INSERT INTO auth_sessions(user_id,token_hash,expires_at) VALUES ($1,$2,NOW()+INTERVAL '${SESSION_DAYS} days')`, [user.id, tokenHash(token)]);
  return { token, user: publicUser(Object.assign({}, user, { last_login: new Date().toISOString() })) };
}

async function currentUser(token) {
  if (!token) return null;
  const result = await query(`SELECT u.id,u.name,u.email,u.email_verified,u.created_at,u.last_login,u.balance,u.welcome_bonus_granted
    FROM auth_sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.expires_at>NOW()`, [tokenHash(token)]);
  if (!result.rows[0]) return null;
  await query('UPDATE auth_sessions SET last_seen_at=NOW() WHERE token_hash=$1', [tokenHash(token)]);
  return publicUser(result.rows[0]);
}
async function logout(token) { if (token) await query('DELETE FROM auth_sessions WHERE token_hash=$1', [tokenHash(token)]); }
async function logoutAll(userId) { await query('DELETE FROM auth_sessions WHERE user_id=$1', [userId]); }

module.exports = { register, login, currentUser, logout, logoutAll, publicUser, newToken, tokenHash, normalizeEmail };
