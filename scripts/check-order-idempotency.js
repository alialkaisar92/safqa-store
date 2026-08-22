const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'store2.html'), 'utf8');
const postgres = fs.readFileSync(path.join(root, 'lib', 'postgres.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'safka-sync.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const routeStart = server.indexOf("app.post('/api/create-order'");
const routeEnd = server.indexOf("app.get('/api/affiliate/order-status/:id'", routeStart);
const orderRoute = server.slice(routeStart, routeEnd);

assert(server.includes("const affiliateUser=await currentAuthUser(req);"), 'orders must use the authenticated affiliate session');
assert(server.includes('postgres.createQueuedAffiliateOrder(affiliateUser.id,requestKey,requestData,affiliateOrder)'), 'orders must be saved to the database queue before supplier work');
assert(orderRoute.includes("res.status(202).json({ok:true,queued:true,pending:true"), 'new orders must return an immediate queued response');
assert(!orderRoute.includes("fetch(BASE_URL+'/orders'"), 'supplier POST must not block the storefront request');
assert(server.includes("app.get('/api/affiliate/order-status/:id'"), 'orders need a protected status endpoint');
assert(server.includes('postgres.getAffiliateOrderStatus(user.id'), 'status endpoint must scope reads to the authenticated user');
assert(postgres.includes('processing_started_at') && postgres.includes('last_attempt_at') && postgres.includes('retry_count'), 'queue retry metadata is missing');
assert(postgres.includes('lease_expires_at') && postgres.includes('FOR UPDATE') && postgres.includes('SKIP LOCKED'), 'queue jobs need leases and concurrent-safe claiming');
assert(postgres.includes('affiliate_commissions') && postgres.includes('ON CONFLICT (order_id) DO NOTHING'), 'commission ledger must be idempotent per order');
assert(postgres.includes('total_earned=COALESCE(total_earned,0)+$2, updated_at=NOW()'), 'confirmed commission must update total_earned');
assert(postgres.includes('nextDelivered && !previousDelivered') && postgres.includes('sales_count=COALESCE(sales_count,0)+1'), 'sales_count must increment only on first delivery transition');
assert(worker.includes('processAffiliateOrderQueue') && worker.includes('claimAffiliateOrderJobs'), 'background order worker is missing');
assert(worker.includes('AbortController') && worker.includes('ETIMEDOUT'), 'supplier timeout must be bounded');
assert(worker.includes("'unknown'") && worker.includes("'retry'"), 'worker must distinguish UNKNOWN and retryable states');
assert(worker.includes('retryDelayMs') && worker.includes('[2000, 5000, 15000, 30000]') && worker.includes('attempt < 5'), 'retry backoff contract is missing');
assert(worker.includes('incomplete_supplier_response'), 'incomplete supplier responses must become UNKNOWN');
assert(worker.includes("'X-Idempotency-Key'"), 'supplier attempts must carry the stable operation key');
assert(client.includes("sessionStorage.getItem('rab7na_order_idempotency_key')"), 'refresh-safe idempotency key is missing');
assert(client.includes('rab7na_pending_order_v1') && client.includes('fetchQueuedOrderStatus'), 'checkout must retain and poll queued orders');
assert(client.includes("r.status===202&&d.ok") || client.includes("d.ok&&d.queued"), 'checkout must accept the immediate queued contract');
console.log('order reliability checks: PASS');
console.log('save-first queue contract: YES');
console.log('concurrent worker deduplication: YES');
console.log('supplier request submitted by this test: NO');
