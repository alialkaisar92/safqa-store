// خدمة مصادقة المسوقين — scrypt + جلسات آمنة قابلة للإلغاء
const crypto = require('crypto');
const db = require('./db');
const logger = require('./logger');

const SCRYPT_LEN = 64;
const SESSION_DAYS = 7;

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(plain), salt, SCRYPT_LEN).toString('hex');
  return 'scrypt$' + salt + '$' + hash;
}

function verifyPassword(plain, stored) {
  if (!stored || stored.indexOf('scrypt$') !== 0) return false;
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const salt = parts[1];
  const expected = parts[2];
  const derived = crypto.scryptSync(String(plain), salt, SCRYPT_LEN).toString('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(derived, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function newToken() { return crypto.randomBytes(32).toString('hex'); }

function ensureDefaultMarketer() {
  const d = db.getDb();
  const cnt = d.prepare('SELECT COUNT(*) AS c FROM marketers').get().c;
  if (cnt > 0) return null;
  const username = 'marketer';
  const password = 'marketer123';
  d.prepare('INSERT INTO marketers (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)')
    .run(username, hashPassword(password), 'المسوق الرئيسي', 'marketer');
  logger.info('Default marketer created', { username: username, password: password });
  return { username: username, password: password };
}

function register(username, password, displayName) {
  if (!username || !password) return { ok: false, error: 'اسم المستخدم وكلمة المرور مطلوبان' };
  if (String(password).length < 6) return { ok: false, error: 'كلمة المرور قصيرة جداً (6 أحرف على الأقل)' };
  try {
    const r = db.getDb().prepare('INSERT INTO marketers (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)')
      .run(String(username).trim(), hashPassword(password), displayName || String(username).trim(), 'marketer');
    logger.info('Marketer registered', { username: username });
    return { ok: true, id: Number(r.lastInsertRowid) };
  } catch (e) {
    if (/UNIQUE/i.test(String(e.message))) return { ok: false, error: 'اسم المستخدم مستخدم بالفعل' };
    return { ok: false, error: 'فشل التسجيل' };
  }
}

function login(username, password) {
  const m = db.getDb().prepare('SELECT * FROM marketers WHERE username = ?').get(String(username || '').trim());
  if (!m || !verifyPassword(password, m.password_hash)) return { ok: false, error: 'بيانات الدخول غير صحيحة' };
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.getDb().prepare('UPDATE marketers SET session_token = ?, session_expires = ? WHERE id = ?').run(token, expires, m.id);
  logger.info('Marketer logged in', { username: m.username });
  return { ok: true, token: token, marketer: { id: m.id, username: m.username, display_name: m.display_name, role: m.role } };
}

function getSession(token) {
  if (!token) return null;
  const m = db.getDb().prepare('SELECT id, username, display_name, role, session_expires FROM marketers WHERE session_token = ?').get(String(token));
  if (!m) return null;
  if (m.session_expires && new Date(m.session_expires) < new Date()) {
    db.getDb().prepare('UPDATE marketers SET session_token = NULL, session_expires = NULL WHERE id = ?').run(m.id);
    return null;
  }
  return { id: m.id, username: m.username, display_name: m.display_name, role: m.role };
}

function logout(token) {
  if (!token) return;
  db.getDb().prepare('UPDATE marketers SET session_token = NULL, session_expires = NULL WHERE session_token = ?').run(String(token));
}

function getMarketerById(id) {
  const m = db.getDb().prepare('SELECT id, username, display_name, role FROM marketers WHERE id = ?').get(id);
  return m || null;
}

function ensureFixed(username, password, displayName){
  const d = db.getDb();
  let m = d.prepare('SELECT * FROM marketers WHERE username = ?').get(username);
  if(!m){ const r = d.prepare('INSERT INTO marketers (username, password_hash, display_name, role) VALUES (?,?,?,?)').run(username, hashPassword(password), displayName||username, 'marketer'); m = d.prepare('SELECT * FROM marketers WHERE id = ?').get(Number(r.lastInsertRowid)); }
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS*24*60*60*1000).toISOString();
  d.prepare('UPDATE marketers SET session_token = ?, session_expires = ? WHERE id = ?').run(token, expires, m.id);
  return { token: token, marketer: { id:m.id, username:m.username, display_name:m.display_name, role:m.role } };
}


function _pubByUsername(u){const d=db.getDb();return d.prepare('SELECT * FROM marketers WHERE username = ?').get((u||'').trim().toLowerCase());}
function _pubByToken(t){const d=db.getDb();if(!t)return null;const m=d.prepare('SELECT * FROM marketers WHERE session_token = ?').get(t);if(!m)return null;if(m.session_expires&&new Date(m.session_expires)<new Date())return null;return m;}
function _pubIssue(m){const d=db.getDb();const token=newToken();const expires=new Date(Date.now()+SESSION_DAYS*24*60*60*1000).toISOString();d.prepare('UPDATE marketers SET session_token=?, session_expires=? WHERE id=?').run(token,expires,m.id);return {token:token,user:{id:m.id,username:m.username,display_name:m.display_name,role:m.role}};}
function pubRegister(username,password,displayName){username=(username||'').trim().toLowerCase();if(username.length<3)throw new Error('اسم المستخدم لازم 3 حروف على الأقل');if(!password||String(password).length<4)throw new Error('كلمة السر لازم 4 حروف على الأقل');if(_pubByUsername(username))throw new Error('الاسم ده مستخدم قبل كده — جرّب واحد تاني');const d=db.getDb();const r=d.prepare('INSERT INTO marketers (username,password_hash,display_name,role) VALUES (?,?,?,?)').run(username,hashPassword(password),displayName||username,'customer');const m=d.prepare('SELECT * FROM marketers WHERE id=?').get(Number(r.lastInsertRowid));return _pubIssue(m);}
function pubLogin(username,password){const m=_pubByUsername(username);if(!m)throw new Error('اسم المستخدم أو كلمة السر غلط');if(!verifyPassword(password, m.password_hash))throw new Error('اسم المستخدم أو كلمة السر غلط');return _pubIssue(m);}
function pubMe(token){const m=_pubByToken(token);if(!m)return null;return {id:m.id,username:m.username,display_name:m.display_name,role:m.role};}
function pubLogout(token){if(!token)return true;const d=db.getDb();d.prepare('UPDATE marketers SET session_token=NULL WHERE session_token=?').run(token);return true;}

function pubUpdate(token,displayName){const m=_pubByToken(token);if(!m)throw new Error('غير مسجل دخول');displayName=(displayName||'').trim();if(!displayName)throw new Error('الاسم الظاهر مطلوب');const d=db.getDb();d.prepare('UPDATE marketers SET display_name=? WHERE id=?').run(displayName,m.id);return pubMe(token);}

let _colsOk=false;
function ensureUserCols(){if(_colsOk)return;_colsOk=true;try{const d=db.getDb();['phone TEXT','email TEXT','active INTEGER DEFAULT 1','created_at TEXT'].forEach(function(c){try{d.prepare('ALTER TABLE marketers ADD COLUMN '+c).run();}catch(e){}});}catch(e){}}
function _pubByUsername(u){const d=db.getDb();return d.prepare('SELECT * FROM marketers WHERE username = ?').get((u||'').trim().toLowerCase());}
function _pubByToken(t){const d=db.getDb();if(!t)return null;const m=d.prepare('SELECT * FROM marketers WHERE session_token = ?').get(t);if(!m)return null;if(m.active===0)return null;if(m.session_expires&&new Date(m.session_expires)<new Date())return null;return m;}
function _pubIssue(m){const d=db.getDb();const token=newToken();const expires=new Date(Date.now()+SESSION_DAYS*24*60*60*1000).toISOString();d.prepare('UPDATE marketers SET session_token=?, session_expires=? WHERE id=?').run(token,expires,m.id);return {token:token,user:{id:m.id,username:m.username,display_name:m.display_name,phone:m.phone||'',email:m.email||'',role:m.role,active:m.active===0?0:1,created_at:m.created_at||null}};}
function pubRegister(username,password,displayName,phone,email){ensureUserCols();username=(username||'').trim().toLowerCase();if(username.length<3)throw new Error('اسم المستخدم لازم 3 حروف على الأقل');if(!password||String(password).length<4)throw new Error('كلمة السر لازم 4 حروف على الأقل');if(_pubByUsername(username))throw new Error('الاسم ده مستخدم قبل كده');const d=db.getDb();const iso=new Date().toISOString();const r=d.prepare('INSERT INTO marketers (username,password_hash,display_name,role,phone,email,created_at) VALUES (?,?,?,?,?,?,?)').run(username,hashPassword(password),displayName||username,'customer',(phone||'').trim(),(email||'').trim(),iso);const m=d.prepare('SELECT * FROM marketers WHERE id=?').get(Number(r.lastInsertRowid));return _pubIssue(m);}
function pubLogin(username,password){ensureUserCols();const m=_pubByUsername(username);if(!m)throw new Error('اسم المستخدم أو كلمة السر غلط');if(m.active===0)throw new Error('الحساب ده معطّل — راجع الإدارة');if(!verifyPassword(password, m.password_hash))throw new Error('اسم المستخدم أو كلمة السر غلط');return _pubIssue(m);}
function pubMe(token){const m=_pubByToken(token);if(!m)return null;return {id:m.id,username:m.username,display_name:m.display_name,phone:m.phone||'',email:m.email||'',role:m.role,active:m.active===0?0:1,created_at:m.created_at||null};}
function pubUpdate(token,displayName,phone,email){const m=_pubByToken(token);if(!m)throw new Error('غير مسجل دخول');displayName=(displayName||'').trim();if(!displayName)throw new Error('الاسم الظاهر مطلوب');const d=db.getDb();d.prepare('UPDATE marketers SET display_name=?, phone=?, email=? WHERE id=?').run(displayName,(phone||'').trim(),(email||'').trim(),m.id);return pubMe(token);}
function pubLogout(token){if(!token)return true;try{const d=db.getDb();d.prepare('UPDATE marketers SET session_token=NULL WHERE session_token=?').run(token);}catch(e){}return true;}
function pubListUsers(){ensureUserCols();const d=db.getDb();try{return d.prepare('SELECT id,username,display_name,phone,email,role,active,created_at,session_expires FROM marketers ORDER BY (role=\'admin\') DESC, id DESC').all();}catch(e){try{return d.prepare('SELECT * FROM marketers ORDER BY id DESC').all();}catch(e2){return [];}}}
function pubSetRole(id,role){ensureUserCols();const d=db.getDb();const allow=['customer','marketer','admin'];if(allow.indexOf(role)<0)throw new Error('دور غير صالح');d.prepare('UPDATE marketers SET role=? WHERE id=?').run(role,Number(id));return true;}
function pubResetPw(id,newPass){ensureUserCols();newPass=newPass||('sq'+Math.random().toString(36).slice(2,8));const d=db.getDb();d.prepare('UPDATE marketers SET password_hash=?, session_token=NULL WHERE id=?').run(hashPassword(newPass),Number(id));return newPass;}
function pubToggleActive(id){ensureUserCols();const d=db.getDb();const m=d.prepare('SELECT active FROM marketers WHERE id=?').get(Number(id));if(!m)throw new Error('مستخدم مش موجود');const nv=(m.active===0)?1:0;d.prepare('UPDATE marketers SET active=?, session_token=NULL WHERE id=?').run(nv,Number(id));return nv;}
function pubDeleteUser(id){ensureUserCols();const d=db.getDb();d.prepare('DELETE FROM marketers WHERE id=? AND role!=\'admin\'').run(Number(id));return true;}

module.exports = {
  pubDeleteUser: pubDeleteUser,
  pubToggleActive: pubToggleActive,
  pubResetPw: pubResetPw,
  pubSetRole: pubSetRole,
  pubListUsers: pubListUsers,
  pubUpdate: pubUpdate,
  pubLogout: pubLogout,
  pubMe: pubMe,
  pubLogin: pubLogin,
  pubRegister: pubRegister,
  hashPassword: hashPassword, verifyPassword: verifyPassword,
  ensureDefaultMarketer: ensureDefaultMarketer, register: register, login: login,
  getSession: getSession, logout: logout, getMarketerById: getMarketerById,
  ensureFixed: ensureFixed
};
