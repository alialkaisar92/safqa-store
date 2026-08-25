#!/usr/bin/env node
'use strict';

const assert = require('assert');
const Module = require('module');
const path = require('path');

function loadPostgresWithMockClient(mode) {
  const calls = [];
  const fakeClient = {
    async query(text, params) {
      const sql = String(text).replace(/\s+/g, ' ').trim();
      calls.push({ sql, params });
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (sql.startsWith('INSERT INTO affiliate_order_requests')) return { rows: [], rowCount: 0 };
      if (sql.startsWith('SELECT * FROM affiliate_order_requests')) {
        return {
          rows: [mode === 'mismatch'
            ? { user_id: 999, status: 'pending', order_id: null }
            : { user_id: 7, status: 'pending', order_id: null }],
          rowCount: 1
        };
      }
      if (sql.startsWith('UPDATE affiliate_order_requests SET order_id=')) return { rows: [], rowCount: 1 };
      if (sql.startsWith("INSERT INTO app_documents(collection,doc_id,data,updated_at)")) return { rows: [], rowCount: 1 };
      throw new Error(`Unexpected SQL in isolated test: ${sql}`);
    },
    release() {},
  };
  const fakePool = { on() {}, async connect() { return fakeClient; }, async end() {} };
  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === 'pg') return { Pool: function Pool() { return fakePool; } };
    return originalLoad.call(this, request, parent, isMain);
  };
  process.env.DATABASE_URL = 'mock://queue-visibility-test';
  const modulePath = path.resolve(__dirname, '../lib/postgres.js');
  delete require.cache[modulePath];
  let postgres;
  try { postgres = require(modulePath); } finally { Module._load = originalLoad; }
  return { postgres, calls };
}

async function run() {
  {
    const { postgres, calls } = loadPostgresWithMockClient('missing-document');
    const result = await postgres.createQueuedAffiliateOrder(7, 'idempotency-key-0001', { affiliateOrder: { id: 'order-1' } }, { id: 'order-1', userId: 7, status: 'new' });
    assert.equal(result.mode, 'in_progress');
    assert(calls.some(call => call.sql.startsWith('UPDATE affiliate_order_requests SET order_id=')), 'missing order_id must be repaired');
    assert(calls.some(call => call.sql.includes('ON CONFLICT (collection,doc_id) DO NOTHING')), 'document repair must be insert-if-missing');
    assert.equal(calls.filter(call => call.sql.startsWith('UPDATE app_documents')).length, 0, 'existing order document must never be overwritten');
    await postgres.close();
  }

  {
    const { postgres, calls } = loadPostgresWithMockClient('existing-document');
    await postgres.createQueuedAffiliateOrder(7, 'idempotency-key-0002', { affiliateOrder: { id: 'order-2' } }, { id: 'order-2', userId: 7, status: 'new' });
    const documentInserts = calls.filter(call => call.sql.includes('ON CONFLICT (collection,doc_id) DO NOTHING'));
    assert.equal(documentInserts.length, 1, 'duplicate repair must use one conflict-safe document insert');
    assert.equal(calls.filter(call => call.sql.startsWith('UPDATE app_documents')).length, 0, 'duplicate repair must not overwrite an existing document');
    await postgres.close();
  }

  {
    const { postgres, calls } = loadPostgresWithMockClient('mismatch');
    await assert.rejects(
      () => postgres.createQueuedAffiliateOrder(7, 'idempotency-key-0003', { affiliateOrder: { id: 'order-3' } }, { id: 'order-3', userId: 7, status: 'new' }),
      error => error && error.code === 'IDEMPOTENCY_CONFLICT'
    );
    assert(calls.some(call => call.sql === 'ROLLBACK'), 'user mismatch must rollback');
    assert.equal(calls.filter(call => call.sql.startsWith('UPDATE affiliate_order_requests SET order_id=')).length, 0, 'user mismatch must not repair another user queue row');
    assert.equal(calls.filter(call => call.sql.includes('ON CONFLICT (collection,doc_id) DO NOTHING')).length, 0, 'user mismatch must not insert an order document');
    await postgres.close();
  }

  console.log('queue visibility repair checks: PASS');
  console.log('duplicate missing-link repair: YES');
  console.log('document overwrite protection: YES');
  console.log('user mismatch conflict protection: YES');
  console.log('production database touched: NO');
  console.log('supplier request submitted: NO');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
