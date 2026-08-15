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
app.post('/api/chat',(req,res)=>{const b=req.body||{};const k=chatKey(req);if(!k)return res.status(401).json({error:'login'});const all=chatLoad();all[k]=all[k]||[];let d=b.data||'';if(typeof d==='string'&&d.indexOf('data:')===0){try{const _fs=require('fs'),_pt=require('path');const _dir=_pt.join(__dirname,'uploads');if(!_fs.existsSync(_dir))_fs.mkdirSync(_dir);const _mt=(d.match(/^data:([^;]+);/)||[])[1]||'bin';const _ext=((_mt.split('/')[1])||'bin').replace(/[^a-z0-9]/gi,'');const _fn=Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+_ext;_fs.writeFileSync(_pt.join(_dir,_fn),Buffer.from((d.split(',')[1])||'','base64'));d='/uploads/'+_fn;}catch(_e){}}const m={id:Date.now(),from:b.from||'user',type:b.type||'text',text:b.text||'',data:d,time:new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})};all[k].push(m);require('fs').writeFileSync(CHAT_FILE,JSON.stringify(all));if(global.notifyChat)global.notifyChat();res.json({ok:true,m})});

app.post('/api/support', (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.json({ error: 'اكتب رسالتك' });
  data.tickets = data.tickets || [];
  data.tickets.unshift({ id: Date.now(), message: message.trim(), status: 'جديد', date: new Date().toISOString().slice(0, 10), reply: '' });
  save();
  res.json({ message: 'تم إرسال رسالتك للدعم ✓' });
});
app.post('/api/upload',(req,res)=>{const pl=global.verifyJWT?global.verifyJWT(req.headers['x-auth-token']||''):null;if(!pl)return res.status(401).json({error:'login'});const b=req.body||{};if(typeof b.data!=='string'||b.data.indexOf('data:')!==0)return res.json({error:'صورة غير صالحة'});try{const fs=require('fs'),pt=require('path');const dir=pt.join(__dirname,'uploads');if(!fs.existsSync(dir))fs.mkdirSync(dir);const mt=(b.data.match(/^data:([^;]+);/)||[])[1]||'image/png';const ext=((mt.split('/')[1])||'png').replace(/[^a-z0-9]/gi,'')||'png';const fn='t'+Date.now()+'-'+Math.random().toString(36).slice(2,6)+'.'+ext;fs.writeFileSync(pt.join(dir,fn),Buffer.from((b.data.split(',')[1])||'','base64'));res.json({ok:true,url:'/uploads/'+fn});}catch(e){res.json({error:'فشل الرفع'});}});
app.get('/api/theme/:id',(req,res)=>{try{const db=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'store-users.json'),'utf8'));const u=(db.users||[]).find(x=>String(x.id)===String(req.params.id));res.json({ok:true,theme:(u&&u.theme)||null,name:u?u.name:''});}catch(e){res.json({ok:true,theme:null,name:''});}});
app.post('/api/my/theme',(req,res)=>{const pl=global.verifyJWT?global.verifyJWT(req.headers['x-auth-token']||''):null;if(!pl)return res.status(401).json({error:'login'});try{const fp=require('path').join(__dirname,'store-users.json');const db=JSON.parse(require('fs').readFileSync(fp,'utf8'));const u=(db.users||[]).find(x=>x.id===pl.uid);if(!u)return res.status(401).json({error:'login'});u.theme=req.body||{};require('fs').writeFileSync(fp,JSON.stringify(db,null,2));res.json({ok:true});}catch(e){res.json({error:'فشل الحفظ'});}});
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
app.get('/store', (req, res) => {
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


app.get('/',(req,res)=>res.sendFile(require('path').join(__dirname,'landing.html')));
app.get('/home',(req,res)=>res.sendFile(require('path').join(__dirname,'landing.html')));
require('./auth')(app);

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
    qty: Number(it.qty||it.quantity||1)
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
    if(!r.ok)return res.json({error:d.errors?d.errors.map(e=>e.msg).join(', ').replace('محظور عشان سلوكه وحش في النظام','الرقم ده محظور في صفقة - استخدم رقم حقيقي'):'فشل الطلب'});
    res.json({ok:true,order:d.data||d});
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
