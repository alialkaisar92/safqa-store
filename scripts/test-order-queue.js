'use strict';

const assert = require('assert');
const Module = require('module');

const originalLoad = Module._load;
const state = {
  fetchCalls: 0,
  queueClaimed: false,
  queueUpdates: [],
  orderUpdates: [],
  savedOrders: [],
  statusUpdates: [],
  attemptLogs: []
};
let fetchScenario = null;

const postgresMock = {
  async updateAffiliateOrderQueueState(key, status, patch) { state.queueUpdates.push({ key, status, patch }); },
  async updateAffiliateOrder(orderId, patch) { state.orderUpdates.push({ orderId, patch }); },
  async saveAffiliateOrder(order) { state.savedOrders.push(order); },
  async updateAffiliateOrderStatus(orderId, patch) { state.statusUpdates.push({ orderId, patch }); return { id: orderId, ...patch }; },
  async recordAffiliateOrderAttempt(input) { state.attemptLogs.push(input); return input; },
  async claimAffiliateOrderJobs() {
    await new Promise(resolve => setTimeout(resolve, 15));
    if (state.queueClaimed) return [];
    state.queueClaimed = true;
    return [job(1)];
  },
  async listAffiliateOrdersForSync() { return []; },
  async repairAcceptedUntrackedAffiliateOrders() { return { repaired: 0 }; },
  async upsertProducts() { return { inserted: 0, updated: 0 }; }
};
const storeMock = { all: async () => [], saveDoc: async () => {}, getUsers: async () => [] };

Module._load = function(request, parent, isMain) {
  if (request === './lib/postgres' && parent && parent.filename.endsWith('/safka-sync.js')) return postgresMock;
  if (request === './firestore' && parent && parent.filename.endsWith('/safka-sync.js')) return storeMock;
  if (request === 'node-fetch' && parent && parent.filename.endsWith('/safka-sync.js')) {
    return async function mockedFetch() {
      state.fetchCalls += 1;
      if (fetchScenario === 'timeout') {
        const error = new Error('mock timeout after supplier received request');
        error.name = 'AbortError';
        throw error;
      }
      if (fetchScenario === '502') return { ok: false, status: 502, json: async () => ({}) };
      if (fetchScenario === 'incomplete') return { ok: true, status: 201, json: async () => ({ data: { status: 'pending' } }) };
      if (fetchScenario === '400') return { ok: false, status: 400, json: async () => ({ errors: [{ msg: 'invalid customer' }] }) };
      if (fetchScenario === 'pre-submit-transient') {
        const error = new Error('mock connection failed before request was sent');
        error.code = 'QUEUE_PRE_SUBMIT_TRANSIENT';
        error.supplierContacted = false;
        throw error;
      }
      return { ok: true, status: 201, json: async () => ({ data: { id: 'SUP-ORDER-1', status: 'confirmed' } }) };
    };
  }
  return originalLoad.apply(this, arguments);
};

const worker = require('../safka-sync');
Module._load = originalLoad;
assert.equal(typeof worker.processAffiliateOrderJob, 'function', 'worker job function must be exported for isolated testing');
assert.equal(typeof worker.processAffiliateOrderQueue, 'function', 'worker queue function must be exported for concurrency testing');

function reset() {
  state.fetchCalls = 0;
  state.queueClaimed = false;
  state.queueUpdates.length = 0;
  state.orderUpdates.length = 0;
  state.savedOrders.length = 0;
  state.statusUpdates.length = 0;
  state.attemptLogs.length = 0;
}
function job(retryCount = 1) {
  return {
    request_key: 'idem-test-1',
    retry_count: retryCount,
    order_id: 'internal-order-test-1',
    user_id: 14,
    request_data: {
      supplierPayload: { items: [{ product: 'product-1', property: 'property-1', qty: 1 }] },
      affiliateOrder: { id: 'internal-order-test-1', serial: 'RAB7NA-TEST-1', userId: 14, items: [] }
    }
  };
}

(async () => {
  reset(); fetchScenario = 'success';
  let result = await worker.processAffiliateOrderJob(job(1));
  assert.equal(result.status, 'accepted');
  assert.equal(state.fetchCalls, 1);
  assert.equal(state.queueUpdates.at(-1).status, 'confirmed');
  assert.equal(state.statusUpdates.length, 1, 'confirmed supplier response should update affiliate status once');
  assert.equal(state.attemptLogs.at(-1).supplierContacted, true);

  reset(); fetchScenario = '502';
  result = await worker.processAffiliateOrderJob(job(1));
  assert.equal(result.status, 'unknown', '502 after the supplier call is ambiguous and requires manual review');
  assert.equal(state.fetchCalls, 1);
  assert.equal(state.queueUpdates.at(-1).status, 'unknown');
  assert.equal(state.orderUpdates.at(-1).patch.requestStatus, 'unknown');
  assert.equal(state.attemptLogs.at(-1).requestStatus, 'unknown');
  assert.equal(state.attemptLogs.at(-1).supplierContacted, true);
  assert.equal(state.queueUpdates.at(-1).patch.nextAttemptAt == null, true, 'ambiguous 502 must not schedule an automatic retry');

  reset(); fetchScenario = 'timeout';
  result = await worker.processAffiliateOrderJob(job(1));
  assert.equal(result.status, 'unknown', 'timeout after the supplier call must require manual review');
  assert.equal(state.fetchCalls, 1);
  assert.equal(state.queueUpdates.at(-1).status, 'unknown');
  assert.equal(state.orderUpdates.at(-1).patch.requestStatus, 'unknown');
  assert.equal(state.attemptLogs.at(-1).requestStatus, 'unknown');
  assert.equal(state.attemptLogs.at(-1).supplierContacted, true);
  assert.equal(state.queueUpdates.at(-1).patch.nextAttemptAt == null, true);

  reset(); fetchScenario = 'incomplete';
  result = await worker.processAffiliateOrderJob(job(1));
  assert.equal(result.status, 'unknown');
  assert.equal(state.fetchCalls, 1);
  assert.equal(state.queueUpdates.at(-1).status, 'unknown');
  assert.equal(state.attemptLogs.at(-1).errorMessage.includes('غير مكتمل'), true);
  assert.equal(state.attemptLogs.at(-1).supplierContacted, true);

  reset(); fetchScenario = 'pre-submit-transient';
  result = await worker.processAffiliateOrderJob(job(1));
  assert.equal(result.status, 'retry', 'only an explicitly pre-submit failure may enter automatic retry');
  assert.equal(state.fetchCalls, 1);
  assert.equal(state.queueUpdates.at(-1).status, 'retry');
  assert.equal(state.queueUpdates.at(-1).patch.nextAttemptAt != null, true);
  assert.equal(state.attemptLogs.at(-1).requestStatus, 'retry');
  assert.equal(state.attemptLogs.at(-1).supplierContacted, false);
  fetchScenario = 'success';
  result = await worker.processAffiliateOrderJob(job(2));
  assert.equal(result.status, 'accepted', 'a later retry may succeed after a confirmed pre-submit failure');
  assert.equal(state.fetchCalls, 2);

  reset(); fetchScenario = '502';
  result = await worker.processAffiliateOrderJob(job(5));
  assert.equal(result.status, 'unknown');
  assert.equal(state.fetchCalls, 1);
  assert.equal(state.queueUpdates.at(-1).status, 'unknown');
  assert.equal(state.attemptLogs.at(-1).requestStatus, 'unknown');
  assert.equal(state.queueUpdates.at(-1).patch.nextAttemptAt == null, true);

  reset(); fetchScenario = '400';
  result = await worker.processAffiliateOrderJob(job(1));
  assert.equal(result.status, 'failed');
  assert.equal(state.fetchCalls, 1);
  assert.equal(state.queueUpdates.at(-1).status, 'failed');
  assert.equal(state.statusUpdates.length, 0, 'failed supplier response must not award commission');
  assert.equal(state.attemptLogs.at(-1).requestStatus, 'failed');
  assert.equal(state.attemptLogs.at(-1).supplierContacted, true);

  reset(); fetchScenario = 'success';
  const [firstCycle, secondCycle] = await Promise.all([
    worker.processAffiliateOrderQueue(1),
    worker.processAffiliateOrderQueue(1)
  ]);
  assert.equal(state.fetchCalls, 1, 'two concurrent queue cycles must send the same internal order at most once');
  assert.equal([firstCycle, secondCycle].filter(item => item.processed === 1).length, 1, 'exactly one cycle may process the claimed order');
  assert.equal([firstCycle, secondCycle].filter(item => item.scanned === 0).length, 1, 'the second cycle must see no claim');
  assert.equal(state.savedOrders.length, 1);
  assert.equal(state.savedOrders[0].id, 'internal-order-test-1');

  console.log('dynamic order queue checks: PASS');
  console.log('scenarios: success, ambiguous 502, supplier-received timeout, incomplete response, pre-submit retry, attempt cap, concurrent claim');
  console.log('supplier requests used by this test: mock only');
  console.log('production database touched: NO');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
