const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'store2.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(server.includes('basePrice: base'), 'server must expose the wholesale/base price');
assert(server.includes('price: productSalePrice(note, base, priceUp)'), 'server must expose the suggested sale price');
assert(server.includes('commission: extractCommission(note)'), 'server must expose the estimated commission');
assert(client.includes('function wholePriceOf(p)'), 'client must read the wholesale price from normalized data');
assert(client.includes('function salePriceOf(p)'), 'client must read the suggested sale price from normalized data');
assert(client.includes('function commissionOf(p)'), 'client must read the commission from normalized data');
assert(client.includes('الجملة: <b>'), 'product cards must show wholesale price');
assert(client.includes('المقترح: <b>'), 'product cards must show suggested sale price');
assert(client.includes('عمولتك: <b>'), 'product cards must show estimated commission');
assert(client.includes('سعر الجملة من المصنع'), 'checkout modal must label the wholesale price');
assert(client.includes('سعر البيع المقترح للعميل'), 'checkout modal must label the suggested sale price');
assert(client.includes('عمولتك التقديرية'), 'checkout modal must label estimated commission');
assert(!client.includes('<span class="disc">-15%</span>'), 'product cards must not show a fabricated discount');
assert(!client.includes('4.8 (126)'), 'product cards must not show fabricated ratings');
console.log('product pricing checks: PASS');
console.log('wholesale/suggested/commission fields: PRESENT');
console.log('fabricated discount/rating: NO');
