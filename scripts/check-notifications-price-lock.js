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
assert(admin.includes("'rewards'"), 'admin rewards permission missing');
assert(admin.includes("/api/admin/notifications/send"), 'admin send route missing');
assert(admin.includes("/api/admin/notifications/delete") && admin.includes("/api/admin/notifications/clear"), 'admin notification delete routes missing');
assert(admin.includes("/api/admin/rewards/grant") && admin.includes("postgres.grantAffiliateReward"), 'admin reward grant route missing');
assert(postgres.includes('CREATE TABLE IF NOT EXISTS affiliate_rewards') && postgres.includes('CREATE TABLE IF NOT EXISTS affiliate_reward_grants'), 'reward ledger migration missing');
assert(postgres.includes('UNIQUE(reward_id, user_id)') && postgres.includes('ON CONFLICT (reward_key) DO NOTHING'), 'reward idempotency guard missing');
assert(server.includes('global.publishNotification = publishNotification'), 'existing notification publish bridge missing');
assert(store.includes('notifBtn') && store.includes('enableRab7naPush') && store.includes('enableRab7naSound'), 'store notification center missing');
assert(adminHtml.includes('view-notifications') && adminHtml.includes('adminPriceLocked'), 'admin notification/price-lock UI missing');
assert(adminHtml.includes('view-rewards') && adminHtml.includes('rewardAmount') && adminHtml.includes('grant-reward'), 'admin rewards UI missing');
assert(!server.match(/adminPriceLocked[^\n]+\?[^\n]+true[^\n]+fallback/i), 'unsafe true fallback suspected in server');
console.log('notifications-price-lock static checks: PASS');
console.log(JSON.stringify({ storeScripts: [...store.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].length, adminScripts: [...adminHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].length }, null, 2));
