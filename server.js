const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
try{const _f=require('fs');const _ep=require('path').join(__dirname,'.env');if(_f.existsSync(_ep)){const _c=_f.readFileSync(_ep,'utf8');const _re=/^([A-Z0-9_]+)=(.*)$/gm;let _m;while((_m=_re.exec(_c))){if(process.env[_m[1]]===undefined)process.env[_m[1]]=_m[2].trim();}}}catch(_e){}
const API_KEY = process.env.SAFKA_API_KEY || 'sk_9f6d15ecb31c980ae65661abca57d1e3f7c850811f78569955cb47dea4e46c46';
const BASE_URL='https://api.safka-eg.com/api/v1/public';
app.use(express.json({limit:'50mb'}));

const crypto = require('crypto');
const firestore = require('./firestore');
function authReqToken(req){const h=String(req.headers.authorization||'');return String(req.headers['x-auth-token']||req.headers['x-sq-token']||(h.toLowerCase().indexOf('bearer ')===0?h.slice(7):'')||'').trim();}
async function currentAuthUser(req){const token=authReqToken(req);if(!token)return null;try{const jwt=global.verifyJWT&&global.verifyJWT(token);if(jwt)return await firestore.getUser(jwt.uid);}catch(e){}const rec=await firestore.getToken(token);return rec?await firestore.getUser(rec.uid):null;}
app.get('/api/health',function(req,res){res.json({ok:true,status:'healthy',service:'Rab7na',database:'firestore',time:new Date().toISOString()});});
app.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});


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
function seoDescription(p){const d=seoText(p.description||p.desc||'');return (d||('اكتشف '+seoText(p.name)+' على Rab7na، مع معلومات المنتج والسعر والتوفر.')).slice(0,160);}
function productAvailability(p){return p.available===false || p.is_active===false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock';}

let productsCache = [], priceListCache = [], lastFetch = 0;
async function currentUser(req){ try { return await currentAuthUser(req); } catch(e) { return null; } }
async function readAffiliate(){ return firestore.getAffiliateData(); }
async function saveAffiliate(d){ return firestore.saveAffiliateData(d); }

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
      const d = await r.json();console.log('SAFKA order:',r.status,JSON.stringify(d));
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

function mapProduct(p, up) {
  const prop = (p.properties && p.properties[0]) || {};
  const stock = typeof prop.value === 'number' ? prop.value : (prop.is_available === false ? 0 : 99);
  return {
    id: p._id,
    name: p.name || 'منتج',
    price: Math.round((p.sale_price || 0) * (1 + (up || 0) / 100)),
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

app.get('/api/products', async (req,res)=>{
  res.set('Cache-Control','public, max-age=300, s-maxage=600');
  const fp=require('path').join(__dirname,'products-cache.json');
  try{
    if(require('fs').existsSync(fp)){
      let d=JSON.parse(require('fs').readFileSync(fp,'utf8'));
      if(Array.isArray(d) && d.length>=100) return res.json(d);
      if(d && Array.isArray(d.data) && d.data.length>=100) return res.json(d.data);
    }
  }catch(e){}
  try{
    const all=[];
    let page=1, pages=1;
    while(page<=pages){
      const r=await fetch(BASE_URL+'/products?page='+page+'&size=100',{headers:{'api-safka-key':API_KEY}});
      if(!r.ok) break;
      const j=await r.json();
      pages=j.pages||pages;
      const arr=j.data||j.items||(Array.isArray(j)?j:[]);
      if(!arr.length) break;
      all.push.apply(all, arr);
      page++;
    }
    const mapped = all.map(function(p){
      const c = typeof categorize==='function' ? categorize(p) : 'أخرى';
      const prop = (p.properties && p.properties[0]) || {};
      return Object.assign({}, p, {
        id: p._id || p.id,
        name: p.name,
        price: (p.sale_price!=null ? p.sale_price : p.price),
        image: p.image || ((p.images && p.images[0]) || ''),
        desc: p.description || '',
        stock: (prop.min || 0),
        available: p.is_active !== false,
        category: c, cat: c,
        propId: prop._id || '',
        propKey: prop.key || ''
      });
    });
    try{ require('fs').writeFileSync(fp, JSON.stringify(mapped)); }catch(e){}
    res.json(mapped);
  }catch(e){
    console.log('products fetch err:', e.message);
    res.json([]);
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
app.get('/shop',(req,res)=>{
  try{
    let html=require('fs').readFileSync(require('path').join(__dirname,'storefront.html'),'utf8');
    let prods=[];
    const cp=require('path').join(__dirname,'products-cache.json');
    if(require('fs').existsSync(cp)){
      try{prods=JSON.parse(require('fs').readFileSync(cp,'utf8'));}catch(e){prods=[];}
    }
    const inject='<script>window.__PRODUCTS='+JSON.stringify(prods)+';window.__EMBED=1;</script>';
    html=html.replace('</head>',inject+'</head>');
    res.type('html').send(html);
  }catch(e){res.sendFile(require('path').join(__dirname,'storefront.html'));}
});

app.get('/product/:slug', (req,res)=>{
  const p=findSeoProduct(req.params.slug);
  if(!p) return res.status(404).send('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>المنتج غير موجود | Rab7na</title></head><body><h1>المنتج غير موجود</h1><a href="/store">العودة إلى المتجر</a></body></html>');
  const name=seoText(p.name||'منتج على Rab7na');
  const desc=seoDescription(p);
  const image=p.image || ((p.images&&p.images[0])||'');
  const price=p.price!=null?p.price:(p.sale_price!=null?p.sale_price:null);
  const productUrl=SEO_ORIGIN+'/product/'+encodeURIComponent(sitemapSlug(p));
  const schema={
    '@context':'https://schema.org', '@type':'Product', name, description:desc, url:productUrl,
    image:image?[image]:undefined, sku:p.id||p._id,
    category:p.category||p.cat||undefined,
    offers:price!=null?{'@type':'Offer',url:productUrl,priceCurrency:'EGP',price:Number(price),availability:productAvailability(p)}:undefined
  };
  const breadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
    {'@type':'ListItem',position:1,name:'Rab7na',item:SEO_ORIGIN+'/'},
    {'@type':'ListItem',position:2,name:'المتجر',item:SEO_ORIGIN+'/store'},
    {'@type':'ListItem',position:3,name,item:productUrl}
  ]};
  const imageHtml=image?'<img src="'+seoEsc(image)+'" alt="'+seoEsc(name)+'" loading="eager" decoding="async" style="max-width:420px;width:100%;height:auto;border-radius:16px">':'';
  const priceHtml=price!=null?'<p><strong>السعر: '+seoEsc(Number(price).toLocaleString('ar-EG'))+' جنيه مصري</strong></p>':'';
  res.type('html').send('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+seoEsc(name)+' | Rab7na</title><meta name="description" content="'+seoEsc(desc)+'"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="'+seoEsc(productUrl)+'"><meta property="og:type" content="product"><meta property="og:site_name" content="Rab7na"><meta property="og:title" content="'+seoEsc(name)+' | Rab7na"><meta property="og:description" content="'+seoEsc(desc)+'"><meta property="og:url" content="'+seoEsc(productUrl)+'">'+(image?'<meta property="og:image" content="'+seoEsc(image)+'"><meta property="og:image:alt" content="'+seoEsc(name)+'">':'')+'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+seoEsc(name)+' | Rab7na"><meta name="twitter:description" content="'+seoEsc(desc)+'">'+(image?'<meta name="twitter:image" content="'+seoEsc(image)+'">':'')+'<script type="application/ld+json">'+JSON.stringify(schema).replace(/<\//g,'<\\/')+'</script><script type="application/ld+json">'+JSON.stringify(breadcrumb).replace(/<\//g,'<\\/')+'</script><style>body{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:24px;line-height:1.8;color:#172033}a{color:#0f766e}main{display:grid;gap:18px}h1{font-size:clamp(1.6rem,4vw,2.6rem)}</style></head><body><main><nav><a href="/">Rab7na</a> / <a href="/store">المتجر</a></nav><article><h1>'+seoEsc(name)+'</h1>'+imageHtml+'<p>'+seoEsc(desc)+'</p>'+priceHtml+'<p><a href="/store">العودة إلى المتجر واكتشاف المنتجات</a></p></article></main></body></html>');
});

app.get('/store', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>متجر Rab7na | منتجات للتسويق بالعمولة في مصر</title>
<meta name="description" content="اكتشف منتجات متنوعة جاهزة للتسويق بالعمولة في مصر عبر متجر Rab7na، واختر منتجات مناسبة وابدأ مشاركة روابطك ومتابعة عمولاتك.">
<link rel="canonical" href="https://rab7na-store.vercel.app/store">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website"><meta property="og:site_name" content="Rab7na"><meta property="og:title" content="متجر Rab7na | منتجات للتسويق بالعمولة في مصر"><meta property="og:description" content="منتجات متنوعة جاهزة للمسوقين بالعمولة في مصر."><meta property="og:url" content="https://rab7na-store.vercel.app/store"><meta property="og:image" content="https://rab7na-store.vercel.app/icons/icon-512.png"><meta property="og:image:alt" content="شعار متجر Rab7na"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="متجر Rab7na | منتجات للتسويق بالعمولة في مصر"><meta name="twitter:description" content="منتجات متنوعة جاهزة للمسوقين بالعمولة في مصر."><meta name="twitter:image" content="https://rab7na-store.vercel.app/icons/icon-512.png">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Rab7na","url":"https://rab7na-store.vercel.app/","potentialAction":{"@type":"SearchAction","target":"https://rab7na-store.vercel.app/store?q={search_term_string}","query-input":"required name=search_term_string"}}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"متجر Rab7na","url":"https://rab7na-store.vercel.app/store","isPartOf":{"@type":"WebSite","name":"Rab7na","url":"https://rab7na-store.vercel.app/"}}</script>
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

.wa-wrap{display:flex;flex-direction:column;height:70vh;background:#e5ddd5;border-radius:14px;overflow:hidden}
.wa-head{display:flex;gap:10px;align-items:center;background:#075e54;color:#fff;padding:12px}
.wa-av{width:40px;height:40px;background:#128c7e;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px}
.wa-body{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
.wa-msg{max-width:75%;padding:8px 12px;border-radius:12px;font-size:.85rem}
.wa-msg.me{align-self:flex-end;background:#dcf8c6}
.wa-msg.them{align-self:flex-start;background:#fff}
.wa-msg small{display:block;font-size:.65rem;color:#888;margin-top:4px}
.wa-bar{display:flex;gap:6px;padding:8px;background:#f0f0f0;align-items:center}
.wa-bar input{flex:1;border:none;border-radius:20px;padding:10px 14px;font-size:.85rem}
.wa-btn{width:40px;height:40px;border:none;border-radius:50%;background:#128c7e;color:#fff;font-size:18px}
.wa-btn.rec{background:#e00}
.wa-send{width:44px;height:44px;border:none;border-radius:50%;background:#075e54;color:#fff;font-size:18px}

body.chatfull header.header{display:none}
body.chatfull .wa-wrap{height:calc(100vh - 62px);border-radius:0}
.wa-back{background:none;border:none;color:#fff;font-size:22px}
</style>
<link rel="stylesheet" href="/store-enh.css?v=3">
</head>
<body><div id="splash" style="position:fixed;inset:0;background:#f6f8f7;z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px"><div style="width:46px;height:46px;border:4px solid #e2e8f0;border-top-color:#0f766e;border-radius:50%;animation:sp 1s linear infinite"></div><b style="color:#0f766e">Rab7na</b><style>@keyframes sp{to{transform:rotate(360deg)}}</style></div>
<style id="modernDash">
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Tajawal:wght@400;500;700;800;900&family=Changa:wght@600;700;800&display=swap');
:root{--p:#0f766e;--p2:#10b981;--bg:#f6faf8;--card:#fff;--tx:#0b2420;--mut:#5b6b66;--rad:22px;--sh:0 12px 40px -14px rgba(15,118,110,.20)}
*{font-family:'IBM Plex Sans Arabic','Tajawal',system-ui,sans-serif;-webkit-tap-highlight-color:transparent}
body{background:var(--bg)!important;color:var(--tx)}
h1,h2,h3,.eh-logo,.section-title{font-family:'Changa',sans-serif!important}
.eh-logo{background:linear-gradient(135deg,var(--p),var(--p2));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-weight:800;font-size:1.5rem}
.header{background:rgba(255,255,255,.85)!important;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(15,118,110,.1)!important;box-shadow:0 4px 24px -12px rgba(15,118,110,.15)}
.card,.stat{background:var(--card)!important;border:1px solid rgba(15,118,110,.08)!important;border-radius:var(--rad)!important;box-shadow:var(--sh)!important;transition:transform .2s}
.card:active,.stat:active{transform:scale(.98)}
.stat .v,.card .v{font-family:'Changa'!important;background:linear-gradient(135deg,var(--p),var(--p2));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-weight:800}
.btn,[class*="btn"]{border-radius:16px!important;font-weight:800!important;background:linear-gradient(135deg,var(--p),var(--p2))!important;color:#fff!important;border:none!important;box-shadow:0 10px 26px -10px rgba(16,185,129,.55)!important}
[class*="hero"],[class*="banner"]{background:linear-gradient(135deg,var(--p),var(--p2))!important;border-radius:26px!important;box-shadow:var(--sh)}
.section-title{position:relative;padding-right:14px}
.section-title:before{content:"";position:absolute;right:0;top:15%;bottom:15%;width:4px;border-radius:4px;background:linear-gradient(180deg,var(--p),var(--p2))}
input,select,textarea{border-radius:16px!important;border:1.5px solid rgba(15,118,110,.15)!important;background:#fff!important;font-weight:600}
.nav{background:rgba(255,255,255,.92)!important;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:1px solid rgba(15,118,110,.1)!important}
.nav button{color:var(--mut)!important;font-weight:700}
.nav button.active{color:var(--p)!important}
.eh-cartb,.eh-bell{border-radius:16px!important;background:linear-gradient(135deg,var(--p),var(--p2))!important;box-shadow:0 6px 18px -6px rgba(16,185,129,.5)}
[class*="chip"],[class*="cat"]{border-radius:50px!important;font-weight:700!important}
[class*="chip"].on,[class*="cat"].on,[class*="chip"].active{background:linear-gradient(135deg,var(--p),var(--p2))!important;color:#fff!important;border:none!important}
[class*="badge"],[class*="comm"]{background:linear-gradient(135deg,var(--p),var(--p2))!important;color:#fff!important}
#fsheet{border-radius:26px 26px 0 0!important;background:#fff!important;box-shadow:0 -20px 60px rgba(15,23,42,.2)!important}
#fsheet h3{font-family:'Changa';color:var(--p)}
#fsheet button{border-radius:16px!important;border:1.5px solid rgba(15,118,110,.15)!important;background:#f6faf8!important;color:var(--tx)!important;font-weight:700!important}
#fsheet button:active{background:var(--p)!important;color:#fff!important}
</style>
<header class="header"><div id="ht" style="display:none"></div><div class="eh-brand"><span class="eh-logo">Rab7na 💰</span><small>منصة التسويق بالعمولة</small></div><button class="eh-profile" onclick="go('profile')"><span class="eh-pname">حسابي<small>✔ مسوق</small></span><span class="eh-av">👤</span></button><button class="eh-cartb" onclick="go('cart')">🛒<i id="cc">0</i></button><button class="eh-bell" onclick="ehNotifToggle()">🔔<i>3</i></button></header>

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
  <label>رقم الهاتف</label><input id="pPhone" style="margin-bottom:10px"><label style="display:block;font-size:.75rem;font-weight:700;margin:10px 0 5px">💰 عمولتك (تتخصم من سعر المنتج — مش بتظهر للعميل)</label><input id="pComm" inputmode="numeric">
  <button class="btn btn-primary" onclick="saveProf()" style="margin-top:14px">حفظ</button>
  <p class="msg" id="pMsg"></p>
</div>

<div class="page" id="p-withdraw">
  <div class="stat"><div class="l">الرصيد المتاح</div><div class="v" id="wBal">0 ج.م</div></div>
  <div style="height:12px"></div>
  <div class="ws">
<div class="w sel" data-m="vodafone" onclick="sw(this)"><img class="wlogo" src="https://cdn.phototourl.com/free/2026-08-04-b14d903b-4a0c-41e8-a631-fae88171eb0a.jpg" alt="فودافون">فودافون كاش</div>
<div class="w" data-m="instapay" onclick="sw(this)"><img class="wlogo" src="https://cdn.phototourl.com/free/2026-08-04-49e3641b-5b7a-40bf-8222-eca8d14725b1.jpg" alt="إنستاباي">إنستاباي</div>
<div class="w" data-m="orange" onclick="sw(this)"><img class="wlogo" src="https://cdn.phototourl.com/free/2026-08-04-5002e910-6314-4bb1-95f7-bc09173760d8.png" alt="أورنج">أورنج كاش</div>
<div class="w" data-m="etisalat" onclick="sw(this)"><img class="wlogo" src="https://cdn.phototourl.com/free/2026-08-04-0b077648-1cb1-4577-8242-891aafbdf593.jpg" alt="اتصالات">اتصالات كاش</div>
<div class="w" data-m="we" onclick="sw(this)"><img class="wlogo" src="https://cdn.phototourl.com/free/2026-08-04-9a3aaae0-39b1-4119-9242-d2b2be39462c.png" alt="وي">وي باي</div>
<div class="w" data-m="fawry" onclick="sw(this)"><img class="wlogo" src="https://cdn.phototourl.com/free/2026-08-04-ba3796d2-2223-4423-8cbb-104e62c49b32.jpg" alt="فوري">فوري</div>
<div class="w" data-m="bank" onclick="sw(this)"><img class="wlogo" src="https://cdn.phototourl.com/free/2026-08-04-5a5676eb-c229-4c0a-9e4a-889017a22135.jpg" alt="بنكي">تحويل بنكي</div>
</div>
  <label>المبلغ</label><input type="number" id="wAmt" placeholder="المبلغ">
  <label>رقم المحفظة / الحساب</label><input id="wDet" placeholder="01xxxxxxxxx">
  <button class="btn btn-primary" onclick="doWd()" style="margin-top:12px">تأكيد السحب</button>
  <p class="msg" id="wMsg"></p>
  <p style="font-size:.78rem;color:var(--muted);text-align:center;margin-top:10px">العمولة تُضاف بعد التسليم فقط</p>
</div>

<div class="page" id="p-support">
  <div class="wa-wrap">
    <div class="wa-head"><button class="wa-back" onclick="go('store')">→</button><div class="wa-av">🎧</div><div><b>الدعم الفني</b><small>متصل الآن</small></div></div>
    <div class="wa-body" id="waBody"></div>
    <div class="wa-bar">
      <input type="file" id="waFile" accept="image/*" hidden>
      <button class="wa-btn" onclick="document.getElementById('waFile').click()">📷</button>
      <button class="wa-btn" id="waMic">🎤</button>
      <input id="waText" placeholder="اكتب رسالتك...">
      <button class="wa-send" onclick="waSend()">➤</button>
    </div>
  </div>
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

<nav class="nav"><button class="active" data-p="store" onclick="go('store')"><svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/></svg><span>الرئيسية</span></button><button data-p="products" onclick="go('store');setTimeout(function(){var g=document.getElementById('g');if(g)g.scrollIntoView({behavior:'smooth'})},200)"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>المنتجات</span></button><button data-p="orders" onclick="go('orders')"><svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg><span>طلباتي</span></button><button data-p="withdraw" onclick="go('withdraw')"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v10"/><path d="M15 9.5c-.5-1-5.5-1-5.5 1s5 2 5 3-4.5 1.5-5.5.5"/></svg><span>الأرباح</span></button><button data-p="profile" onclick="go('profile')"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg><span>حسابي</span></button><button data-p="support" onclick="go('support')"><svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/></svg><span>دعم</span></button></nav><script>
let products=[], priceList=[], cart=JSON.parse(localStorage.getItem('scart')||'[]'), cur=null, qty=1, submitting=false, cc='all', cs='', wM='vodafone';
const titles={store:'Rab7na',cart:'السلة',checkout:'إتمام الطلب',orders:'طلباتي',profile:'حسابي',withdraw:'سحب الأرباح',support:'الدعم'};

function updCC(){document.getElementById('cc').textContent=cart.reduce((s,i)=>s+(i.qty||1),0)}
function go(p){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  document.getElementById('p-'+p).classList.add('active');
  document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));
  const n=document.querySelector('.nav button[data-p="'+p+'"]'); if(n) n.classList.add('active');
  document.getElementById('ht').innerHTML='<div style="display:flex;align-items:center;gap:12px"><div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;color:#fff;font-size:26px;font-weight:900">R</div><div><div style="font-size:28px;font-weight:900;color:#fff">'+(titles[p]||'Rab7na')+'</div><div style="font-size:12px;opacity:.9">Affiliate Marketing Platform</div></div></div>';
  if(p==='cart') renderCart();
  if(p==='orders') loadOrders();
  if(p==='profile'||p==='withdraw') loadMe();
  if(p==='checkout'){ initCheckout(); recalc(); }
  if(p==='support'){loadChat();document.body.classList.add('chatfull')}else{document.body.classList.remove('chatfull')}
}

function stockLabel(s, avail){
  if(!avail || s<=0) return '<span class="stock-out">نفد المخزون</span>';
  if(s<=5) return '<span class="stock-low">متبقي: '+s+' قطعة فقط</span>';
  return '<span class="stock-ok">متوفر: '+s+' قطعة</span>';
}

async function loadProducts(){
  const r=await fetch('/api/products'); products=(await r.json()).map(function(p){var sold=0;try{sold=(JSON.parse(localStorage.getItem('ssold')||'{}')[p.id])||0}catch(e){}
p.stock=Math.max(0,(p.stock!=null?+p.stock:999)-sold);p.available=(p.available!=null?!!p.available:(p.stock>0));return p});
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
    return '<div class="card" onclick="openP('+i+')"><img src="'+(p.image||'')+'" alt="'+(p.name||'منتج Rab7na')+'" loading="lazy" decoding="async"><div class="b"><div class="t">'+p.name+'</div><div class="pr">'+Number(p.price).toLocaleString('ar-EG')+' ج.م</div><div class="stock">'+stockLabel(p.stock,p.available)+'</div></div></div>';
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

function toast(m){var t=document.createElement('div');t.textContent=m;t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#0f766e;color:#fff;padding:10px 22px;border-radius:50px;font-weight:700;z-index:9999;font-family:Cairo,serif;box-shadow:0 8px 20px rgba(0,0,0,.25)';document.body.appendChild(t);setTimeout(function(){t.remove()},1800)}
function addCart(){
  if(window._adding)return;window._adding=true;
  if(!cur||!cur.available){toast('نفد المخزون 😔');window._adding=false;return}
  const sale=Number(document.getElementById('editPrice').value);
  if(sale<Number(cur.price)){toast('السعر أقل من الحد الأدنى');window._adding=false;return}
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
  setTimeout(()=>{btn.textContent='🛒 أضف إلى السلة';window._adding=false;closeP()},800);
}

function renderCart(){
  const list=document.getElementById('cartList'), empty=document.getElementById('cartEmpty'), foot=document.getElementById('cartFooter');
  if(!cart.length){list.innerHTML='';empty.style.display='block';foot.style.display='none';return}
  empty.style.display='none';foot.style.display='block';
  let total=0;
  list.innerHTML=cart.map((it,i)=>{
    total+=it.price*it.qty;
    return '<div class="cart-item"><img src="'+(it.image||'')+'" alt="'+(it.name||'منتج Rab7na')+'" loading="lazy" decoding="async"><div class="info"><div class="name">'+it.name+'</div><div class="meta">'+stockLabel(it.stock,true)+'</div><div class="price">'+(it.price*it.qty).toLocaleString('ar-EG')+' ج.م <small style="color:var(--muted);font-weight:600">('+it.price+' × '+it.qty+')</small></div><div class="actions"><button class="qbtn" onclick="cartQty('+i+',-1)">−</button><span class="qval">'+it.qty+'</span><button class="qbtn" onclick="cartQty('+i+',1)">+</button><button class="rm" onclick="rmCart('+i+')">حذف</button></div></div></div>';
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
    const r=await fetch('/api/create-order',{method:'POST',headers:{'Content-Type':'application/json','x-auth-token':(localStorage.getItem('etok')||'')},body:JSON.stringify(body)});
    const d=await r.json();
    msg.textContent=d.message||d.error; msg.className='msg '+(d.message?'ok':'err');
    if(d.message){var sold={};try{sold=JSON.parse(localStorage.getItem('ssold')||'{}')}catch(e){}cart.forEach(function(i){sold[i.id]=(sold[i.id]||0)+i.qty});localStorage.setItem('ssold',JSON.stringify(sold));cart=[];localStorage.setItem('scart','[]');updCC();setTimeout(()=>go('orders'),1200)}
  }catch(e){msg.textContent='خطأ في الاتصال';msg.className='msg err'}
  submitting=false;
  document.getElementById('btnSubmit').disabled=false;
}

async function loadOrders(){
  if(localStorage.getItem('etok')){var ol=document.getElementById('oList');if(ol)ol.innerHTML='<div style="text-align:center;padding:50px 0;color:#888">📦 لا توجد طلبات بعد<br><small style="color:#aaa">طلباتك هتظهر هنا أول ما تبيع</small></div>';return;}
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
  const r=await fetch('/api/set-commission',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({commission:Number(document.getElementById('pComm').value)||0})});fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json','x-auth-token':(localStorage.getItem('etok')||'')},body:JSON.stringify({name:document.getElementById('pName').value,phone:document.getElementById('pPhone').value})});
  const d=await r.json(); document.getElementById('pMsg').textContent=d.message; document.getElementById('pMsg').className='msg ok';
}
function sw(el){document.querySelectorAll('.w').forEach(x=>x.classList.remove('sel'));el.classList.add('sel');wM=el.dataset.m}
async function doWd(){
  const amount=Number(document.getElementById('wAmt').value), details=document.getElementById('wDet').value, msg=document.getElementById('wMsg');
  if(!amount||amount<=0){msg.textContent='أدخل مبلغ صحيح';msg.className='msg err';return}
  if(!details){msg.textContent='أدخل رقم المحفظة';msg.className='msg err';return}
  const r=await fetch('/api/withdraw',{method:'POST',headers:{'Content-Type':'application/json','x-auth-token':(localStorage.getItem('etok')||'')},body:JSON.stringify({amount,method:wM,details})});
  const d=await r.json(); msg.textContent=d.message||d.error; msg.className='msg '+(d.message?'ok':'err');
  if(d.message){loadMe();document.getElementById('wAmt').value='';document.getElementById('wDet').value=''}
}
let waRec=null,waChunks=[];
async function loadChat(){try{const d=await(await fetch('/api/chat',{headers:{'x-auth-token':(localStorage.getItem('etok')||'')}})).json();const b=document.getElementById('waBody');if(!b)return;b.innerHTML=(d||[]).map(m=>{let inner='';if(m.type==='image')inner='<img src="'+m.data+'" style="max-width:180px;border-radius:10px">';else if(m.type==='audio')inner='<audio controls src="'+m.data+'" style="width:200px"></audio>';else inner='<span>'+(m.text||'').replace(/</g,'&lt;')+'</span>';return '<div class="wa-msg '+(m.from==='user'?'me':'them')+'">'+inner+'<small>'+m.time+'</small></div>';}).join('');b.scrollTop=b.scrollHeight;}catch(e){}}
async function waSend(){const t=document.getElementById('waText').value.trim();if(!t)return;await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json','x-auth-token':(localStorage.getItem('etok')||'')},body:JSON.stringify({from:'user',type:'text',text:t})});document.getElementById('waText').value='';loadChat();}
document.getElementById('waFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async()=>{await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json','x-auth-token':(localStorage.getItem('etok')||'')},body:JSON.stringify({from:'user',type:'image',data:r.result})});loadChat();};r.readAsDataURL(f);e.target.value='';};
document.getElementById('waMic').onclick=async()=>{const btn=document.getElementById('waMic');if(waRec){waRec.stop();return;}try{const st=await navigator.mediaDevices.getUserMedia({audio:true});waRec=new MediaRecorder(st);waChunks=[];waRec.ondataavailable=e=>waChunks.push(e.data);waRec.onstop=async()=>{const blob=new Blob(waChunks,{type:'audio/webm'});const r=new FileReader();r.onload=async()=>{await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json','x-auth-token':(localStorage.getItem('etok')||'')},body:JSON.stringify({from:'user',type:'audio',data:r.result})});loadChat();};r.readAsDataURL(blob);st.getTracks().forEach(x=>x.stop());waRec=null;btn.textContent='🎤';btn.classList.remove('rec');};waRec.start();btn.textContent='⏹';btn.classList.add('rec');}catch(e){alert('فعّل الميكروفون أولاً');}};
setInterval(()=>{const p=document.getElementById('p-support');if(p&&p.classList.contains('active'))loadChat();},3000);
document.getElementById('s').oninput=e=>{clearTimeout(window.t);window.t=setTimeout(()=>{cs=e.target.value;renderP()},180)};
document.getElementById('cats').onclick=e=>{if(e.target.classList.contains('c')){document.querySelectorAll('.c').forEach(b=>b.classList.remove('active'));e.target.classList.add('active');cc=e.target.dataset.c;renderP()}};
updCC(); loadProducts(); loadPrices();
</script>
<script src="/store-enh.js?v=3" defer></script>

</body>
</html>`);
});

app.get('/',(req,res)=>res.sendFile(require('path').join(__dirname,'landing.html')));
app.get('/home',(req,res)=>res.sendFile(require('path').join(__dirname,'landing.html')));

require('./auth')(app);

app.get('/api/me', async (req,res)=>{try{const u=await currentUser(req);if(!u)return res.json({balance:0,orders:[],name:'',phone:''});const d=await readAffiliate();res.json({id:u.id,name:u.name||u.display_name||'',phone:u.phone||u.contact||'',balance:u.balance||0,orders:(d.orders||[]).filter(o=>String(o.userId)===String(u.id))});}catch(e){res.status(500).json({error:'تعذر تحميل الحساب'});}});
app.post('/api/profile', async (req,res)=>{try{const u=await currentUser(req);if(!u)return res.status(401).json({error:'login'});if(req.body.name)u.name=String(req.body.name);if(req.body.phone)u.phone=String(req.body.phone);await firestore.saveUser(u);res.json({ok:true,message:'تم حفظ البيانات'});}catch(e){res.status(500).json({error:'فشل الحفظ'});}});
app.post('/api/set-commission', (req,res)=>res.json({ok:true,message:'تم تحديث العمولة'}));
app.post('/api/withdraw', async (req,res)=>{try{const u=await currentUser(req);if(!u)return res.status(401).json({error:'login'});const amount=Number(req.body&&req.body.amount)||0;if(amount<=0)return res.json({error:'أدخل مبلغ صحيح'});if(amount>(+u.balance||0))return res.json({error:'الرصيد غير كافي'});const d=await readAffiliate();d.withdrawals=d.withdrawals||[];const w={id:Date.now(),userId:u.id,userName:u.name||'',amount,method:req.body.method||'',details:req.body.details||'',status:'pending',date:new Date().toISOString()};d.withdrawals.unshift(w);u.balance=(+u.balance||0)-amount;u.totalWithdrawn=(+u.totalWithdrawn||0)+amount;await Promise.all([saveAffiliate(d),firestore.saveUser(u)]);res.json({ok:true,message:'تم إرسال طلب السحب بنجاح'});}catch(e){console.error('withdraw:',e.message);res.status(500).json({error:'تعذر إرسال طلب السحب حالياً'});}});

async function refreshProductsCache(){
  try{
    const r=await fetch('https://api.safka.app/api/v1/products?page=1&limit=500',{headers:{'x-api-key':process.env.SAFKA_API_KEY||''}});
    const j=await r.json();const items=j.data||j.items||j||[];
    require('fs').writeFileSync(require('path').join(__dirname,'products-cache.json'),JSON.stringify(items));
    console.log('✅ Products cached:',items.length);
  }catch(e){console.log('cache err:',e.message)}
}
refreshProductsCache();setInterval(refreshProductsCache,10*60*1000);

require('./admin')(app);
require('./notify')(app);

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
  const commission=Number(b.commission)||0;
  const total=Number(b.total)||0;
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
    if(!r.ok)return res.json({error:d.errors?d.errors.map(e=>e.msg).join(', ').replace('محظور عشان سلوكه وحش في النظام','الرقم ده محظور في Rab7na - استخدم رقمًا حقيقيًا'):'فشل الطلب'});
    const customer=await currentUser(req);
    const external=d.data||d;
    const savedOrder={id:external.id||external._id||Date.now(),serial:external.id||external._id||Date.now(),userId:customer&&customer.id||null,products:b.productNames||items.map(x=>x.product),items,client_name:body.client_name,client_phone1:body.client_phone1,client_address:body.client_address,status:'قيد التأكيد',date:new Date().toISOString(),commission,total,adjustedTotal:total,shipping:Number(b.shipping_cost)||0,originalMerchandiseTotal:items.reduce((sum,x)=>sum+(x.originalPrice||0)*(x.qty||1),0),finalMerchandiseTotal:items.reduce((sum,x)=>sum+(x.finalPrice||0)*(x.qty||1),0),external:external};
    const affiliate=await readAffiliate();affiliate.orders=affiliate.orders||[];affiliate.orders.unshift(savedOrder);await saveAffiliate(affiliate);
    res.json({ok:true,message:'تم إرسال الطلب بنجاح',order:external});
  }catch(e){
    console.log('SAFKA error:',e.message);
    res.json({error:'تعذر الاتصال بالخادم'});
  }
});

app.listen(PORT, () => {
  console.log('المتجر: http://localhost:' + PORT);
  getProducts();
  getPriceList();
});
