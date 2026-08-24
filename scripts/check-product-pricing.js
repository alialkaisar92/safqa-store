const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'store2.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(server.includes('basePrice: base'), 'server must expose the wholesale/base price');
assert(server.includes('price: effectiveSale'), 'server must expose the admin-controlled sale price');
assert(server.includes('const effectiveCommission'), 'server must expose the admin-controlled commission');
assert(server.includes('function productWholesalePrice(base, priceUp)') && server.includes('const safeUp'), 'server must calculate the global admin percentage on the wholesale base');
assert(server.includes('function productSuggestedSalePrice(raw, wholesale)'), 'server must keep the supplier suggested sale price separate');
assert(server.includes('const base = productWholesalePrice(rawWholesale, priceUp)') && server.includes('rawWholesalePrice: rawWholesale'), 'server must expose adjusted wholesale and preserve the raw API price');
assert(!server.includes('productSalePrice('), 'the global percentage must not be named or applied as a sale-price calculation');
assert(!server.includes('raw.price != null ? raw.price') && !server.includes('source.price != null ? source.price'), 'sale price must not become the percentage base');
assert(server.includes('const effectiveSale = lockedSale != null ? lockedSale : suggestedSale'), 'sale price must remain supplier-suggested unless explicitly locked by admin');
assert(client.includes('function wholePriceOf(p)'), 'client must read the wholesale price from normalized data');
assert(client.includes('function salePriceOf(p)'), 'client must read the suggested sale price from normalized data');
assert(client.includes('function commissionOf(p)'), 'client must read the commission from normalized data');
assert(client.includes('سعر الجملة <b>'), 'product cards must show wholesale price');
assert(client.includes('سعر البيع المقترح <b>'), 'product cards must show admin-controlled sale price');
assert(client.includes('عمولتك المتوقعة <b>'), 'product cards must show estimated commission');
assert(client.includes('سعر الجملة المعتمد'), 'checkout modal must label the adjusted wholesale price');
assert(client.includes('سعر البيع المقترح من المورد'), 'checkout modal must label the supplier suggested sale price');
assert(client.includes('readonly aria-readonly="true"'), 'checkout sale price must be readonly for marketers');
assert(client.includes('عمولتك التقديرية'), 'checkout modal must label estimated commission');
assert(!client.includes('<span class="disc">-15%</span>'), 'product cards must not show a fabricated discount');
assert(!client.includes('4.8 (126)'), 'product cards must not show fabricated ratings');
console.log('product pricing checks: PASS');
console.log('wholesale/admin-sale/commission fields: PRESENT');
console.log('fabricated discount/rating: NO');
