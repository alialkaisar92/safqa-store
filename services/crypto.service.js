// خدمة تشفير مفاتيح الـ API — AES-256-GCM (معيار صناعي)
const crypto = require('crypto');
const config = require('../config/easyorders.config');

const ALGO = config.encryption.algorithm;
// اشتقاق مفتاح 32 بايت ثابت من الـ secret
const KEY = crypto.createHash('sha256').update(String(config.encryption.secret)).digest();

function encrypt(plainText) {
  if (plainText == null || plainText === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // الصيغة: iv:tag:ciphertext (كلها base64)
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

function decrypt(payload) {
  if (!payload) return null;
  try {
    const parts = String(payload).split(':');
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const data = Buffer.from(parts[2], 'base64');
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch (e) {
    return null;
  }
}

module.exports = { encrypt, decrypt };
