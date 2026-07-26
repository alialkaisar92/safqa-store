const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const app = express();
const PORT = 3000;
const API_KEY = 'sk_9f6d15ecb31c980ae65661abca57d1e3f7c850811f78569955cb47dea4e46c46';
const BASE_URL = 'https://api.safka-eg.com/api/v1/public';
app.use(express.json());

let productsCache = [];
let lastFetch = 0;
let affiliate = { balance: 2450, totalEarned: 8750, totalWithdrawn: 6300, withdrawals: [], name: 'المسوق', phone: '01000000000' };
try { if (fs.existsSync('affiliate-data.json')) affiliate = JSON.parse(fs.readFileSync('affiliate-data.json')); } catch(e){}
function save() { fs.writeFileSync('affiliate-data.json', JSON.stringify(affiliate, null, 2)); }

function cat(name) {
  if (!name) return 'أخرى';
  const n = name.toLowerCase();
  if (/طفل|أطفال|رضع|بيبي|baby|kids|لعبة|ألعاب|حفاض|رضاعة/.test(n)) return 'أطفال';
  if (/شاحن|سماعة|باور|كابل|usb|موبايل|لابتوب|كاميرا|led|لمبة|أباجورة|مروحة|بلوتوث|كشاف|بلور|نفاث|طاقة شمسية|solar|شحن/.test(n)) return 'إلكترونيات';
  if (/كريم|عطر|برفان|مكياج|شامبو|صبغة|عناية|بشرة|شعر|ماسك|سيروم|غسول|صابون|مزيل|beauty|لحية/.test(n)) return 'جمال وعناية';
  if (/حذاء|شبشب|صندل|كوتشي|حقيبة|شنطة|محفظة|bag|shoe/.test(n)) return 'أحذية وحقائب';
  if (/مطبخ|طقم|أطباق|كوب|سكين|قدر|حلة|مقلاة|خلاط|فرن|غلاية|حاجز|سيليكون|حوض|أواني|kitchen/.test(n)) return 'مطبخ';
  if (/منزل|ديكور|ستارة|سجادة|مفرش|مخدة|لحاف|رف|شمعة|فازة|مرآة|إضاءة|سرير|كرسي|طاولة/.test(n)) return 'منزل وديكور';
  if (/تنظيف|منظف|مسحة|مكنسة|غسيل|كلور|اسفنج|فوطة|منشفة/.test(n)) return 'تنظيف';
  if (/قميص|تيشيرت|بنطلون|فستان|جاكيت|ملابس|هودي|جوارب|مايوه/.test(n)) return 'ملابس';
  if (/ساعة|نظارة|خاتم|أسورة|سلسلة|إكسسوار|حزام/.test(n)) return 'إكسسوارات';
  if (/مفك|مطرقة|عدة|أدوات|شنيور|متر|ميزان|مقص/.test(n)) return 'أدوات وعدد';
  if (/رياضة|جيم|دمبل|يوجا|كورة|تمارين/.test(n)) return 'رياضة';
  if (/سيارة|معطر سيارة|حامل موبايل|شاحن سيارة/.test(n)) return 'سيارات';
  return 'أخرى';
}

async function getProducts() {
  if (productsCache.length && Date.now() - lastFetch < 600000) return productsCache;
  console.log('جاري جلب المنتجات...');
  let all = [];
  try {
    const r = await fetch(BASE_URL + '/products?page=1', { headers: { 'api-safka-key': API_KEY } });
    const d = await r.json();
    all = all.concat(d.data || []);
    const pages = d.pages || 1;
    for (let p = 2; p <= pages; p++) {
      const r2 = await fetch(BASE_URL + '/products?page=' + p, { headers: { 'api-safka-key': API_KEY } });
      const d2 = await r2.json();
      all = all.concat(d2.data || []);
    }
  } catch(e) { console.error(e.message); }
  all = all.map(p => { p._cat = cat(p.name); return p; });
  productsCache = all; lastFetch = Date.now();
  console.log('تم تحميل ' + all.length + ' منتج');
  return all;
}

app.get('/', async (req, res) => {
  const products = await getProducts();
  const cats = ['أطفال','إلكترونيات','جمال وعناية','أحذية وحقائب','مطبخ','منزل وديكور','تنظيف','ملابس','إكسسوارات','أدوات وعدد','رياضة','سيارات','أخرى'];
  let btns = '<button class="c active" data-c="all">الكل</button>';
  cats.forEach(c => btns += '<button class="c" data-c="'+c+'">'+c+'</button>');
  res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>متجر صفقة</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Cairo,sans-serif;background:#f8fafc}
.header{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;padding:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.8rem}
.logo{font-weight:800;font-size:1.2rem}.nav a{color:#fff;text-decoration:none;background:rgba(255,255,255,.2);padding:.4rem .8rem;border-radius:8px;font-size:.85rem;font-weight:600}
.search{flex:1;max-width:300px} .search input{width:100%;padding:.65rem 1rem;border:none;border-radius:50px;font-family:Cairo,sans-serif}
.main{max-width:1000px;margin:0 auto;padding:1.2rem 1rem 3rem}
.cats{display:flex;gap:.4rem;overflow-x:auto;margin-bottom:1rem;padding-bottom:.3rem}.cats::-webkit-scrollbar{display:none}
.c{padding:.4rem .9rem;border:2px solid #e2e8f0;background:#fff;border-radius:50px;font-family:Cairo,sans-serif;font-weight:600;font-size:.8rem;color:#64748b;cursor:pointer;white-space:nowrap}
.c.active{background:#0f766e;border-color:#0f766e;color:#fff}
.info{margin-bottom:.8rem;font-size:.85rem;color:#64748b}.info b{color:#0f766e}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:.8rem}
.card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,.06);display:flex;flex-direction:column}
.card img{width:100%;aspect-ratio:1;object-fit:cover;background:#f1f5f9}
.card .b{padding:.7rem;flex:1;display:flex;flex-direction:column}
.card .cat{font-size:.65rem;color:#0f766e;font-weight:600}
.card .t{font-size:.85rem;font-weight:700;margin:.2rem 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card .p{margin-top:auto;font-size:1rem;font-weight:800;color:#0f766e}
@media(max-width:500px){.grid{grid-template-columns:repeat(2,1fr)}}
</style></head><body>
<header class="header">
<div class="logo">🛒 متجر صفقة</div>
<div class="search"><input type="text" id="s" placeholder="ابحث..."></div>
<div class="nav"><a href="/dashboard">لوحة المسوق</a></div>
</header>
<main class="main">
<div class="cats" id="cats">${btns}</div>
<div class="info">عرض <b id="cnt">${products.length}</b> منتج</div>
<div class="grid" id="g"></div>
</main>
<script>
const ps=${JSON.stringify(products)}.map(p=>({name:p.name||'منتج',price:p.sale_price||p.price||0,image:(p.images&&p.images[0])||'',cat:p._cat||'أخرى'}));
let cc='all',cs='';
function r(){let f=ps;if(cc!=='all')f=f.filter(p=>p.cat===cc);if(cs.trim()){const q=cs.trim().toLowerCase();f=f.filter(p=>p.name.toLowerCase().includes(q)||p.cat.toLowerCase().includes(q))}
document.getElementById('cnt').textContent=f.length;document.getElementById('g').innerHTML=f.map(p=>\`<div class="card"><img src="\${p.image||'https://via.placeholder.com/200'}" loading="lazy"><div class="b"><div class="cat">\${p.cat}</div><div class="t">\${p.name}</div><div class="p">\${Number(p.price).toLocaleString('ar-EG')} ج.م</div></div></div>\`).join('')||'<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#64748b">مفيش منتجات</div>'}
document.getElementById('s').oninput=e=>{clearTimeout(window.t);window.t=setTimeout(()=>{cs=e.target.value;r()},200)};
document.getElementById('cats').onclick=e=>{if(e.target.classList.contains('c')){document.querySelectorAll('.c').forEach(b=>b.classList.remove('active'));e.target.classList.add('active');cc=e.target.dataset.c;r()}};
r();
</script></body></html>`);
});

app.get('/dashboard', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>لوحة المسوق</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Cairo,sans-serif;background:#f1f5f9}
.top{background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;padding:1rem 1.2rem;display:flex;justify-content:space-between;align-items:center}
.top a{color:#fff;text-decoration:none;background:rgba(255,255,255,.2);padding:.35rem .8rem;border-radius:8px;font-size:.85rem}
.tabs{display:flex;gap:.3rem;overflow-x:auto;padding:.8rem;background:#fff;border-bottom:1px solid #e2e8f0}
.tab{padding:.45rem 1rem;border:none;background:#f1f5f9;border-radius:50px;font-family:Cairo,sans-serif;font-weight:600;font-size:.8rem;color:#64748b;cursor:pointer;white-space:nowrap}
.tab.active{background:#0f766e;color:#fff}
.box{max-width:600px;margin:0 auto;padding:1.2rem 1rem 3rem}
.panel{display:none}.panel.active{display:block}
.bal{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;border-radius:16px;padding:1.4rem;margin-bottom:1.2rem}
.bal h3{font-size:.85rem;opacity:.9}.bal .n{font-size:2.2rem;font-weight:800}
.sec{background:#fff;border-radius:14px;padding:1.2rem;margin-bottom:1rem;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.sec h2{font-size:1rem;font-weight:800;margin-bottom:.9rem}
.fg{margin-bottom:.9rem}.fg label{display:block;font-weight:600;font-size:.85rem;margin-bottom:.3rem}
.fg input{width:100%;padding:.7rem 1rem;border:2px solid #e2e8f0;border-radius:10px;font-family:Cairo,sans-serif}
.ws{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}
.w{border:2px solid #e2e8f0;border-radius:12px;padding:.8rem .5rem;text-align:center;cursor:pointer}
.w.sel{border-color:#0f766e;background:#f0fdfa}
.w .i{width:34px;height:34px;border-radius:8px;margin:0 auto .3rem;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:.9rem}
.w span{font-size:.75rem;font-weight:700}
.btn{width:100%;padding:.9rem;border:none;border-radius:12px;background:#0f766e;color:#fff;font-family:Cairo,sans-serif;font-weight:800;font-size:.95rem;cursor:pointer;margin-top:.5rem}
.msg{display:none;background:#d1fae5;color:#065f46;padding:.9rem;border-radius:10px;margin-bottom:1rem;text-align:center;font-weight:700}
.msg.show{display:block}
</style></head><body>
<div class="top"><div style="font-weight:800">💰 لوحة المسوق</div><a href="/">← المتجر</a></div>
<div class="tabs" id="tabs">
<button class="tab active" data-p="ov">نظرة عامة</button>
<button class="tab" data-p="wd">السحب</button>
<button class="tab" data-p="pr">الملف الشخصي</button>
<button class="tab" data-p="su">الدعم</button>
</div>
<div class="box">
<div class="msg" id="msg"></div>
<div class="panel active" id="ov">
<div class="bal"><h3>الرصيد المتاح</h3><div class="n">${affiliate.balance.toLocaleString('ar-EG')} ج.م</div></div>
<div class="sec"><h2>ملخص</h2>
<p>إجمالي الأرباح: <b>${affiliate.totalEarned.toLocaleString('ar-EG')}</b> ج.م</p>
<p style="margin-top:.4rem">تم سحبه: <b>${affiliate.totalWithdrawn.toLocaleString('ar-EG')}</b> ج.م</p>
</div></div>
<div class="panel" id="wd">
<div class="sec"><h2>طلب سحب</h2>
<div class="fg"><label>المبلغ</label><input type="number" id="am" placeholder="أقل 50" min="50"></div>
<div class="fg"><label>طريقة السحب</label>
<div class="ws" id="ws">
<div class="w sel" data-m="vodafone" onclick="sw(this)"><div class="i" style="background:#e60000">V</div><span>فودافون كاش</span></div>
<div class="w" data-m="etisalat" onclick="sw(this)"><div class="i" style="background:#5c2d91">WE</div><span>اتصالات</span></div>
<div class="w" data-m="orange" onclick="sw(this)"><div class="i" style="background:#ff7900">O</div><span>أورنج</span></div>
<div class="w" data-m="instapay" onclick="sw(this)"><div class="i" style="background:#1e40af">IP</div><span>إنستاباي</span></div>
<div class="w" data-m="bank" onclick="sw(this)"><div class="i" style="background:#0f766e">🏦</div><span>تحويل بنكي</span></div>
</div></div>
<div class="fg"><label>رقم المحفظة</label><input type="text" id="wn" placeholder="01xxxxxxxxx"></div>
<div class="fg"><label>اسم صاحب المحفظة</label><input type="text" id="wna" placeholder="الاسم"></div>
<button class="btn" id="wb" onclick="wd()">تأكيد السحب</button>
</div></div>
<div class="panel" id="pr">
<div class="sec"><h2>الملف الشخصي</h2>
<div class="fg"><label>الاسم</label><input type="text" id="pn" value="${affiliate.name}"></div>
<div class="fg"><label>الهاتف</label><input type="text" id="pp" value="${affiliate.phone}"></div>
<button class="btn" onclick="sp()">حفظ</button>
</div></div>
<div class="panel" id="su">
<div class="sec"><h2>الدعم</h2>
<div class="fg"><label>الموضوع</label><input type="text" id="ss" placeholder="الموضوع"></div>
<div class="fg"><label>الرسالة</label><input type="text" id="sm" placeholder="اكتب رسالتك"></div>
<button class="btn" onclick="ss()">إرسال</button>
</div></div>
</div>
<script>
let m='vodafone';
document.getElementById('tabs').onclick=e=>{if(!e.target.classList.contains('tab'))return;document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));e.target.classList.add('active');document.getElementById(e.target.dataset.p).classList.add('active')};
function sw(el){document.querySelectorAll('.w').forEach(w=>w.classList.remove('sel'));el.classList.add('sel');m=el.dataset.m}
async function wd(){const a=Number(document.getElementById('am').value),n=document.getElementById('wn').value.trim(),na=document.getElementById('wna').value.trim();
if(!a||a<50)return alert('أقل مبلغ 50');if(a>${affiliate.balance})return alert('الرصيد غير كاف');if(!n||!na)return alert('املأ البيانات');
document.getElementById('wb').disabled=true;
const r=await fetch('/api/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:a,method:m,walletNumber:n,walletName:na})});
const d=await r.json();if(d.success){document.getElementById('msg').textContent='✅ تم إرسال طلب السحب';document.getElementById('msg').classList.add('show');setTimeout(()=>location.reload(),1500)}else{alert(d.message);document.getElementById('wb').disabled=false}}
async function sp(){await fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('pn').value,phone:document.getElementById('pp').value})});document.getElementById('msg').textContent='✅ تم الحفظ';document.getElementById('msg').classList.add('show')}
function ss(){if(!document.getElementById('ss').value||!document.getElementById('sm').value)return alert('املأ الحقول');document.getElementById('msg').textContent='✅ تم إرسال الرسالة للدعم';document.getElementById('msg').classList.add('show')}
</script></body></html>`);
});

app.post('/api/withdraw', (req, res) => {
  const { amount, method, walletNumber, walletName } = req.body;
  const num = Number(amount);
  if (!num || num < 50) return res.json({ success: false, message: 'أقل مبلغ 50' });
  if (num > affiliate.balance) return res.json({ success: false, message: 'الرصيد غير كاف' });
  affiliate.balance -= num;
  affiliate.totalWithdrawn += num;
  affiliate.withdrawals.push({ amount: num, method, walletNumber, walletName, status: 'pending', date: new Date().toLocaleString('ar-EG') });
  save();
  res.json({ success: true });
});

app.post('/api/profile', (req, res) => {
  if (req.body.name) affiliate.name = req.body.name;
  if (req.body.phone) affiliate.phone = req.body.phone;
  save();
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log('المتجر: http://localhost:' + PORT);
  console.log('لوحة المسوق: http://localhost:' + PORT + '/dashboard');
  getProducts();
});
