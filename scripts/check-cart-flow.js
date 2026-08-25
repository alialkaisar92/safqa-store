const fs = require('fs');

const html = fs.readFileSync('store2.html', 'utf8');
const addStart = html.indexOf('function addCart(i){');
const addEnd = html.indexOf('\nfunction showPriceModal()', addStart);
const addBlock = addStart >= 0 && addEnd > addStart ? html.slice(addStart, addEnd) : '';
const submitStart = html.indexOf('async function submitOrder(){');
const submitEnd = html.indexOf('\nfunction ', submitStart + 10);
const submitBlock = submitStart >= 0 ? html.slice(submitStart, submitEnd > submitStart ? submitEnd : submitStart + 12000) : '';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(addBlock, 'addCart function is missing');
assert(addBlock.includes("toast('تم إضافة المنتج للسلة')"), 'addCart must show the add-to-cart confirmation');
assert(addBlock.includes('closeCart();'), 'addCart must close the cart after adding');
assert(!addBlock.includes('showPriceModal();'), 'addCart must not force the old price modal');
assert(html.includes('function openCart()'), 'openCart function is missing');
assert(html.includes('سعر الجملة'), 'cart must show the wholesale price');
assert(html.includes('سعر البيع للعميل') && html.includes('السعر المقترح للبدء'), 'cart must show the editable sale price and its suggested starting value');
assert(html.includes('سعر الجملة الإجمالي'), 'cart totals must show wholesale total');
assert(html.includes('ربحك المتوقع'), 'cart must show expected profit');
assert(!html.includes('cart-price-locked'), 'old marketer price lock notice must be removed');
assert(html.includes('cart-price-input') && html.includes('data-cart-price-index') && html.includes('updateCartPriceFromInput('), 'marketer sale price editor is missing');
assert(html.includes('function syncCartPricesFromInputs()'), 'checkout price validation is missing');
assert(!html.includes('saveAllCartPrices'), 'separate cart price save flow must be removed');
assert(!html.includes('cartPriceBulkActions'), 'separate cart price save UI must be removed');
assert(!html.includes('readonly'), 'sale price must be editable for marketers');
assert(html.includes("window.openCheckout=function(){") && html.includes("if(typeof recalc==='function')recalc();"), 'checkout must recalculate totals after modal navigation opens it');
assert(submitBlock.includes("if(r.ok&&d.ok)"), 'success must depend on a successful server response');
assert(html.includes('order-success-title'), 'order success message is missing');
assert(html.includes('هنتابع مع عميلك لحد ما يستلم'), 'customer follow-up message is missing');
assert(html.includes('showQueuedOrder') && html.includes('تم استلام طلبك بنجاح'), 'queued order acknowledgement is missing');
assert(html.includes('trackQueuedOrder') && html.includes('fetchQueuedOrderStatus'), 'queued order status polling is missing');
assert(html.includes('sessionStorage.getItem(\'rab7na_order_idempotency_key\')'), 'refresh-safe idempotency storage is missing');
assert(submitBlock.includes('rememberPendingOrder(d.order,body.idempotency_key,orderFingerprint);clearOrderIdempotencyKey();'), 'successful queued orders must release the idempotency key for the next order');
assert(html.includes('rab7na_pending_orders_v2') && html.includes('readPendingOrders'), 'multiple pending orders must be retained safely');
assert(submitBlock.includes("X-Idempotency-Key"), 'idempotency header is missing');
assert(html.includes('finalPrice:Number(c.price||0)'), 'admin-controlled sale price must be sent as finalPrice');
assert(html.includes('originalPrice:Number(c.cost||0)'), 'adjusted wholesale cost must be preserved separately');

console.log('cart flow checks: PASS');
console.log('direct add toast and close cart: YES');
console.log('editable marketer sale price: YES');
console.log('server-gated order success message: YES');
console.log('immediate acknowledgement and status polling: YES');
console.log('idempotency key preserved across refresh: YES');
console.log('network/order submitted by this test: NO');
