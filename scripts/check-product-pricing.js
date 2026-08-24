const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'store2.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(server.includes('basePrice: base'), 'server must expose the wholesale/base price');
assert(server.includes('price: effectiveSale'), 'server must expose the default sale price suggestion');
assert(server.includes('const effectiveCommission'), 'server must expose the default commission suggestion');
assert(server.includes('function productWholesalePrice(base, priceUp)') && server.includes('const safeUp'), 'server must calculate the global admin percentage on the wholesale base');
assert(server.includes('function productSuggestedSalePrice(raw, wholesale)'), 'server must keep the supplier suggested sale price separate');
assert(server.includes('const base = productWholesalePrice(rawWholesale, priceUp)') && server.includes('rawWholesalePrice: rawWholesale'), 'server must expose adjusted wholesale and preserve the raw API price');
assert(server.includes('raw.rawWholesalePrice, raw.sale_price, raw.basePrice') && server.includes('raw.wholesale_price, raw.cost'), 'the API sale_price field must take priority over alternate cost fields');
assert(!server.includes('productSalePrice('), 'the global percentage must not be named or applied as a sale-price calculation');
assert(!server.includes('raw.price != null ? raw.price') && !server.includes('source.price != null ? source.price'), 'sale price must not become the percentage base');
assert(server.includes('const finalPrice=Math.round(item.requestedFinalPrice*100)/100') && server.includes('سعر البيع يحدده المسوّق'), 'order final price must come from the marketer request after server validation');
assert(client.includes('function wholePriceOf(p)'), 'client must read the wholesale price from normalized data');
assert(client.includes('function salePriceOf(p)'), 'client must read the suggested sale price from normalized data');
assert(client.includes('function commissionOf(p)'), 'client must read the commission from normalized data');
assert(client.includes('سعر الجملة <b>'), 'product cards must show wholesale price');
assert(client.includes('سعر البيع المقترح <b>'), 'product cards must show the default sale suggestion');
assert(client.includes('عمولتك المتوقعة <b>'), 'product cards must show estimated commission');
assert(client.includes('سعر الجملة المعتمد'), 'checkout modal must label the adjusted wholesale price');
assert(client.includes('سعر البيع للعميل'), 'checkout modal must label the marketer sale price');
assert(client.includes('oninput="updatePricePreview()"') && !client.includes('readonly'), 'checkout sale price must be editable for marketers');
assert(client.includes('عمولتك التقديرية'), 'checkout modal must label estimated commission');
assert(!client.includes('<span class="disc">-15%</span>'), 'product cards must not show a fabricated discount');
assert(!client.includes('4.8 (126)'), 'product cards must not show fabricated ratings');
console.log('product pricing checks: PASS');
console.log('wholesale/default-sale/commission fields: PRESENT');
console.log('fabricated discount/rating: NO');
