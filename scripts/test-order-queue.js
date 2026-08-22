#!/usr/bin/env node
'use strict';

const assert = require('assert');
const Module = require('module');

const originalLoad = Module._load;
const state = {
  fetchCalls: 0,
  queueUpdates: [],
  orderUpdates: [],
  savedOrders: [],
  statusUpdates: []
};
let fetchScenario = null;

const postgresMock = {
  async updateAffiliateOrderQueueState(key, status, patch) { state.queueUpdates.push({ key, status, patch }); },
  async updateAffiliateOrder(orderId, patch) { state.orderUpdates.push({ orderId, patch }); },
  async saveAffiliateOrder(order) { state.savedOrders.push(order); },
  async updateAffiliateOrderStatus(orderId, patch) { state.statusUpdates.push({ orderId, patch }); return { id: orderId, ...patch }; },
  async claimAffiliateOrderJobs() { return []; },
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
        const error = new Error('mock timeout');
        error.name = 'AbortError';
        throw error;
      }
      if (fetchScenario === '502') return { ok: false, status: 502, json: async () => ({}) };
      if (fetchScenario === '400') return { ok: false, status: 400, json: async () => ({ errors: [{ msg: 'invalid customer' }] }) };
      return { ok: true, status: 201, json: async () => ({ data: { id: 'SUP-ORDER-1', status: 'confirmed' } }) };
    };
  }
  return originalLoad.apply(this, arguments);
};

const worker = require('../safka-sync');
Module._load = originalLoad;
assert.equal(typeof worker.processAffiliateOrderJob, 'function', 'worker job function must be exported for isolated testing');

function reset() {
  state.fetchCalls = 0;
  state.queueUpdates.length = 0;
  state.orderUpdates.length = 0;
  state.savedOrders.length = 0;
  state.statusUpdates.length = 0;
}
function job(retryCount = 1) {
  return {
    request_key: 'idem-test-1',
    retry_count: retryCount,
    order_id: 'order-test-1',
    user_id: 14,
    request_data: {
      supplierPayload: { items: [{ product: 'product-1', property: 'property-1', qty: 1 }] },
      affiliateOrder: { id: 'order-test-1', serial: 'RAB7NA-TEST-1', userId: 14, items: [] }
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

  reset(); fetchScenario = '502';
  result = await worker.processAffiliateOrderJob(job(1));
  assert.equal(result.status, 'retry');
  assert.equal(state.fetchCalls, 1);
  assert.equal(state.queueUpdates.at(-1).status, 'retry');
  assert.equal(state.queueUpdates.at(-1).patch.nextAttemptAt != null, true);
  assert.equal(state.orderUpdates.length, 0, 'transient failure must not award commission or fail the order');

  reset(); fetchScenario = '502';
  result = await worker.processAffiliateOrderJob(job(5));
  assert.equal(result.status, 'unknown');
  assert.equal(state.fetchCalls, 1);
  assert.equal(state.queueUpdates.at(-1).status, 'unknown');
  assert.equal(state.orderUpdates.at(-1).patch.requestStatus, 'unknown');

  reset(); fetchScenario = 'timeout';
  result = await worker.processAffiliateOrderJob(job(1));
  assert.equal(result.status, 'unknown');
  assert.equal(state.fetchCalls, 1);
  assert.equal(state.queueUpdates.at(-1).status, 'unknown');
  assert.equal(state.orderUpdates.at(-1).patch.requestStatus, 'unknown');

  reset(); fetchScenario = '400';
  result = await worker.processAffiliateOrderJob(job(1));
  assert.equal(result.status, 'failed');
  assert.equal(state.fetchCalls, 1);
  assert.equal(state.queueUpdates.at(-1).status, 'failed');
  assert.equal(state.statusUpdates.length, 0, 'failed supplier response must not award commission');

  console.log('dynamic order queue checks: PASS');
  console.log('supplier requests used by this test: mock only');
  console.log('production database touched: NO');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
