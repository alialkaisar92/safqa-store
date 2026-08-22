const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'store2.html'), 'utf8');
const postgres = fs.readFileSync(path.join(root, 'lib', 'postgres.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(server.includes("const affiliateUser=await currentAuthUser(req);"), 'orders must use the authenticated affiliate session');
assert(server.includes('postgres.claimAffiliateOrderRequest(affiliateUser.id, requestKey, requestData)'), 'orders must claim idempotency before supplier submission');
assert(server.includes("claim.mode === 'duplicate'"), 'retries must return the stored result');
assert(server.includes("claim.mode === 'in_progress'"), 'concurrent retries must not submit a second supplier order');
assert(server.includes("completeAffiliateOrderRequest(requestKey, 'failed'"), 'supplier failures must release the retry state safely');
assert(client.includes('getOrderIdempotencyKey()'), 'checkout must keep one idempotency key per attempt');
assert(client.includes("'X-Idempotency-Key':body.idempotency_key"), 'checkout must send the idempotency key as a header');
assert(postgres.includes('PRIMARY KEY') && postgres.includes('affiliate_order_requests'), 'idempotency table must have a unique primary key');
assert(postgres.includes('ON CONFLICT (request_key) DO NOTHING'), 'concurrent claims must be deduplicated atomically');
console.log('order idempotency checks: PASS');
console.log('supplier duplicate submissions by this test: NO');
console.log('network/order submitted by this test: NO');
