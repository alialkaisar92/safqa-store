'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const server = read('server.js');
const admin = read('admin.js');
const html = read('admin.html');
const postgres = read('lib/postgres.js');
const firestore = read('firestore.js');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(server.includes("require('./admin.js')(app);"), 'admin.js must be mounted by the main server');
assert(!server.includes("app.use('/api/admin', (req, res) => res.status(410)"), 'the admin API must not be disabled by the old 410 catch-all');
assert(admin.includes("authService.currentUser(tokenFrom(req))"), 'admin authorization must use the current session service');
assert(admin.includes("readCookie(req, SESSION_COOKIE)"), 'admin authorization must accept the HttpOnly session cookie');
assert(!admin.includes('global.verifyJWT'), 'admin authorization must not rely on the legacy global JWT verifier');
assert(!html.includes('localStorage'), 'admin client must not use localStorage for credentials or state');
assert(!html.includes('x-admin-cred'), 'admin client must not send legacy admin credentials');
assert(!html.includes('Admin@2026'), 'admin client must not contain hardcoded credentials');
assert(!html.includes('sq_ops'), 'admin client must not contain the legacy credential storage key');
assert(html.includes('sidebar') && html.includes('table-wrap') && html.includes('@media(max-width:760px)'), 'admin client must include responsive navigation and bounded table scrolling');
assert(html.includes('/api/admin/stats') && html.includes('/api/admin/orders') && html.includes('/api/admin/withdrawals') && html.includes('/api/admin/products'), 'admin client must consume the core admin APIs');
assert(html.includes('/api/admin/users') && html.includes('/api/admin/chats') && html.includes('/api/admin/settings'), 'admin client must consume users, support, and settings APIs');
assert(postgres.includes('updateAffiliateOrderStatus') && postgres.includes('updateAffiliateWithdrawalStatus'), 'order and withdrawal status updates must use atomic PostgreSQL helpers');
assert(postgres.includes('ALTER TABLE users ADD COLUMN IF NOT EXISTS role') && postgres.includes('ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions'), 'admin role migration must be present');
assert(firestore.includes(',role,permissions,banned'), 'the user data layer must read admin fields from PostgreSQL');

if (failures.length) {
  console.error('admin-security: FAIL');
  failures.forEach(item => console.error('- ' + item));
  process.exit(1);
}
console.log('admin-security: PASS');
