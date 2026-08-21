const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
try{const _f=require('fs');const _ep=require('path').join(__dirname,'.env');if(_f.existsSync(_ep)){const _c=_f.readFileSync(_ep,'utf8');const _re=/^([A-Z0-9_]+)=(.*)$/gm;let _m;while((_m=_re.exec(_c))){if(process.env[_m[1]]===undefined)process.env[_m[1]]=_m[2].trim();}}}catch(_e){}
const API_KEY = process.env.SAFKA_API_KEY || '';
const BASE_URL='https://api.safka-eg.com/api/v1/public';
const safkaSync = require('./safka-sync');
const { availableBalance } = require('./balance');
const easyordersDb = require('./services/db');
const easyordersRoutes = require('./routes/easyorders.routes');
app.use(express.json({limit:'50mb'}));
// Affiliate/EasyOrders module: initialize its local persistence before mounting protected routes.
try { easyordersDb.initDb(); } catch (e) { console.error('[easyorders] database initialization failed:', e.message); }
app.use('/api/easyorders', easyordersRoutes);

app.get('/', (req, res) => {
  res.redirect(302, '/store');
});

const crypto = require('crypto');
const firestore = require('./firestore');
const postgres = require('./lib/postgres');
const authService = require('./services/auth-postgres');
const SESSION_COOKIE = 'rab7na_session';
function readCookie(req, name) { const raw = String(req.headers.cookie || ''); const found = raw.split(';').map(x => x.trim()).find(x => x.startsWith(name + '=')); return found ? decodeURIComponent(found.slice(name.length + 1)) : ''; }
function authToken(req) { return authReqToken(req) || readCookie(req, SESSION_COOKIE); }
function setSessionCookie(res, token) { const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''; res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${secure}`); }
function clearSessionCookie(res) { res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`); }
let postgresStatus = process.env.DATABASE_URL ? 'configured' : 'not_configured';
async function initializePostgres() {
  if (!process.env.DATABASE_URL) return;
  try { await postgres.migrate(); postgresStatus = 'ready'; console.log('[postgres] schema ready'); }
  catch (error) { postgresStatus = 'error'; console.error('[postgres] initialization failed:', error.message); }
}
initializePostgres();
function authReqToken(req){const h=String(req.headers.authorization||'');return String(req.headers['x-auth-token']||req.headers['x-sq-token']||(h.toLowerCase().indexOf('bearer ')===0?h.slice(7):'')||'').trim();}
async function currentAuthUser(req){const token=authToken(req);if(!token)return null;try{const user=await authService.currentUser(token);if(user)return user;}catch(e){}try{const jwt=global.verifyJWT&&global.verifyJWT(token);if(jwt)return await firestore.getUser(jwt.uid);}catch(e){}try{const rec=await firestore.getToken(token);return rec?await firestore.getUser(rec.uid):null;}catch(e){return null;}}

// ===== MAIN STORE ROUTES =====
app.get('/store', (req, res) => { res.sendFile(path.join(__dirname, 'store2.html')); });

app.get('/shop', (req, res) => res.redirect(302, '/store'));

app.get('/api/health',function(req,res){res.json({ok:true,status:'healthy',service:'rab7na',database:'postgresql',database_status:postgresStatus,time:new Date().toISOString()});});
app.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});


app.use(express.static(__dirname));
app.get('/login',(req,res)=>res.sendFile(require('path').join(__dirname,'login.html')));
// ===== Modern store (store2) =====






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
});
// SEO helpers: public product pages use real cached product data only.
const SEO_ORIGIN = process.env.PUBLIC_SITE_URL || 'https://rab7na-store.vercel.app';
function seoEsc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function seoText(v){return String(v||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();}
function sitemapSlug(p){
  const base = seoText(p.name||'product').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,80);
  return (base||'product')+'-'+String(p.id||p._id||'').slice(-8);
}
function readSeoProducts(){try{const fp=path.join(__dirname,'products-cache.json');const d=JSON.parse(fs.readFileSync(fp,'utf8'));return Array.isArray(d)?d:[];}catch(e){return [];}}
function findSeoProduct(slug){const all=readSeoProducts();return all.find(p=>sitemapSlug(p)===slug || String(p.id||p._id)===slug);}
function seoDescription(p){const d=seoText(p.description||p.desc||'');return (d||('اكتشف '+seoText(p.name)+' على rab7na، مع معلومات المنتج والسعر والتوفر.')).slice(0,160);}
function productAvailability(p){return p.available===false || p.is_active===false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock';}

let productsCache = [], priceListCache = [], lastFetch = 0;
let stockProbeLoggedAt = 0;
let affiliateSnapshot = null, affiliateSnapshotAt = 0;
async function getAffiliateSnapshotFast() {
  if (affiliateSnapshot && Date.now() - affiliateSnapshotAt < 15000) return affiliateSnapshot;
  try {
    affiliateSnapshot = await firestore.getAffiliateData();
    affiliateSnapshotAt = Date.now();
  } catch (e) {}
  return affiliateSnapshot || {};
}
async function currentUser(req){ try { return await currentAuthUser(req); } catch(e) { return null; } }
async function readAffiliate(){ return firestore.getAffiliateData(); }
async function saveAffiliate(d){ return firestore.saveAffiliateData(d); }
async function syncUserBalance(user, affiliate) {
  const next = availableBalance(user, affiliate);
  if (Number(user.balance || 0) !== next) { user.balance = next; await firestore.saveUser(user); }
  return next;
}

function cat(n) {
  if (!n) return 'أخرى';
  const text = String(n).toLowerCase().replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه');
  const has = (pattern) => pattern.test(text);
  if (has(/لعبه|العاب|لعبة|اطفال|طفل|رضع|بيبي|baby|kids|عروسه|بازل|دمى|دمية|كرة قدم|اخطبوط راقص|عصفوره|سكوتر اطفال|كرسي امان الاطفال/)) return 'أطفال';
  if (has(/سياره|السياره|سيارات|عربيه|عربية|للسياره|للسيارات|تكييف السياره|كرسي السياره|منظم ظهر كرسي السياره|كفر.*سياره/)) return 'سيارات';
  if (has(/ضغط الدم|دوبلر|نبض الجنين|ركبه طبيه|جامع البول|اسنان|الاسنان|شفاط الحليب|شفاط المخاط|مقاومه رياضيه|تمارين|تويست|تقويه الصدر|سكيت بورد|مساج|تدليك|لياقه|رياضه/)) return 'صحة ولياقة';
  if (has(/شعر|رموش|اظافر|كريم|عطر|مكياج|عنايه|بشره|سيروم|تجاعيد|ازاله الشعر|حلاقه|مصفف|تمويج الشعر|فواحه/)) return 'جمال';
  if (has(/حذاء|شبشب|حقيبه|شنطه|كعب|طاقيه|غطاء حذاء|ملابس|جاكيت|جوارب/)) return 'أحذية وحقائب';
  if (has(/مطبخ|شوايه|خضروات|فواكه|قطايف|سمبوسه|هراسه|قشاره|ثوم|سكاكين|اواني|حوض|بوتجاز|دسبنسر مياه|مياه|ثلاجه|غساله/)) return 'مطبخ';
  if (has(/تنظيف|منظف|بقع|وبر|ازاله الوبر|فرشه التنظيف|فرشاة التنظيف|مساحه|تكييف|اقمشه|مفروشات|غسيل/)) return 'تنظيف';
  if (has(/مفك|شنيور|منشار|مسامير|مسدس تثبيت|مسدس المسامير|لحام|عدة|ادوات|قلم اللحام|تثبيت الملايه|اصلاح/)) return 'أدوات';
  if (has(/شاحن|سماعه|باور|كابل|usb|led|لمبه|اباجوره|بلوتوث|كشاف|كاميرا|كيبورد|موبايل|موبيل|هاتف|جهاز العاب|العاب محمول|retroplay|r36s|طاقة شمسيه|solar|ترجمه|قلم ذكي|جهاز قياس|شريط مضيء|اضاءه/)) return 'إلكترونيات';
  if (has(/منزل|ديكور|منظم|رف|ستاره|مفرش|ملايه|كرسي|بين باج|حامل|وساده|فواحه|قنديل|حدائق|تخزين|دولاب/)) return 'منزل';
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
      const d = await r.json();console.log('SAFKA order:',r.status,JSON.stringify(d));
      all = all.concat(d.data || []);
    }
  } catch (e) { console.error(e.message); }
  all = all.map(p => { p._cat = cat([p.name, p.title, p.description, p.desc, p.note, p.category].filter(Boolean).join(' ')); return p; });
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

function sourceStock(p) {
  const prop = (p && p.properties && p.properties[0]) || {};
  const inventory = p && p.inventory;
  const candidates = [
    prop.stock, prop.quantity, prop.available_qty, prop.availableQuantity,
    p && p.stock, p && p.quantity, p && p.available_qty,
    p && p.availableQuantity, p && p.inventory_quantity,
    inventory && inventory.stock, inventory && inventory.quantity, inventory && inventory.available,
    inventory && inventory.available_qty
  ];
  for (const value of candidates) {
    if (value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value))) return Math.max(0, Number(value));
  }
  return null;
}
function extractCommission(note) {
  if (!note) return 0;
  const text = String(note).replace(/,/g, '');

  const patterns = [
    /عمولتك\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    /العمولة\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    /commission\s*[:\-]?\s*(\d+(?:\.\d+)?)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]) || 0;
  }

  console.warn("⚠️ فشل استخراج العمولة من note:", JSON.stringify(note)); return 0;
}

function sourceAvailability(p) {
  if (!p || p.is_active === false) return false;
  if (typeof p.is_available === 'boolean') return p.is_available;
  const props = Array.isArray(p.properties) ? p.properties : [];
  const flags = props.map(item => item && item.is_available).filter(value => typeof value === 'boolean');
  return flags.some(Boolean);
}
function productMedia(p, local) {
  const first = (...values) => values.find(v => v !== undefined && v !== null && String(v).trim()) || '';
  return {
    media: first(local && local.media, local && local.media_url, local && local.drive, p && p.media, p && p.media_url),
    mediaImages: first(local && local.mediaImages, local && local.media_images, local && local.images_drive, local && local.drive_images, p && p.mediaImages, p && p.media_images, p && p.images_drive, p && p.drive_images),
    mediaVideo: first(local && local.mediaVideo, local && local.media_video, local && local.video_url, local && local.drive_video, p && p.mediaVideo, p && p.media_video, p && p.video_url, p && p.drive_video)
  };
}
function normalizePublicProduct(p, local, priceUp) {
  const raw = p || {};
  const prop = (raw.properties && raw.properties[0]) || {};
  const stock = sourceStock(raw);
  const merged = Object.assign({}, raw, local || {});
  const media = productMedia(raw, local || {});
  const category = cat([raw.name, raw.title, raw.description, raw.desc, raw.note, raw.category].filter(Boolean).join(' '));
  const base = Number(raw.basePrice != null ? raw.basePrice : (raw.sale_price != null ? raw.sale_price : (raw.price != null ? raw.price : 0)));
  return Object.assign(merged, {
    id: raw.id || raw._id || (local && (local.id || local._id)),
    name: raw.name || raw.title || '',
    category,
    cat: category,
    basePrice: base,
    cost: raw.cost != null ? raw.cost : (raw.sale_price != null ? raw.sale_price : base),
    price: Math.round(base * (1 + priceUp / 100)),
    image: raw.image || (raw.images && raw.images[0]) || merged.image || '',
    desc: raw.description || raw.desc || '',
    barcode: raw.barcode || merged.barcode || '',
    note: raw.note || merged.note || '',
    propId: raw.propId || prop._id || '',
    propKey: raw.propKey || prop.key || '',
    stock,
    available: sourceAvailability(raw),
    stockSource: 'safka'
  }, media);
}
async function fetchLivePublicProducts() {
  if (!API_KEY) throw new Error('SAFKA_API_KEY غير مضبوط');
  const headers = { 'api-safka-key': API_KEY };
  const readPage = async (page) => {
    const response = await fetch(BASE_URL + '/products?page=' + page + '&size=100', { headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('مصدر المنتجات HTTP ' + response.status);
    return { body, rows: body.data || body.items || (Array.isArray(body) ? body : []) };
  };
  const first = await readPage(1);
  if (!first.rows.length) return [];
  if (Date.now() - stockProbeLoggedAt > 10 * 60 * 1000) {
    stockProbeLoggedAt = Date.now();
    console.log('[availability-probe] sample:', JSON.stringify(first.rows.slice(0, 5).map(product => ({
      id: product && (product.id || product._id),
      name: product && (product.name || product.title),
      is_available: product && product.is_available,
      propertyAvailability: Array.isArray(product && product.properties) ? product.properties.slice(0, 5).map(item => item && item.is_available) : []
    }))));
  }
  const pages = Math.min(100, Math.max(1, Number(first.body.pages || 1)));
  if (pages === 1) return first.rows;
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => readPage(i + 2)));
  return first.rows.concat(...rest.map(x => x.rows));
}
function readProductCache() {
  const fp = path.join(__dirname, 'products-cache.json');
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  return Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
}

app.get('/api/products', async (req, res) => {
  const affiliate = await getAffiliateSnapshotFast();
  const priceUp = Math.max(0, Math.min(200, Number(affiliate.priceUp) || 0));
  const saved = Array.isArray(affiliate.products) ? affiliate.products : [];
  const savedById = new Map();
  saved.forEach(item => {
    [item.id, item._id, item.productId, item.safkaId].filter(v => v !== undefined && v !== null && String(v) !== '').forEach(v => savedById.set(String(v), item));
  });
  try {
    const live = await fetchLivePublicProducts();
    const stockUpdatedAt = new Date().toISOString();
    const normalized = live.map(raw => Object.assign(normalizePublicProduct(raw, savedById.get(String(raw.id || raw._id)) || {}, priceUp), { stockUpdatedAt }));
    try { fs.writeFileSync(path.join(__dirname, 'products-cache.json'), JSON.stringify(normalized)); } catch (e) { console.warn('Product cache write skipped:', e.message); }
    res.json(normalized);
  } catch (error) {
    console.error('Live products unavailable:', error.message);
    res.status(503).json({ ok: false, error: 'تعذر جلب المنتجات الأصلية حاليًا' });
  }
});

app.post('/api/chat', async (req,res)=>{const b=req.body||{};const u=await currentUser(req);const k=u?'u'+u.id:'';if(!k)return res.status(401).json({error:'login'});const all=await firestore.getChats();all[k]=all[k]||[];let d=b.data||'';if(typeof d==='string'&&d.indexOf('data:')===0){try{const _fs=require('fs'),_pt=require('path');const _dir=_pt.join(__dirname,'uploads');if(!_fs.existsSync(_dir))_fs.mkdirSync(_dir);const _mt=(d.match(/^data:([^;]+);/)||[])[1]||'bin';const _ext=((_mt.split('/')[1])||'bin').replace(/[^a-z0-9]/gi,'');const _fn=Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+_ext;_fs.writeFileSync(_pt.join(_dir,_fn),Buffer.from((d.split(',')[1])||'','base64'));d='/uploads/'+_fn;}catch(_e){}}const m={id:Date.now(),from:b.from||'user',type:b.type||'text',text:b.text||'',data:d,time:new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})};all[k].push(m);await firestore.saveChats(all);if(global.notifyChat)global.notifyChat();res.json({ok:true,m})});
app.get('/api/chat', async (req,res)=>{const u=await currentUser(req);if(!u)return res.status(401).json({error:'login'});const all=await firestore.getChats();res.json(all['u'+u.id]||[]);});

app.post('/api/support', async (req, res) => {
  const { message } = req.body || {};
  if (!message || !message.trim()) return res.json({ error: 'اكتب رسالتك' });
  try { const d = await readAffiliate(); d.tickets = d.tickets || []; d.tickets.unshift({ id: Date.now(), message: message.trim(), status: 'جديد', date: new Date().toISOString().slice(0, 10), reply: '' }); await saveAffiliate(d); res.json({ message: 'تم إرسال رسالتك للدعم ✓' }); }
  catch (e) { res.status(500).json({ error: 'تعذر إرسال الرسالة حالياً' }); }
});
app.post('/api/upload',(req,res)=>{const pl=global.verifyJWT?global.verifyJWT(req.headers['x-auth-token']||''):null;if(!pl)return res.status(401).json({error:'login'});const b=req.body||{};if(typeof b.data!=='string'||b.data.indexOf('data:')!==0)return res.json({error:'صورة غير صالحة'});try{const fs=require('fs'),pt=require('path');const dir=pt.join(__dirname,'uploads');if(!fs.existsSync(dir))fs.mkdirSync(dir);const mt=(b.data.match(/^data:([^;]+);/)||[])[1]||'image/png';const ext=((mt.split('/')[1])||'png').replace(/[^a-z0-9]/gi,'')||'png';const fn='t'+Date.now()+'-'+Math.random().toString(36).slice(2,6)+'.'+ext;fs.writeFileSync(pt.join(dir,fn),Buffer.from((b.data.split(',')[1])||'','base64'));res.json({ok:true,url:'/uploads/'+fn});}catch(e){res.json({error:'فشل الرفع'});}});
app.get('/api/theme/:id',async (req,res)=>{try{const u=await firestore.getUser(req.params.id);res.json({ok:true,theme:(u&&u.theme)||null,name:u?u.name:''});}catch(e){res.json({ok:true,theme:null,name:''});}});
app.post('/api/my/theme',async (req,res)=>{const u=await currentUser(req);if(!u)return res.status(401).json({error:'login'});try{u.theme=req.body||{};await firestore.saveUser(u);res.json({ok:true});}catch(e){res.json({error:'فشل الحفظ'});}});
app.get('/premium.js',(req,res)=>res.sendFile(require('path').join(__dirname,'themes','premium.js')));
app.get('/premium.css',(req,res)=>res.sendFile(require('path').join(__dirname,'themes','premium.css')));
app.get('/products.js',(req,res)=>{res.type('js').sendFile(require('path').join(__dirname,'products.js'));});




// ===== MAIN STORE ROUTES =====




app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/orders', (req, res) => {
  res.sendFile(path.join(__dirname, 'orders.html'));
});
app.post('/api/profile', (req,res) => res.status(410).json({ error: 'الملفات الشخصية غير متاحة في المتجر العام.' }));
app.get('/api/my/dashboard', (req,res) => res.status(410).json({ error: 'لوحة المسوّق غير متاحة في المتجر العام.' }));
app.post('/api/set-commission', (req,res)=>res.json({ok:true,message:'تم تحديث العمولة'}));
app.post(['/api/withdraw','/api/my/withdraw'], (req,res) => res.status(410).json({ error: 'السحب غير متاح في المتجر العام.' }));

app.get(['/login', '/register'], (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.post('/api/auth/register', async (req, res) => {
  try { const user = await authService.register(req.body || {}); res.status(201).json({ ok: true, user: authService.publicUser(user) }); }
  catch (error) { const status = /مستخدم بالفعل|صحيح|مطلوب|8 أحرف/.test(error.message) ? 400 : 500; res.status(status).json({ error: status === 500 ? 'تعذر إنشاء الحساب حاليًا' : error.message }); }
});
app.post('/api/auth/login', async (req, res) => {
  try { const result = await authService.login(Object.assign({}, req.body || {}, { ip: req.ip })); setSessionCookie(res, result.token); res.json({ ok: true, user: result.user }); }
  catch (error) { const status = /محاولات كثيرة|مطلوبان|غير صحيحة/.test(error.message) ? 401 : 500; res.status(status).json({ error: status === 500 ? 'تعذر تسجيل الدخول حاليًا' : error.message }); }
});
app.post('/api/auth/logout', async (req, res) => { try { await authService.logout(authToken(req)); } catch (_) {} clearSessionCookie(res); res.json({ ok: true }); });
app.get('/api/auth/me', async (req, res) => { try { const user = await authService.currentUser(authToken(req)); if (!user) return res.status(401).json({ error: 'غير مسجل الدخول' }); res.json({ ok: true, user }); } catch (_) { res.status(401).json({ error: 'غير مسجل الدخول' }); } });
app.post('/api/auth/forgot-password', (req, res) => res.status(501).json({ error: 'استعادة كلمة المرور بالبريد غير مفعلة حاليًا؛ لا يتم إرسال رموز أو إنشاء رابط وهمي.' }));
app.post('/api/auth/reset-password', (req, res) => res.status(501).json({ error: 'استعادة كلمة المرور بالبريد غير مفعلة حاليًا.' }));
app.use('/api/admin', (req, res) => res.status(410).json({ error: 'لوحة الإدارة غير متاحة.' }));

async function refreshProductsCache(){
  try { const result = await safkaSync.syncProducts({ notify: true }); console.log('✅ Safka products synced:', result.products, 'new:', result.newProducts); }
  catch (e) { console.log('Safka cache sync err:', e.message); }
}
if (API_KEY.trim()) { refreshProductsCache(); setInterval(refreshProductsCache, 10 * 60 * 1000); }

app.all('/api/safka/sync', async (req, res) => {
  const secret = String(process.env.SAFKA_SYNC_SECRET || '').trim();
  const supplied = String(req.headers['x-safka-sync-secret'] || req.query.secret || '').trim();
  const isVercelCron = String(req.headers['x-vercel-cron'] || '').toLowerCase() === '1';
  if (secret && supplied !== secret && !isVercelCron) return res.status(401).json({ error: 'غير مصرح' });
  if (!secret && !isVercelCron && process.env.NODE_ENV === 'production') return res.status(503).json({ error: 'اضبط SAFKA_SYNC_SECRET أو Vercel Cron' });
  try { res.json(await safkaSync.runSync({ notify: true })); }
  catch (e) { res.status(500).json({ error: 'فشلت مزامنة المنتجات', details: e.message }); }
});

app.get('/api/price-list', async (req,res)=>{
  const fp=require('path').join(__dirname,'price-list-cache.json');
  const norm=(arr)=>(arr||[]).map(x=>{
    const name=x.governorateNameAr||x.governorateName||x.name||'';
    return {
      _id:x._id,
      id:x._id,
      name:name,
      governorateNameAr:name,
      price:x.price||0,
      cities:(x.cities||[]).map(c=>({id:c.id,name:c.city_name_ar||c.city_name||c.name||''}))
    };
  });
  try{
    if(require('fs').existsSync(fp)){
      const d=JSON.parse(require('fs').readFileSync(fp,'utf8'));
      if(Array.isArray(d)&&d.length)return res.json(d[0]&&d[0].id?d:norm(d));
    }
  }catch(e){}
  try{
    const r=await fetch(BASE_URL+'/price-list?page=1&size=100',{headers:{'api-safka-key':API_KEY}});
    const j=await r.json();
    const arr=j.data||j.items||[];
    const tr=norm(arr);
    try{require('fs').writeFileSync(fp,JSON.stringify(tr));}catch(e){}
    res.json(tr);
  }catch(e){console.log('price-list err:',e.message);res.json([]);}
});


app.post('/api/create-order', async (req,res)=>{
  if(!API_KEY.trim())return res.status(503).json({error:'إعدادات الطلب غير مكتملة حاليًا. يرجى المحاولة لاحقًا.'});
  const b=req.body||{};
  const gov=(b.shipping_governorate||'').toString().trim();
  let govId=gov;
  try{
    const pl=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'price-list-cache.json'),'utf8'));
    const found=pl.find(x=>x._id===gov||(x.governorateNameAr||x.governorateName)===gov);
    if(found)govId=found._id;
  }catch(e){}
  if(!govId||govId.length<10)return res.json({error:'اختر المحافظة'});
  const items=(b.items||[]).map(it=>({
    product: it.product||it.id||it._id,
    property: it.property||it.propId||'',
    qty: Number(it.qty||it.quantity||1),
    originalPrice: Number(it.originalPrice||it.price||0),
    finalPrice: Number(it.finalPrice||it.salePrice||it.originalPrice||it.price||0)
  })).filter(x=>x.product);
  if(!items.length)return res.json({error:'السلة فارغة'});
  // لا نثق بالسعر الأصلي أو المخزون القادم من المتصفح؛ نتحقق من المصدر الحي أولًا.
  let sourceRows=[];
  try { sourceRows = await fetchLivePublicProducts(); }
  catch (e) { return res.json({error:'تعذر التحقق من المنتج الأصلي حاليًا، حاول مرة أخرى'}); }
  const sourceById = new Map();
  sourceRows.forEach(p => { [p && p.id, p && p._id].filter(Boolean).forEach(id => sourceById.set(String(id), p)); });
  for (const item of items) {
    const source = sourceById.get(String(item.product));
    if (!source) return res.json({error:'المنتج غير متاح حاليًا من المصدر الأصلي'});
    const sourceProp = (source.properties && source.properties[0]) || {};
    const stock = sourceStock(source);
    const base = Number(source.basePrice != null ? source.basePrice : (source.sale_price != null ? source.sale_price : (source.price != null ? source.price : 0)));
    if (!Number.isFinite(base) || base <= 0) return res.json({error:'سعر المنتج الأصلي غير متاح حاليًا'});
    const productAvailable =
      source.is_active !== false &&
      sourceProp.is_available !== false &&
      sourceAvailability(source) !== false;

    if (!productAvailable) {
      return res.json({error:'المنتج غير متاح حاليًا'});
    }

    if (item.qty < 1) {
      return res.json({error:'الكمية المطلوبة غير صحيحة'});
    }

    // stock=null من سوقلي لا يعني أن المنتج نفد.
    // إذا كان هناك رقم مخزون فعلي، نتحقق من الكمية.
    if (typeof stock === 'number' && stock >= 0 && item.qty > stock) {
      return res.json({error:'الكمية المطلوبة أكبر من المخزون الأصلي'});
    }
    item.originalPrice = base;
    item.finalPrice = Math.max(base, Number(item.finalPrice) || base);
    item.property = item.property || source.propId || sourceProp._id || sourceProp.key || '';
    item.commission = extractCommission(source.note || '');
  }
  let shippingCost=0;
  let shippingGovernorate;
  try{
    const pl=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'price-list-cache.json'),'utf8'));
    shippingGovernorate=pl.find(x=>x._id===govId||x.id===govId);
    if(!shippingGovernorate)return res.json({error:'المحافظة المختارة غير متاحة حاليًا'});
    shippingCost=Math.max(0,Number(shippingGovernorate.price)||0);
  }catch(e){return res.json({error:'تعذر التحقق من سعر الشحن، حاول مرة أخرى'});}
  const merchandiseTotal=items.reduce((sum,x)=>sum+Math.max(0,Number(x.finalPrice)||0)*(Number(x.qty)||1),0);
  const commission=items.reduce((sum,x)=>sum+Math.max(0,Number(x.commission)||0)*(Number(x.qty)||1),0);
  const total=merchandiseTotal+shippingCost;
  const body={
    items:items,
    client_name:b.client_name||'',
    client_phone1:b.client_phone1||'',
    client_phone2:b.client_phone2||'',
    client_address:b.client_address||'',
    shipping_governorate:govId,
    city:b.city||'',
    note:b.note||'',
    commission:commission,
    shipping_cost:shippingCost,
    total:total
  };
  if(!body.client_name)return res.json({error:'اسم العميل مطلوب'});
  if(!body.client_phone1)return res.json({error:'رقم الهاتف مطلوب'});
  if(!body.client_address)return res.json({error:'العنوان مطلوب'});
  console.log('SAFKA request body:',JSON.stringify(body));
  try{
    const r=await fetch(BASE_URL+'/orders',{method:'POST',headers:{'api-safka-key':API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json();
    console.log('SAFKA response status:',r.status);
    console.log('SAFKA response:',JSON.stringify(d,null,2));
    if(!r.ok)return res.json({error:d.errors?d.errors.map(e=>e.msg).join(', ').replace('محظور عشان سلوكه وحش في النظام','الرقم ده محظور في rab7na - استخدم رقمًا حقيقيًا'):'فشل الطلب'});
    const customer=await currentUser(req);
    const external=d.data||d;
    const savedOrder={id:external.id||external._id||Date.now(),serial:external.id||external._id||Date.now(),userId:customer&&customer.id||null,products:b.productNames||items.map(x=>x.product),items,client_name:body.client_name,client_phone1:body.client_phone1,client_address:body.client_address,status:'قيد التأكيد',date:new Date().toISOString(),commission,total,adjustedTotal:total,shipping:shippingCost,originalMerchandiseTotal:items.reduce((sum,x)=>sum+(x.originalPrice||0)*(x.qty||1),0),finalMerchandiseTotal:items.reduce((sum,x)=>sum+(x.finalPrice||0)*(x.qty||1),0),external:external};
    const affiliate=await readAffiliate();affiliate.orders=affiliate.orders||[];affiliate.orders.unshift(savedOrder);await saveAffiliate(affiliate);
    res.json({ok:true,message:'تم إرسال الطلب بنجاح',order:external});
  }catch(e){
    console.log('SAFKA error:',e.message);
    res.json({error:'تعذر الاتصال بالخادم'});
  }
});


app.get('/api/support/whatsapp', (req, res) => {
  let raw = String(process.env.WHATSAPP_SUPPORT_NUMBER || process.env.SUPPORT_WHATSAPP || process.env.WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
  // Normalize the Egyptian support number to WhatsApp international format.
  if (/^01\d{9}$/.test(raw)) raw = '20' + raw.slice(1);
  if (raw === '20113132636') raw = '201131332636';
  res.set('Cache-Control', 'no-store');
  res.json({ number: raw.length >= 10 ? raw : '' });
});

if (require.main === module) {
  app.listen(PORT, () => {
  console.log('المتجر: http://localhost:' + PORT);
  getProducts();
  getPriceList();
});
}

module.exports = app;


process.on('SIGTERM', async () => { await postgres.close(); process.exit(0); });
process.on('SIGINT', async () => { await postgres.close(); process.exit(0); });
