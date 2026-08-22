'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'store2.html'), 'utf8');
const start = html.indexOf("var orderIdempotencyKey='';");
const end = html.indexOf('function resetOrderMessage', start);
if (start < 0 || end < 0) throw new Error('checkout idempotency helpers not found');
const source = html.slice(start, end);
const values = new Map();
let sequence = 0;
const storage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); },
};
const context = {
  window: { crypto: { randomUUID: () => 'generated-' + (++sequence) } },
  crypto: { randomUUID: () => 'generated-' + (++sequence) },
  sessionStorage: storage,
  Date,
  Math,
  JSON,
};
vm.runInNewContext(source, context, { filename: 'store2.html#checkout-idempotency' });
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
const first = context.getOrderIdempotencyKey('cart-A');
assert(first === 'generated-1', 'first fingerprint should generate a key');
assert(context.getOrderIdempotencyKey('cart-A') === first, 'same fingerprint should reuse its key');
const second = context.getOrderIdempotencyKey('cart-B');
assert(second !== first, 'new fingerprint must generate a new key');
assert(storage.getItem('rab7na_order_idempotency_fingerprint') === 'cart-B', 'new fingerprint must be persisted');
values.set('rab7na_order_idempotency_key', 'legacy-key');
values.delete('rab7na_order_idempotency_fingerprint');
context.clearOrderIdempotencyKey();
values.set('rab7na_order_idempotency_key', 'legacy-key');
const recovered = context.getOrderIdempotencyKey('cart-C');
assert(recovered !== 'legacy-key', 'legacy key without fingerprint must not be reused');
context.clearOrderIdempotencyKey();
assert(storage.getItem('rab7na_order_idempotency_key') === null, 'clear must remove the key');
assert(storage.getItem('rab7na_order_idempotency_fingerprint') === null, 'clear must remove the fingerprint');
console.log('checkout idempotency fingerprint tests: PASS');
