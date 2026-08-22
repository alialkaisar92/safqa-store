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
assert(postgres.includes('canonicalOrderId') && postgres.includes('ON CONFLICT (collection,doc_id) DO NOTHING') && postgres.includes('order_id IS NULL'), 'duplicate queue rows must repair missing order/document linkage');
assert(orderRoute.includes("res.status(202).json({ok:true,queued:true,pending:true"), 'new orders must return an immediate queued response');
assert(!orderRoute.includes("fetch(BASE_URL+'/orders'"), 'supplier POST must not block the storefront request');
assert(orderRoute.includes("if (!productAvailable) return res.status(409).json({error:'المنتج غير متاح حاليًا'})"), 'order validation must block unavailable products');
assert(!orderRoute.includes("item.qty > stock") && !orderRoute.includes("الكمية المطلوبة أكبر من المخزون الأصلي"), 'numeric stock must not reject an available product');
assert(server.includes("app.get('/api/affiliate/order-status/:id'"), 'orders need a protected status endpoint');
assert(server.includes("'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate'") && server.includes("'CDN-Cache-Control': 'no-store'"), 'store HTML must not be served from a stale cache');
assert(server.includes("app.get('/api/health',async function(req,res)") && server.includes('await postgresReady') && server.includes("status:healthy?'healthy':'degraded'"), 'health must wait for PostgreSQL initialization');
assert(server.includes('postgres.getAffiliateOrderStatus(user.id'), 'status endpoint must scope reads to the authenticated user');
assert(postgres.includes('processing_started_at') && postgres.includes('last_attempt_at') && postgres.includes('retry_count'), 'queue retry metadata is missing');
assert(postgres.includes('lease_expires_at') && postgres.includes('FOR UPDATE') && postgres.includes('SKIP LOCKED'), 'queue jobs need leases and concurrent-safe claiming');
assert(postgres.includes("data || jsonb_build_object('status','جاري تجهيز الطلب','requestStatus','processing'"), 'claimed jobs must be visible as processing in the affiliate order document');
assert(postgres.includes("order_id IS NULL AND retry_count=0 AND lease_expires_at IS NULL") && postgres.includes("status='unknown'"), 'legacy orphan queue rows must not remain stuck or be reposted');
assert(postgres.includes('affiliate_commissions') && postgres.includes('ON CONFLICT (order_id) DO NOTHING'), 'commission ledger must be idempotent per order');
assert(postgres.includes('total_earned=COALESCE(total_earned,0)+$2, updated_at=NOW()'), 'confirmed commission must update total_earned');
assert(postgres.includes('nextDelivered && !previousDelivered') && postgres.includes('sales_count=COALESCE(sales_count,0)+1'), 'sales_count must increment only on first delivery transition');
assert(worker.includes('processAffiliateOrderQueue') && worker.includes('claimAffiliateOrderJobs'), 'background order worker is missing');
assert(worker.includes('AbortController') && worker.includes('ETIMEDOUT'), 'supplier timeout must be bounded');
assert(worker.includes("'unknown'") && worker.includes("'retry'"), 'worker must distinguish UNKNOWN and retryable states');
assert(worker.includes('retryDelayMs') && worker.includes('[2000, 5000, 15000, 30000]') && worker.includes('attempt < 5'), 'retry backoff contract is missing');
assert(worker.includes('incomplete_supplier_response'), 'incomplete supplier responses must become UNKNOWN');
assert(worker.includes("accepted: 'قيد التأكيد'") && worker.includes('terminalFailure'), 'supplier pending/terminal statuses must be normalized safely');
assert(worker.includes("'accepted', 'pending', 'processing', 'retry', 'قيد التأكيد', 'جاري التجهيز'"), 'reconciliation must revisit accepted and in-flight orders when a status endpoint is configured');
assert(worker.includes("'X-Idempotency-Key'"), 'supplier attempts must carry the stable operation key');
assert(client.includes("sessionStorage.getItem('rab7na_order_idempotency_key')"), 'refresh-safe idempotency key is missing');
assert(client.includes('rab7na_pending_order_v1') && client.includes('fetchQueuedOrderStatus'), 'checkout must retain and poll queued orders');
assert(server.includes('const queue = order._queue || null') && server.includes('queueStatusMap'), 'affiliate orders must expose queue status rather than stale app data only');
assert(server.includes("app.post('/api/affiliate/order-cancel'") && server.includes('postgres.cancelAffiliateOrder(user.id,orderId,reason)'), 'affiliate cancellation must be authenticated and persisted server-side');
assert(postgres.includes('cancel_reason') && postgres.includes('cancel_requested_at') && postgres.includes('cancelled_at'), 'cancellation audit fields are missing');
assert(postgres.includes('ORDER_NOT_CANCELLABLE') && postgres.includes("cancel_requested'"), 'cancellation must reject final states and support supplier review');
assert(postgres.includes("status IN ('cancel_requested','cancelled')") && postgres.includes('cancellationProtected'), 'worker/admin updates must not overwrite a cancellation');
assert(postgres.includes("SET status=CASE WHEN status IN ('cancel_requested','cancelled') THEN status ELSE $2 END") && postgres.includes('completeAffiliateOrderRequest'), 'late supplier completion must not overwrite a cancellation');
assert(client.includes('affiliateCancelMdl') && client.includes('affiliateCancelReason') && client.includes('submitAffiliateCancellation'), 'affiliate cancellation reason UI is missing');
assert(client.includes("/api/affiliate/order-cancel") && client.includes('setInterval(refreshAffiliateLive,5000)'), 'affiliate dashboard must refresh live and post cancellation safely');
assert(client.includes("r.status===202&&d.ok") || client.includes("d.ok&&d.queued"), 'checkout must accept the immediate queued contract');
console.log('order reliability checks: PASS');
console.log('save-first queue contract: YES');
console.log('concurrent worker deduplication: YES');
console.log('supplier request submitted by this test: NO');
