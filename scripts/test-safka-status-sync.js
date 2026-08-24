'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const syncSource = fs.readFileSync(path.join(__dirname, '..', 'safka-sync.js'), 'utf8');
const syncStart = syncSource.indexOf('function supplierOrderRecord');
const syncEnd = syncSource.indexOf('function supplierErrors', syncStart);
const syncContext = { module: { exports: {} } };
vm.runInNewContext(syncSource.slice(syncStart, syncEnd) + '\nmodule.exports = { supplierOrderRecord, supplierStatus, supplierShipping };', syncContext);
const { supplierOrderRecord, supplierStatus, supplierShipping } = syncContext.module.exports;

const dbSource = fs.readFileSync(path.join(__dirname, '..', 'lib', 'postgres.js'), 'utf8');
const dbStart = dbSource.indexOf('function webhookStatusDisplay');
const dbEnd = dbSource.indexOf('async function applySafkaOrderWebhook', dbStart);
const dbContext = { module: { exports: {} } };
vm.runInNewContext(dbSource.slice(dbStart, dbEnd) + '\nmodule.exports = { webhookStatusDisplay, webhookShipmentFields };', dbContext);
const { webhookStatusDisplay, webhookShipmentFields } = dbContext.module.exports;

const payload = { data: { _id: 'supplier-123', status: 'shipped', serial_number: 'SK-123', shipment: { tracking_number: 'TRK-987', carrier: 'Safka Delivery' } } };
const record = supplierOrderRecord(payload);
assert.equal(record._id, 'supplier-123');
assert.equal(supplierStatus(payload, record), 'shipped');
assert.deepEqual(supplierShipping(payload, record), { trackingNumber: 'TRK-987', carrier: 'Safka Delivery' });
assert.equal(webhookStatusDisplay('shipped'), 'تم الشحن');
assert.equal(webhookStatusDisplay('delivered'), 'تم التسليم');
assert.deepEqual(webhookShipmentFields(payload, record), { trackingNumber: 'TRK-987', carrier: 'Safka Delivery' });
assert.equal(/ON CONFLICT \(event_key\) DO NOTHING/.test(dbSource), true);
console.log('supplier status and shipment parsing: PASS');
console.log('status mapping shipped/delivered: PASS');
console.log('webhook event deduplication guard: PASS');
console.log('network/order submitted by this test: NO');
