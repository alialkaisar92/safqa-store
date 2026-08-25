'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'store2.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
if (!scripts.length) throw new Error('No inline scripts found');
scripts.forEach((code, index) => new vm.Script(code, { filename: 'store2.html#script-' + (index + 1) }));
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
assert(html.includes("function checkoutField(id){return document.getElementById(id);}"), 'checkout DOM access helper is missing');
assert(html.includes("var nameEl=checkoutField('fName'),phoneEl=checkoutField('fPhone'),addrEl=checkoutField('fAddr'),govEl=checkoutField('fGov'),cityEl=checkoutField('fCity');"), 'checkout still depends on named element globals');
assert(!/if\(!fName\.value|if\(!fPhone\.value|if\(!fAddr\.value|if\(!fGov\.value/.test(html), 'checkout has an unsafe named-element global reference');
assert(html.includes("if(!m||!nameEl||!phoneEl||!addrEl||!govEl||!cityEl)"), 'checkout missing DOM guard');
assert(html.includes("load().catch(function(error)"), 'store boot promise is unhandled');
assert(html.includes("console.warn('[checkout] status polling retry'"), 'status polling exceptions are silently swallowed');
assert(html.includes("if(!Array.isArray(window.cart)||!window.cart.length)"), 'late checkout compatibility wrapper opens an empty checkout');
assert(html.includes('var orderIdempotencyFingerprint'), 'checkout idempotency fingerprint state is missing');
assert(html.includes('rab7na_order_idempotency_fingerprint'), 'checkout must persist the idempotency fingerprint');
assert(html.includes('getOrderIdempotencyKey(orderFingerprint)'), 'checkout must derive idempotency from the current cart');
assert(html.includes('affiliateCancelMdl') && html.includes('affiliateCancelReason') && html.includes('submitAffiliateCancellation'), 'affiliate cancellation UI is missing');
assert(html.includes("/api/affiliate/order-cancel") && html.includes('setInterval(refreshAffiliateLive,5000)'), 'affiliate live refresh or cancellation endpoint is missing');
assert(html.includes('document.hidden') && html.includes("document.addEventListener('visibilitychange'"), 'affiliate polling must pause while the tab is hidden and refresh when visible');
assert(html.includes("openModalById('affiliateCancelMdl',{history:false})"), 'cancellation dialog must not corrupt modal history');
console.log('store2 inline script syntax passed: ' + scripts.length);
console.log('checkout DOM guards: PASS');
console.log('checkout promise/error visibility guards: PASS');
