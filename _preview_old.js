const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3001;
const API_KEY = 'sk_9f6d15ecb31c980ae65661abca57d1e3f7c850811f78569955cb47dea4e46c46';
const BASE_URL = 'https://api.safka-eg.com/api/v1/public';
app.use(express.json());


app.use(express.static(__dirname));

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
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Rab7na | منصة التسويق بالعمولة</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--p:#0d9488;--pd:#0f766e;--bg:#f0f4f8;--card:#fff;--text:#0f172a;--muted:#64748b;--accent:#f59e0b;--danger:#ef4444;--ok:#10b981}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{font-family:Cairo,sans-serif;background:var(--bg);color:var(--text);padding-bottom:76px}
.header{background:#ffffff;color:#111827;padding:12px 16px;position:sticky;top:0;z-index:100;display:flex;justify-content:space-between;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.08)}
.logo{font-weight:800;font-size:1.7rem}
.cart-btn{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.35);color:#111827;padding:8px 14px;border-radius:50px;font-weight:700;font-size:.85rem;cursor:pointer;font-family:Cairo,sans-serif;position:relative}
.cart-btn .badge{position:absolute;top:-6px;left:-6px;background:var(--accent);color:#111827;border-radius:50%;min-width:20px;height:20px;font-size:.7rem;display:flex;align-items:center;justify-content:center;font-weight:800}
.nav{position:fixed;bottom:0;left:0;right:0;background:#fff;display:flex;border-top:1px solid #e2e8f0;z-index:100;box-shadow:0 -8px 30px rgba(0,0,0,.06);padding-bottom:env(safe-area-inset-bottom)}
.nav button{flex:1;border:none;background:none;padding:10px 4px;font-family:Cairo,sans-serif;font-size:.68rem;font-weight:700;color:var(--muted);cursor:pointer}
.nav button.active{color:var(--pd)}
.nav .ic{display:block;font-size:1.25rem;margin-bottom:2px}
.page{display:none;padding:14px;max-width:640px;margin:0 auto}
.page.active{display:block}
.search{width:100%;padding:12px 16px;border:none;border-radius:50px;font-family:Cairo,sans-serif;font-size:.95rem;margin-bottom:12px;box-shadow:0 2px 12px rgba(0,0,0,.06);outline:none}
.cats{display:flex;gap:8px;overflow-x:auto;margin-bottom:12px;scrollbar-width:none;padding-bottom:4px}
.cats::-webkit-scrollbar{display:none}
.c{padding:7px 14px;border-radius:50px;border:1.5px solid #e2e8f0;background:#fff;font-family:Cairo,sans-serif;font-weight:700;font-size:.78rem;color:var(--muted);cursor:pointer;white-space:nowrap}
.c.active{background:var(--pd);border-color:var(--pd);color:#111827}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
@media(min-width:480px){.grid{grid-template-columns:repeat(3,1fr)}}
.card{background:var(--card);border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.05);cursor:pointer;transition:transform .15s}
.card:active{transform:scale(.97)}
.card img{width:100%;aspect-ratio:1;object-fit:cover;background:#e2e8f0}
.card .b{padding:10px}
.card .t{font-size:.82rem;font-weight:700;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.3em;margin-bottom:4px;line-height:1.3}
.card .pr{font-size:.95rem;font-weight:800;color:var(--pd)}
.card .stock{font-size:.7rem;margin-top:4px;font-weight:600}
.stock-ok{color:var(--ok)}.stock-low{color:var(--accent)}.stock-out{color:var(--danger)}
.pm{position:fixed;inset:0;background:#fff;z-index:300;display:none;flex-direction:column;overflow-y:auto}
.pm.show{display:flex}
.pm-h{position:sticky;top:0;background:#ffffff;color:#111827;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;z-index:5}
.pm-h h3{font-size:1.05rem;font-weight:700}
.pm-h button{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.22);border:none;color:#111827;font-size:1.4rem;cursor:pointer}
.pm-b{padding:16px;padding-bottom:40px}
.pm-b>img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:18px;margin-bottom:14px;background:#f1f5f9}
.pm-name{font-size:1.2rem;font-weight:800;margin-bottom:6px;line-height:1.35}
.pm-price{font-size:1.5rem;font-weight:800;color:var(--pd);margin-bottom:12px}
.box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;margin-bottom:10px}
.box .l{font-size:.75rem;color:var(--muted);margin-bottom:2px}.box .v{font-weight:700;font-size:.95rem}
.note-box{background:linear-gradient(135deg,#fef3c7,#fde68a);border:none}
label{display:block;font-size:.82rem;font-weight:600;margin:12px 0 6px}
input,select,textarea{width:100%;padding:13px 14px;border:1.5px solid #e2e8f0;border-radius:14px;font-family:Cairo,sans-serif;font-size:.95rem;outline:none;background:#fff}
input:focus,select:focus,textarea:focus{border-color:var(--p);box-shadow:0 0 0 3px rgba(13,148,136,.12)}
textarea{min-height:90px;resize:vertical}
.qty-row{display:flex;align-items:center;gap:12px;margin:12px 0}
.qty-btn{width:42px;height:42px;border-radius:12px;border:1.5px solid #e2e8f0;background:#fff;font-size:1.3rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:Cairo,sans-serif}
.qty-btn:active{background:#f1f5f9}
.qty-val{font-size:1.2rem;font-weight:800;min-width:36px;text-align:center}
.btn{width:100%;padding:15px;border:none;border-radius:16px;font-family:Cairo,sans-serif;font-weight:800;font-size:1rem;cursor:pointer;transition:transform .1s,opacity .15s}
.btn:active{transform:scale(.98)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-accent{background:linear-gradient(135deg,#f59e0b,#d97706);color:#111827;box-shadow:0 6px 20px rgba(245,158,11,.35)}
.btn-primary{background:#ffffff;color:#111827;box-shadow:0 6px 20px rgba(13,148,136,.3)}
.btn-danger{background:#fee2e2;color:#991b1b}
.drive{display:block;text-align:center;padding:12px;background:#f0fdfa;border-radius:14px;color:var(--pd);font-weight:700;text-decoration:none;margin:10px 0;font-size:.9rem}
.hint{font-size:.75rem;color:var(--danger);margin-top:4px;display:none}
.cart-item{display:flex;gap:12px;background:var(--card);border-radius:16px;padding:14px;margin-bottom:10px;box-shadow:0 2px 10px rgba(0,0,0,.04);align-items:flex-start}
.cart-item img{width:72px;height:72px;border-radius:12px;object-fit:cover;flex-shrink:0}
.cart-item .info{flex:1;min-width:0}
.cart-item .name{font-size:.88rem;font-weight:700;line-height:1.3;margin-bottom:4px}
.cart-item .meta{font-size:.78rem;color:var(--muted)}
.cart-item .price{font-weight:800;color:var(--pd);font-size:.95rem;margin-top:4px}
.cart-item .actions{display:flex;align-items:center;gap:8px;margin-top:8px}
.cart-item .qbtn{width:32px;height:32px;border-radius:10px;border:1.5px solid #e2e8f0;background:#fff;font-weight:800;cursor:pointer;font-family:Cairo,sans-serif}
.cart-item .qval{font-weight:800;min-width:24px;text-align:center}
.cart-item .rm{background:none;border:none;color:var(--danger);font-size:.8rem;font-weight:700;cursor:pointer;font-family:Cairo,sans-serif;margin-right:auto}
.cart-footer{position:sticky;bottom:76px;background:#fff;padding:14px 16px;border-radius:20px 20px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.08);margin:16px -14px -14px}
.summary{background:#f0fdfa;border-radius:16px;padding:16px;margin:14px 0;border:1px solid #ccfbf1}
.summary .line{display:flex;justify-content:space-between;align-items:center;margin:8px 0;font-size:.92rem}
.summary .line.total{font-weight:800;font-size:1.7rem;color:var(--pd);border-top:1.5px solid #99f6e4;padding-top:10px;margin-top:10px}
.summary .line.comm{color:var(--pd);font-weight:700}
.summary input{width:100px;padding:8px 10px;text-align:center;font-weight:700;border-radius:10px;border:1.5px solid #e2e8f0;font-family:Cairo,sans-serif}
.msg{text-align:center;margin-top:10px;font-weight:700;font-size:.9rem;min-height:24px}
.msg.ok{color:var(--ok)}.msg.err{color:var(--danger)}
.order{background:var(--card);border-radius:16px;padding:14px;margin-bottom:10px;box-shadow:0 2px 10px rgba(0,0,0,.04)}
.order-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px}
.order-name{font-weight:700;font-size:.88rem;flex:1}
.status{font-size:.72rem;padding:3px 10px;border-radius:20px;font-weight:700;white-space:nowrap}
.s1{background:#d1fae5;color:#065f46}.s2{background:#fef3c7;color:#92400e}.s3{background:#dbeafe;color:#1e40af}.s4{background:#fee2e2;color:#991b1b}
.order-meta{font-size:.8rem;color:var(--muted);line-height:1.55}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.stat{background:var(--card);border-radius:16px;padding:16px;box-shadow:0 2px 10px rgba(0,0,0,.04)}
.stat .l{font-size:.78rem;color:var(--muted)}.stat .v{font-size:1.3rem;font-weight:800;color:var(--pd);margin-top:4px}
.empty{text-align:center;padding:48px 16px;color:var(--muted)}
.empty .ic{font-size:2.5rem;margin-bottom:8px}
.ws{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.w{border:2px solid #e2e8f0;border-radius:14px;padding:12px;text-align:center;cursor:pointer;font-size:.8rem;font-weight:700}
.w.sel{border-color:var(--p);background:#f0fdfa}
.w .i{width:30px;height:30px;border-radius:8px;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;color:#111827;font-weight:800}
.ticket{background:var(--card);border-radius:14px;padding:14px;margin-bottom:10px;border:1px solid #e2e8f0}
.ticket .date{font-size:.75rem;color:var(--muted)}.ticket .txt{margin-top:6px;font-size:.9rem;line-height:1.5}
.field-row{display:flex;gap:10px;align-items:center}
.field-row input{flex:1}
.section-title{font-size:1rem;font-weight:800;margin-bottom:12px}
</style>
</head>
<body>
<header class="header">
  <div class="logo" id="ht">Rab7na</div>
  <button class="cart-btn" onclick="go('cart')">🛒 السلة<span class="badge" id="cc">0</span></button>
</header>

<div class="page active" id="p-store">
  <input class="search" id="s" placeholder="ابحث عن منتج أو باركود...">
  <div class="cats" id="cats"></div>
  <div class="grid" id="g"></div>
</div>

<div class="page" id="p-cart">
  <div id="cartList"></div>
  <div id="cartEmpty" class="empty"><div class="ic">🛒</div>السلة فارغة</div>
  <div class="cart-footer" id="cartFooter" style="display:none">
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-weight:700">
      <span>الإجمالي</span><span id="cartTotal" style="color:var(--pd);font-size:1.7rem">0 ج.م</span>
    </div>
    <button class="btn btn-primary" onclick="go('checkout')">إتمام الطلب للعميل</button>
  </div>
</div>

<div class="page" id="p-checkout">
  <div class="section-title">① بيانات العميل</div>
  <label>اسم العميل</label><input id="cName" placeholder="الاسم الكامل">
  <label>رقم التليفون</label><input id="cPhone" type="tel" placeholder="01xxxxxxxxx">
  <label>العنوان بالتفصيل</label><input id="cAddress" placeholder="الشارع - المنطقة - علامة مميزة">
  <label>المحافظة</label><select id="gov" onchange="onGov()"></select>
  <label>المدينة</label><select id="city"><option value="">اختر المدينة</option></select>

  <div class="section-title" style="margin-top:20px">② الشحن والعمولة</div>
  <label>سعر الشحن (ج.م)</label>
  <input type="number" id="shipInput" min="0" value="0" oninput="recalc()">
  <p style="font-size:.75rem;color:var(--muted);margin-top:4px">افتراضي من المحافظة — عدّله بحرية (0 = مجاني)</p>

  <label>عمولة المسوق (ج.م)</label>
  <input type="number" id="commInput" min="0" value="0" oninput="recalc()">
  <p style="font-size:.75rem;color:var(--muted);margin-top:4px">عدّل عمولتك — لا يُسمح بقيم سالبة</p>

  <div class="summary" id="sumBox">
    <div class="line"><span>المنتجات</span><span id="sumProd">0</span></div>
    <div class="line"><span>الشحن</span><span id="sumShip">0</span></div>
    <div class="line"><span>عمولة المسوق</span><span id="sumComm">0</span></div>
    <div class="line total"><span>الإجمالي على العميل</span><span id="sumTotal">0</span></div>
    <div class="line comm"><span>صافي ربحك</span><span id="sumProfit">0</span></div>
  </div>

  <button class="btn btn-primary" id="btnSubmit" onclick="submitOrder()">تأكيد الطلب</button>
  <p class="msg" id="oMsg"></p>
</div>

<div class="page" id="p-orders"><div id="oList"></div></div>

<div class="page" id="p-profile">
  <div class="stat-grid">
    <div class="stat"><div class="l">الرصيد</div><div class="v" id="bal">0</div></div>
    <div class="stat"><div class="l">الطلبات</div><div class="v" id="oCnt">0</div></div>
  </div>
  <label>الاسم</label><input id="pName">
  <label>رقم الهاتف</label><input id="pPhone">
  <button class="btn btn-primary" onclick="saveProf()" style="margin-top:14px">حفظ</button>
  <p class="msg" id="pMsg"></p>
</div>

<div class="page" id="p-withdraw">
  <div class="stat"><div class="l">الرصيد المتاح</div><div class="v" id="wBal">0 ج.م</div></div>
  <div style="height:12px"></div>
  <div class="ws">
    <div class="w sel" data-m="vodafone" onclick="sw(this)"><div class="i" style="background:#e60000">V</div>فودافون</div>
    <div class="w" data-m="instapay" onclick="sw(this)"><div class="i" style="background:#1e40af">IP</div>إنستاباي</div>
    <div class="w" data-m="orange" onclick="sw(this)"><div class="i" style="background:#ff7900">O</div>أورنج</div>
    <div class="w" data-m="bank" onclick="sw(this)"><div class="i" style="background:#0f766e">ب</div>بنكي</div>
  </div>
  <label>المبلغ</label><input type="number" id="wAmt" placeholder="المبلغ">
  <label>رقم المحفظة / الحساب</label><input id="wDet" placeholder="01xxxxxxxxx">
  <button class="btn btn-primary" onclick="doWd()" style="margin-top:12px">تأكيد السحب</button>
  <p class="msg" id="wMsg"></p>
  <p style="font-size:.78rem;color:var(--muted);text-align:center;margin-top:10px">العمولة تُضاف بعد التسليم فقط</p>
</div>

<div class="page" id="p-support">
  <div class="section-title">الدعم الفني</div>
  <label>رسالتك</label>
  <textarea id="sMsg" placeholder="اكتب مشكلتك أو استفسارك..."></textarea>
  <button class="btn btn-primary" onclick="sendSupport()" style="margin-top:12px">إرسال للدعم</button>
  <p class="msg" id="sRes"></p>
  <div id="tickets" style="margin-top:20px"></div>
</div>

<div class="pm" id="pm">
  <div class="pm-h"><h3>تفاصيل المنتج</h3><button onclick="closeP()">×</button></div>
  <div class="pm-b">
    <img id="pm-img" src="" alt="">
    <div class="pm-name" id="pm-name"></div>
    <div class="pm-price" id="pm-price"></div>
    <div class="box"><div class="l">كود المنتج</div><div class="v" id="pm-code">—</div></div>
    <div class="box" id="pm-stock-box"><div class="l">المخزون</div><div class="v" id="pm-stock">—</div></div>
    <div class="box note-box"><div class="l">ملاحظات Rab7na</div><div class="v" id="pm-note">—</div></div>
    <a class="drive" id="pm-drive" href="#" target="_blank" style="display:none">📁 صور وفيديوهات على الطبيعة</a>
    <div id="pm-desc" style="font-size:.88rem;line-height:1.7;color:#475569;margin:10px 0"></div>

    <label>سعر البيع للعميل (ج.م)</label>
    <input type="number" id="editPrice" oninput="checkMin()">
    <div class="hint" id="minHint">لا يمكن البيع بأقل من السعر الأساسي</div>

    <label>الكمية</label>
    <div class="qty-row">
      <button class="qty-btn" onclick="chgQty(-1)">−</button>
      <span class="qty-val" id="qtyVal">1</span>
      <button class="qty-btn" onclick="chgQty(1)">+</button>
    </div>
    <div class="hint" id="stockHint">الكمية أكبر من المخزون المتاح</div>

    <button class="btn btn-accent" id="btnAdd" onclick="addCart()">🛒 أضف إلى السلة</button>
  </div>
</div>

<nav class="nav">
  <button class="active" data-p="store" onclick="go('store')"><span class="ic">🏪</span>المتجر</button>
  <button data-p="orders" onclick="go('orders')"><span class="ic">📦</span>طلباتي</button>
  <button data-p="withdraw" onclick="go('withdraw')"><span class="ic">💰</span>سحب</button>
  <button data-p="profile" onclick="go('profile')"><span class="ic">👤</span>حسابي</button>
  <button data-p="support" onclick="go('support')"><span class="ic">💬</span>دعم</button>
</nav><script>
let products=[], priceList=[], cart=JSON.parse(localStorage.getItem('scart')||'[]'), cur=null, qty=1, submitting=false, cc='all', cs='', wM='vodafone';
const titles={store:'Rab7na',cart:'السلة',checkout:'إتمام الطلب',orders:'طلباتي',profile:'حسابي',withdraw:'سحب الأرباح',support:'الدعم'};

function updCC(){document.getElementById('cc').textContent=cart.reduce((s,i)=>s+(i.qty||1),0)}
function go(p){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  document.getElementById('p-'+p).classList.add('active');
  document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));
  const n=document.querySelector('.nav button[data-p="'+p+'"]'); if(n) n.classList.add('active');
  document.getElementById('ht').innerHTML='<div style="display:flex;align-items:center;gap:12px"><div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;color:#fff;font-size:26px;font-weight:900">E</div><div><div style="font-size:28px;font-weight:900;color:#fff">'+(titles[p]||'Rab7na')+'</div><div style="font-size:12px;opacity:.9">Affiliate Marketing Platform</div></div></div>';
  if(p==='cart') renderCart();
  if(p==='orders') loadOrders();
  if(p==='profile'||p==='withdraw') loadMe();
  if(p==='checkout'){ initCheckout(); recalc(); }
  if(p==='support') loadTickets();
}

function stockLabel(s, avail){
  if(!avail || s<=0) return '<span class="stock-out">نفد المخزون</span>';
  if(s<=5) return '<span class="stock-low">متبقي: '+s+' قطعة فقط</span>';
  return '<span class="stock-ok">متوفر: '+s+' قطعة</span>';
}

async function loadProducts(){
  const r=await fetch('/api/products'); products=await r.json();
  const cats=['الكل',...new Set(products.map(p=>p.cat))];
  document.getElementById('cats').innerHTML=cats.map((c,i)=>'<button class="c'+(i===0?' active':'')+'" data-c="'+(c==='الكل'?'all':c)+'">'+c+'</button>').join('');
  renderP();
}
function renderP(){
  let f=products;
  if(cc!=='all') f=f.filter(p=>p.cat===cc);
  if(cs.trim()){const q=cs.trim().toLowerCase();f=f.filter(p=>p.name.toLowerCase().includes(q)||(p.barcode||'').toLowerCase().includes(q))}
  document.getElementById('g').innerHTML=f.map(p=>{
    const i=products.indexOf(p);
    return '<div class="card" onclick="openP('+i+')"><img src="'+(p.image||'')+'" loading="lazy"><div class="b"><div class="t">'+p.name+'</div><div class="pr">'+Number(p.price).toLocaleString('ar-EG')+' ج.م</div><div class="stock">'+stockLabel(p.stock,p.available)+'</div></div></div>';
  }).join('')||'<div class="empty">مفيش منتجات</div>';
}

function openP(i){
  cur=products[i]; if(!cur) return;
  qty=1;
  document.getElementById('pm-img').src=cur.image||'';
  document.getElementById('pm-name').textContent=cur.name;
  document.getElementById('pm-price').textContent=Number(cur.price).toLocaleString('ar-EG')+' ج.م';
  document.getElementById('pm-code').textContent=cur.barcode||'—';
  document.getElementById('pm-stock').innerHTML=stockLabel(cur.stock,cur.available);
  document.getElementById('pm-note').textContent=cur.note||'—';
  document.getElementById('pm-desc').innerHTML=cur.desc||'';
  document.getElementById('editPrice').value=cur.price;
  document.getElementById('editPrice').min=cur.price;
  document.getElementById('qtyVal').textContent='1';
  document.getElementById('minHint').style.display='none';
  document.getElementById('stockHint').style.display='none';
  const btn=document.getElementById('btnAdd');
  btn.disabled=!cur.available; btn.style.opacity=cur.available?'1':'.5';
  btn.textContent=cur.available?'🛒 أضف إلى السلة':'نفد المخزون';
  const d=document.getElementById('pm-drive');
  if(cur.media){d.href=cur.media;d.style.display='block'}else d.style.display='none';
  document.getElementById('pm').classList.add('show');
  document.body.style.overflow='hidden';
}
function closeP(){document.getElementById('pm').classList.remove('show');document.body.style.overflow=''}

function checkMin(){
  const v=Number(document.getElementById('editPrice').value);
  const min=Number(cur.price);
  const ok=v>=min;
  document.getElementById('minHint').style.display=ok?'none':'block';
  document.getElementById('btnAdd').disabled=!ok||!cur.available;
  document.getElementById('btnAdd').style.opacity=(!ok||!cur.available)?'.5':'1';
}
function chgQty(d){
  const max=cur?cur.stock:99;
  qty=Math.max(1,Math.min(max,qty+d));
  document.getElementById('qtyVal').textContent=qty;
  document.getElementById('stockHint').style.display=(qty>max)?'block':'none';
}

function addCart(){
  if(!cur||!cur.available) return;
  const sale=Number(document.getElementById('editPrice').value);
  if(sale<Number(cur.price)) return;
  if(qty>cur.stock){document.getElementById('stockHint').style.display='block';return}
  const exist=cart.find(x=>x.id===cur.id && x.price===sale);
  if(exist){
    if(exist.qty+qty>cur.stock){alert('الكمية الإجمالية أكبر من المخزون');return}
    exist.qty+=qty;
  } else {
    cart.push({id:cur.id,name:cur.name,price:sale,basePrice:cur.price,cost:cur.cost,propertyId:cur.propertyId,image:cur.image,barcode:cur.barcode,stock:cur.stock,qty:qty});
  }
  localStorage.setItem('scart',JSON.stringify(cart));
  updCC();
  const btn=document.getElementById('btnAdd');
  btn.textContent='✓ تم الإضافة';
  setTimeout(()=>{btn.textContent='🛒 أضف إلى السلة';closeP()},800);
}

function renderCart(){
  const list=document.getElementById('cartList'), empty=document.getElementById('cartEmpty'), foot=document.getElementById('cartFooter');
  if(!cart.length){list.innerHTML='';empty.style.display='block';foot.style.display='none';return}
  empty.style.display='none';foot.style.display='block';
  let total=0;
  list.innerHTML=cart.map((it,i)=>{
    total+=it.price*it.qty;
    return '<div class="cart-item"><img src="'+(it.image||'')+'"><div class="info"><div class="name">'+it.name+'</div><div class="meta">'+stockLabel(it.stock,true)+'</div><div class="price">'+(it.price*it.qty).toLocaleString('ar-EG')+' ج.م <small style="color:var(--muted);font-weight:600">('+it.price+' × '+it.qty+')</small></div><div class="actions"><button class="qbtn" onclick="cartQty('+i+',-1)">−</button><span class="qval">'+it.qty+'</span><button class="qbtn" onclick="cartQty('+i+',1)">+</button><button class="rm" onclick="rmCart('+i+')">حذف</button></div></div></div>';
  }).join('');
  document.getElementById('cartTotal').textContent=total.toLocaleString('ar-EG')+' ج.م';
}
function cartQty(i,d){
  const it=cart[i]; if(!it) return;
  const nq=it.qty+d;
  if(nq<1){rmCart(i);return}
  if(nq>it.stock){alert('المخزون المتاح: '+it.stock);return}
  it.qty=nq; localStorage.setItem('scart',JSON.stringify(cart)); updCC(); renderCart();
}
function rmCart(i){cart.splice(i,1);localStorage.setItem('scart',JSON.stringify(cart));updCC();renderCart()}

async function loadPrices(){
  const r=await fetch('/api/price-list'); priceList=await r.json();
  document.getElementById('gov').innerHTML='<option value="">اختر المحافظة</option>'+priceList.map(g=>'<option value="'+g.id+'" data-price="'+g.price+'">'+g.name+' ('+g.price+' ج.م)</option>').join('');
}
function onGov(){
  const g=priceList.find(x=>x.id===document.getElementById('gov').value);
  document.getElementById('city').innerHTML='<option value="">اختر المدينة</option>'+(g?(g.cities||[]).map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join(''):'');
  if(g) document.getElementById('shipInput').value=g.price;
  recalc();
}
function initCheckout(){
  if(!cart.length){go('cart');return}
  const pTotal=cart.reduce((s,i)=>s+i.price*i.qty,0);
  const cTotal=cart.reduce((s,i)=>s+(i.cost||i.basePrice)*i.qty,0);
  document.getElementById('commInput').value=Math.max(0,pTotal-cTotal);
  const g=priceList.find(x=>x.id===document.getElementById('gov').value);
  if(g) document.getElementById('shipInput').value=g.price;
  else document.getElementById('shipInput').value=0;
}
function recalc(){
  const pTotal=cart.reduce((s,i)=>s+i.price*i.qty,0);
  let ship=Number(document.getElementById('shipInput').value);
  let comm=Number(document.getElementById('commInput').value);
  if(isNaN(ship)||ship<0) ship=0;
  if(isNaN(comm)||comm<0) comm=0;
  document.getElementById('sumProd').textContent=pTotal.toLocaleString('ar-EG')+' ج.م';
  document.getElementById('sumShip').textContent=ship.toLocaleString('ar-EG')+' ج.م';
  document.getElementById('sumComm').textContent=comm.toLocaleString('ar-EG')+' ج.م';
  document.getElementById('sumTotal').textContent=(pTotal+ship).toLocaleString('ar-EG')+' ج.م';
  document.getElementById('sumProfit').textContent=comm.toLocaleString('ar-EG')+' ج.م';
}

async function submitOrder(){
  if(submitting) return;
  const msg=document.getElementById('oMsg');
  if(!cart.length){msg.textContent='السلة فارغة';msg.className='msg err';return}
  const name=document.getElementById('cName').value.trim();
  const phone=document.getElementById('cPhone').value.trim();
  const address=document.getElementById('cAddress').value.trim();
  const gov=document.getElementById('gov').value;
  if(!name||!phone||!address||!gov){msg.textContent='أكمل بيانات العميل والمحافظة';msg.className='msg err';return}
  let ship=Number(document.getElementById('shipInput').value);
  let comm=Number(document.getElementById('commInput').value);
  if(isNaN(ship)||ship<0){msg.textContent='سعر شحن غير صحيح';msg.className='msg err';return}
  if(isNaN(comm)||comm<0){msg.textContent='عمولة غير صحيحة';msg.className='msg err';return}
  const pTotal=cart.reduce((s,i)=>s+i.price*i.qty,0);

  submitting=true;
  document.getElementById('btnSubmit').disabled=true;
  msg.textContent='جاري إرسال الطلب...';msg.className='msg';

  const body={
    items:cart.map(i=>({product:i.id,property:i.propertyId,qty:i.qty})),
    productNames:cart.map(i=>i.name+(i.qty>1?' ×'+i.qty:'')),
    client_name:name, client_phone1:phone, client_address:address,
    shipping_governorate:gov, city:document.getElementById('city').value,
    total:pTotal+ship, commission:comm, shipping_cost:ship,
    note:ship===0?'شحن مجاني':''
  };

  try{
    const r=await fetch('/api/create-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json();
    msg.textContent=d.message||d.error; msg.className='msg '+(d.message?'ok':'err');
    if(d.message){cart=[];localStorage.setItem('scart','[]');updCC();setTimeout(()=>go('orders'),1200)}
  }catch(e){msg.textContent='خطأ في الاتصال';msg.className='msg err'}
  submitting=false;
  document.getElementById('btnSubmit').disabled=false;
}

async function loadOrders(){
  const me=await(await fetch('/api/me')).json();
  const sc={'تم التسليم':'s1','تم التوصيل':'s1','قيد التأكيد':'s2','جاري الشحن':'s3','ملغي':'s4'};
  document.getElementById('oList').innerHTML=(me.orders||[]).length?me.orders.map(o=>'<div class="order"><div class="order-top"><div class="order-name">'+(o.products?o.products.join(' + '):'طلب')+'</div><span class="status '+(sc[o.status]||'s2')+'">'+o.status+'</span></div><div class="order-meta">#'+(o.serial||o.id)+' • '+o.date+' • عمولة <b style="color:#0f766e">'+o.commission+' ج.م</b>'+(o.shipping!=null?' • شحن '+o.shipping+' ج.م':'')+'<br>'+o.customer+' — '+o.phone+'</div></div>').join(''):'<div class="empty"><div class="ic">📦</div>لا توجد طلبات</div>';
}
async function loadMe(){
  const me=await(await fetch('/api/me')).json();
  document.getElementById('bal').textContent=Number(me.balance||0).toLocaleString('ar-EG')+' ج.م';
  document.getElementById('oCnt').textContent=(me.orders||[]).length;
  document.getElementById('wBal').textContent=Number(me.balance||0).toLocaleString('ar-EG')+' ج.م';
  document.getElementById('pName').value=me.name||'';
  document.getElementById('pPhone').value=me.phone||'';
}
async function saveProf(){
  const r=await fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('pName').value,phone:document.getElementById('pPhone').value})});
  const d=await r.json(); document.getElementById('pMsg').textContent=d.message; document.getElementById('pMsg').className='msg ok';
}
function sw(el){document.querySelectorAll('.w').forEach(x=>x.classList.remove('sel'));el.classList.add('sel');wM=el.dataset.m}
async function doWd(){
  const amount=Number(document.getElementById('wAmt').value), details=document.getElementById('wDet').value, msg=document.getElementById('wMsg');
  if(!amount||amount<=0){msg.textContent='أدخل مبلغ صحيح';msg.className='msg err';return}
  if(!details){msg.textContent='أدخل رقم المحفظة';msg.className='msg err';return}
  const r=await fetch('/api/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount,method:wM,details})});
  const d=await r.json(); msg.textContent=d.message||d.error; msg.className='msg '+(d.message?'ok':'err');
  if(d.message){loadMe();document.getElementById('wAmt').value='';document.getElementById('wDet').value=''}
}
async function sendSupport(){
  const message=document.getElementById('sMsg').value, msg=document.getElementById('sRes');
  if(!message.trim()){msg.textContent='اكتب رسالتك';msg.className='msg err';return}
  const r=await fetch('/api/support',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});
  const d=await r.json(); msg.textContent=d.message||d.error; msg.className='msg '+(d.message?'ok':'err');
  if(d.message){document.getElementById('sMsg').value='';loadTickets()}
}
async function loadTickets(){
  const me=await(await fetch('/api/me')).json();
  const t=me.tickets||[];
  document.getElementById('tickets').innerHTML=t.length?'<div class="section-title">رسائلك</div>'+t.map(x=>'<div class="ticket"><div class="date">'+x.date+' • '+x.status+'</div><div class="txt">'+x.message+'</div>'+(x.reply?'<div style="margin-top:8px;padding:10px;background:#f0fdfa;border-radius:10px;font-size:.85rem"><b>الرد:</b> '+x.reply+'</div>':'')+'</div>').join(''):'';
}

document.getElementById('s').oninput=e=>{clearTimeout(window.t);window.t=setTimeout(()=>{cs=e.target.value;renderP()},180)};
document.getElementById('cats').onclick=e=>{if(e.target.classList.contains('c')){document.querySelectorAll('.c').forEach(b=>b.classList.remove('active'));e.target.classList.add('active');cc=e.target.dataset.c;renderP()}};
updCC(); loadProducts(); loadPrices();
</script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log('المتجر: http://localhost:' + PORT);
  getProducts();
  getPriceList();
});

