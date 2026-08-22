const fs = require('fs');
const path = require('path');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
assert(server.includes('const supplierItems=normalizedItems.map(item=>({product:item.product,property:item.property,qty:item.qty}));'), 'supplier items are not sanitized to documented fields');
assert(server.includes('items:supplierItems'), 'sanitized items are not sent');
assert(server.includes('commission:Number(commission)'), 'commission is not numeric');
assert(server.includes('total:Number(total)'), 'total is not numeric');
const route = server.slice(server.indexOf("app.post('/api/create-order'"), server.indexOf("app.get('/api/support/whatsapp'"));
assert(!route.includes('shipping_cost:shippingCost'), 'internal shipping_cost still sent to supplier');
assert(!route.includes('items:items'), 'raw internal items still sent to supplier');
console.log('Safka payload contract checks: PASS');
console.log('supplier item fields: product, property, qty');
console.log('internal pricing fields sent: NO');
console.log('new order submitted by this test: NO');
