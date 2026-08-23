#!/usr/bin/env node
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.join(__dirname, '..');
function read(name) { return fs.readFileSync(path.join(root, name), 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function checkHtmlScripts(name) {
  const html = read(name);
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(Boolean);
  scripts.forEach((code, index) => { try { new vm.Script(code, { filename: `${name}#script-${index + 1}` }); } catch (error) { throw new Error(`${name} script ${index + 1}: ${error.message}`); } });
  return html;
}
const server = read('server.js');
const postgres = read('lib/postgres.js');
const admin = read('admin.js');
const store = checkHtmlScripts('store2.html');
const adminHtml = checkHtmlScripts('admin.html');
assert(server.includes("app.get('/api/notifications'"), 'user notifications route missing');
assert(server.includes("app.get('/api/notifications/stream'"), 'notification SSE route missing');
assert(server.includes("app.post('/api/notifications/register'"), 'push registration route missing');
assert(server.includes('global.notifyUser = notifyUser'), 'central notifyUser missing');
assert(server.includes('VAPID_PUBLIC_KEY') && server.includes('VAPID_PRIVATE_KEY'), 'VAPID configuration missing');
assert(postgres.includes('CREATE TABLE IF NOT EXISTS push_subscriptions'), 'push subscription migration missing');
assert(postgres.includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_event'), 'notification idempotency index missing');
assert(postgres.includes('admin_price_locked') && postgres.includes('admin_sale_price'), 'product lock columns missing');
assert(postgres.includes('CASE WHEN products.admin_price_locked'), 'supplier sync does not protect locked prices');
assert(admin.includes("'notifications'"), 'admin notifications permission missing');
assert(admin.includes("/api/admin/notifications/send"), 'admin send route missing');
assert(store.includes('notifBtn') && store.includes('enableRab7naPush') && store.includes('enableRab7naSound'), 'store notification center missing');
assert(adminHtml.includes('view-notifications') && adminHtml.includes('adminPriceLocked'), 'admin notification/price-lock UI missing');
assert(!server.match(/adminPriceLocked[^\n]+\?[^\n]+true[^\n]+fallback/i), 'unsafe true fallback suspected in server');
console.log('notifications-price-lock static checks: PASS');
console.log(JSON.stringify({ storeScripts: [...store.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].length, adminScripts: [...adminHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].length }, null, 2));
