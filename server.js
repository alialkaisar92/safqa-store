const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;
const API_KEY = 'sk_9f6d15ecb31c980ae65661abca57d1e3f7c850811f78569955cb47dea4e46c46';
const BASE_URL = 'https://api.safka-eg.com/api/v1/public';
app.use(express.json());


app.use(express.static(__dirname));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/googleb92b2cd0a1a64ca9.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'googleb92b2cd0a1a64ca9.html'));
});

app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});
app.use(express.static(__dirname));

app.get('/googleb92b2cd0a1a64ca9.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'googleb92b2cd0a1a64ca9.html'));
});

app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});let productsCache = [], priceListCache = [], lastFetch = 0;
let data = { name: 'المسوق', phone: '01000000000', balance: 0, withdrawals: [], orders: [], tickets: [] };

try { if (fs.existsSync('affiliate-data.json')) data = Object.assign(data, JSON.parse(fs.readFileSync('affiliate-data.json'))); } catch (e) {}
function save() { fs.writeFileSync('affiliate-data.json', JSON.stringify(data, null, 2)); }

function cat(n) {
  if (!n) return 'أخرى';
  n = (n + '').toLowerCase();
  if (/طفل|أطفال|رضع|بيبي|baby|kids|لعبة|ناموسية/.test(n)) return 'أطفال';
  if (/شاحن|سماعة|باور|كابل|usb|led|لمبة|أباجورة|بلوتوث|كشاف|بلور|نفاث|طاقة|solar|قلم|ترجمة/.test(n)) return 'إلكترونيات';
  if (/كريم|عطر|مكياج|عناية|بشرة|شعر|سيروم|شد|تجاعيد/.test(n)) return 'جمال';
  if (/حذاء|شبشب|حقيبة|شنطة|دولاب/.test(n)) return 'أحذية وحقائب';
  if (/مطبخ|حاجز|سيليكون|حوض|أواني/.test(n)) return 'مطبخ';
  if (/منزل|ديكور|إضاءة/.test(n)) return 'منزل';
  if (/تنظيف|منظف|تكييف/.test(n)) return 'تنظيف';
  if (/مفك|عدة|أدوات|مسامير|مسدس/.test(n)) return 'أدوات';
  return 'أخرى';
}

async function getProducts() {
  if (productsCache.length && Date.now() - lastFetch < 600000) return productsCache;
  console.log('جاري جلب المنتجات...');
  let all = [];
  try {
    const r1 = await fetch(BASE_URL + '/products?page=1&size=50', { headers: { 'api-safka-key': API_KEY } });
    const d1 = await r1.json();
    all = all.concat(d1.data || []);
    const pages = Math.min(d1.pages || 1, 8);
    for (let p = 2; p <= pages; p++) {
      const r = await fetch(BASE_URL + '/products?page=' + p + '&size=50', { headers: { 'api-safka-key': API_KEY } });
      const d = await r.json();
      all = all.concat(d.data || []);
    }
  } catch (e) { console.error(e.message); }
  all = all.map(p => { p._cat = cat(p.name); return p; });
  productsCache = all;
  lastFetch = Date.now();
  console.log('تم تحميل ' + all.length + ' منتج');
  return all;
}

async function getPriceList() {
  if (priceListCache.length) return priceListCache;
  try {
    const r = await fetch(BASE_URL + '/price-list?page=1&size=50', { headers: { 'api-safka-key': API_KEY } });
    const d = await r.json();
    priceListCache = (d.data || []).filter(g => g.is_active !== false);
  } catch (e) { console.error(e.message); }
  return priceListCache;
}

function mapProduct(p) {
  const prop = (p.properties && p.properties[0]) || {};
  const stock = typeof prop.value === 'number' ? prop.value : (prop.is_available === false ? 0 : 99);
  return {
    id: p._id,
    name: p.name || 'منتج',
    price: p.sale_price || 0,
    cost: p.sale_price || 0,
    propertyId: prop._id || '',
    image: (p.images && p.images[0]) || p.image || '',
    cat: p._cat || 'أخرى',
    barcode: p.barcode || '',
    note: p.note || '',
    media: p.media_url || '',
    desc: p.description || '',
    stock: stock,
    available: prop.is_available !== false && stock > 0
  };
}

app.get('/api/products', async (req, res) => {
  const products = await getProducts();
  res.json(products.map(mapProduct));
});

app.get('/api/price-list', async (req, res) => {
  const list = await getPriceList();
  res.json(list.map(g => ({
    id: g._id,
    name: g.governorateNameAr || g.governorateName,
    price: g.price,
    cities: (g.cities || []).map(c => ({ id: c.id, name: c.city_name_ar }))
  })));
});

app.get('/api/me', (req, res) => res.json(data));

app.post('/api/create-order', async (req, res) => {
  try {
    const b = req.body;
    if (!b.client_name || !b.client_phone1 || !b.client_address || !b.shipping_governorate || !b.items || !b.items.length) {
      return res.json({ error: 'بيانات ناقصة' });
    }
    if (typeof b.commission !== 'number' || b.commission < 0) return res.json({ error: 'عمولة غير صحيحة' });
    if (typeof b.shipping_cost !== 'number' || b.shipping_cost < 0) return res.json({ error: 'سعر شحن غير صحيح' });

    const body = {
      items: b.items,
      client_name: b.client_name,
      client_phone1: b.client_phone1,
      client_phone2: '',
      client_address: b.client_address,
      shipping_governorate: b.shipping_governorate,
      city: b.city || '',
      total: b.total,
      commission: b.commission,
      note: b.note || ''
    };

    const r = await fetch(BASE_URL + '/orders', {
      method: 'POST',
      headers: { 'api-safka-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const d = await r.json();
    if (!r.ok) return res.json({ error: d.errors ? d.errors.map(e => e.msg).join(', ') : 'فشل إنشاء الطلب' });

    data.orders.unshift({
      id: d.data?._id || Date.now(),
      serial: d.data?.serial_number || '',
      products: b.productNames || [],
      customer: b.client_name,
      phone: b.client_phone1,
      total: b.total,
      shipping: b.shipping_cost,
      commission: b.commission,
      status: 'قيد التأكيد',
      date: new Date().toISOString().slice(0, 10),
      address: b.client_address
    });
    save();
    res.json({ message: 'تم إنشاء الطلب بنجاح ✓', data: d.data });
  } catch (e) {
    console.error(e);
    res.json({ error: 'خطأ في السيرفر' });
  }
});

app.post('/api/withdraw', (req, res) => {
  const { amount, method, details } = req.body;
  if (!amount || amount <= 0) return res.json({ error: 'مبلغ غير صحيح' });
  if (!details) return res.json({ error: 'التفاصيل مطلوبة' });
  if (amount > data.balance) return res.json({ error: 'الرصيد غير كافي' });
  data.balance -= amount;
  data.withdrawals.push({ id: Date.now(), amount, method, details, status: 'pending', date: new Date().toISOString().slice(0, 10) });
  save();
  res.json({ message: 'تم إرسال طلب السحب ✓' });
});

app.post('/api/profile', (req, res) => {
  if (req.body.name) data.name = req.body.name;
  if (req.body.phone) data.phone = req.body.phone;
  save();
  res.json({ message: 'تم الحفظ', data });
});

app.post('/api/support', (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.json({ error: 'اكتب رسالتك' });
  data.tickets = data.tickets || [];
  data.tickets.unshift({ id: Date.now(), message: message.trim(), status: 'جديد', date: new Date().toISOString().slice(0, 10), reply: '' });
  save();
  res.json({ message: 'تم إرسال رسالتك للدعم ✓' });
});app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'views','index.html'));
});

app.listen(PORT, () => {
  console.log('المتجر: http://localhost:' + PORT);
  getProducts();
  getPriceList();
});

