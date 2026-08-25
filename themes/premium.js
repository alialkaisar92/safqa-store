/* THEME: Modern E-commerce (white header + dark green hero) */
window.THEME = {
  name: 'Rab7na Modern',
  sections: ['hero','categories','products'],
  wrapClass: 'wrap2',
  titleClass: 'title2',
  gridClass: 'grid2',

  css: [
    ':root{--g:#16a34a;--gd:#0b5d3b;--gdd:#0a3d2a;--bg:#f4f7f5;--card:#fff;--ink:#16281f;--mut:#8aa094;--line:#e6eee9;--rad:16px}',
    '*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;font-family:Cairo,Tajawal,system-ui,sans-serif}',
    'body{background:var(--bg);color:var(--ink);margin:0;padding-bottom:76px}',
    /* Header */
    '.hdr2{position:sticky;top:0;z-index:50;background:#fff;display:flex;align-items:center;gap:10px;padding:12px 14px;box-shadow:0 2px 10px rgba(0,0,0,.06)}',
    '.ic2{border:none;background:#f2f6f3;width:44px;height:44px;border-radius:14px;font-size:20px;cursor:pointer;position:relative;flex:0 0 auto}',
    '.logo2{font-weight:900;font-size:22px;color:#123;white-space:nowrap}.logo2 span{color:var(--g)}',
    '.search2{flex:1}.search2 input{width:100%;border:1.5px solid var(--line);background:#f7faf8;border-radius:999px;padding:12px 16px;font-size:14px;outline:none}.search2 input:focus{border-color:var(--g)}',
    '.cbadge{position:absolute;top:-6px;left:-6px;background:var(--g);color:#fff;font-size:11px;font-weight:800;min-width:20px;height:20px;border-radius:999px;display:flex;align-items:center;justify-content:center;padding:0 5px}',
    /* Hero */
    '.hero2{margin:14px;border-radius:20px;background:linear-gradient(135deg,var(--gdd),var(--gd) 60%,var(--g));color:#fff;padding:26px 20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 12px 30px -12px rgba(11,93,59,.5)}',
    '.hero2 h2{margin:0 0 4px;font-size:22px;font-weight:900}.hero2 p{margin:0 0 14px;opacity:.9}',
    '.hero2-btn{background:var(--g);border:none;color:#fff;font-weight:800;padding:10px 20px;border-radius:12px;cursor:pointer;box-shadow:0 6px 14px -6px rgba(0,0,0,.4)}',
    '.hero2-art{font-size:64px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.3))}',
    /* Cards */
    '.grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:0 14px}',
    '.pcard2{background:var(--card);border:1px solid var(--line);border-radius:var(--rad);overflow:hidden;box-shadow:0 4px 14px -8px rgba(0,0,0,.08);display:flex;flex-direction:column}',
    '.pimg2{position:relative}.pimg2 img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#eef3f0}',
    '.disc2{position:absolute;top:8px;right:8px;background:var(--g);color:#fff;font-size:11px;font-weight:800;padding:4px 9px;border-radius:999px}',
    '.fav2{position:absolute;top:8px;left:8px;border:none;background:#fff;width:34px;height:34px;border-radius:12px;color:#c33;font-size:15px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.12)}',
    '.pbody2{padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px;flex:1}',
    '.pname2{font-size:13px;font-weight:700;line-height:1.4;min-height:2.6em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.rate2{font-size:12px;color:var(--mut)}.rate2 b{color:#f5a623}',
    '.price2{display:flex;align-items:baseline;gap:8px}.price2 s{color:var(--mut);font-size:12px}.price2 b{color:var(--gd);font-size:16px;font-weight:900}',
    '.add2{margin-top:auto;border:none;background:var(--gd);color:#fff;font-weight:800;font-size:13px;padding:11px;border-radius:12px;cursor:pointer}',
    '.add2:active{transform:scale(.97)}',
    /* titles */
    '.title2{font-size:18px;font-weight:900;padding:16px 14px 10px;margin:0}',
    /* Bottom nav */
    '.bnav2{position:fixed;bottom:0;left:0;right:0;background:#fff;display:flex;box-shadow:0 -6px 20px rgba(0,0,0,.08);z-index:60;padding:6px 4px calc(6px + env(safe-area-inset-bottom))}',
    '.bnav2 button{flex:1;border:none;background:none;padding:8px 0;font-size:11px;color:var(--mut);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px}',
    '.bnav2 button.on{background:var(--gd);color:#fff;border-radius:14px;margin:2px}',
    '.bnav2 .bi{font-size:18px}',
    /* Drawer */
    '.overlay2{position:fixed;inset:0;background:rgba(0,0,0,.4);opacity:0;pointer-events:none;transition:.25s;z-index:90}',
    '.overlay2.open{opacity:1;pointer-events:auto}',
    '.drawer2{position:fixed;top:0;bottom:0;right:0;width:300px;max-width:85%;background:#fff;z-index:100;transform:translateX(100%);transition:.28s;display:flex;flex-direction:column;overflow-y:auto}',
    '.drawer2.open{transform:none}',
    '.dr-head{padding:20px;text-align:center}.dr-head .logo2{font-size:26px}.dr-head p{color:var(--mut);font-size:12px;margin:4px 0 0}',
    '.dr-x{position:absolute;top:14px;left:14px;border:none;background:#f2f6f3;width:38px;height:38px;border-radius:12px;font-size:16px;cursor:pointer}',
    '.dr-item{display:flex;align-items:center;gap:12px;margin:6px 14px;padding:14px;border:1px solid var(--line);border-radius:14px;background:#fff;font-weight:700;cursor:pointer;color:var(--ink)}',
    '.dr-item.on{background:var(--gd);color:#fff;border-color:var(--gd)}',
    '.dr-sec{color:var(--mut);font-size:12px;margin:14px 20px 6px}',
    '.dr-login{margin:16px 14px;background:#e9f5ee;border-radius:14px;padding:14px;display:flex;gap:10px;align-items:center;font-size:13px;font-weight:700;cursor:pointer}',
    '.dr-foot{margin-top:auto;padding:18px;text-align:center;color:var(--mut);font-size:12px}',
    '.soc{display:flex;justify-content:center;gap:14px;margin-bottom:10px}.soc a{width:38px;height:38px;border-radius:50%;background:#f2f6f3;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:16px}',
    '@media(min-width:720px){.grid2{grid-template-columns:repeat(3,1fr)}}',
    '@media(min-width:1024px){.grid2{grid-template-columns:repeat(4,1fr)}}'
  ].join('\n'),

  header: function(){
    return '<div class="hdr2">'
      +'<button class="ic2" onclick="openDrawer2()">☰</button>'
      +'<div class="logo2">Rab<span>7na</span></div>'
      +'<div class="search2"><input placeholder="ابحث عن منتج..." oninput="doSearch(this.value)"></div>'
      +'<button class="ic2" onclick="openCart()">🛒<span class="cbadge" id="cc">0</span></button>'
      +'</div>'
      +'<div class="overlay2" id="ov2" onclick="closeDrawer2()"></div>'
      +'<aside class="drawer2" id="dr2">'
      +'<button class="dr-x" onclick="closeDrawer2()">✕</button>'
      +'<div class="dr-head"><div class="logo2">Rab<span>7na</span></div><p>تصفح المنتجات وأرسل طلبك</p></div>'
      +'<div class="dr-item on">🏠 الرئيسية</div>'
      +'<div class="dr-item" onclick="closeDrawer2();document.getElementById(\'prodTitle\')&&document.getElementById(\'prodTitle\').scrollIntoView()">🛍️ المنتجات</div>'
      +'<div class="dr-item" onclick="closeDrawer2();openCart()">🛒 السلة</div>'
      +'<div class="dr-sec">خدمات المتجر</div>'
      +'<div class="dr-item" onclick="closeDrawer2();openShip&&openShip()">🚚 أسعار الشحن حسب المحافظة</div>'
      +'<div class="dr-item" onclick="closeDrawer2();Rab7naSupport&&Rab7naSupport.open()">💬 شات الدعم</div>'
      +'<div class="dr-login">👤 تسجيل الدخول / إنشاء حساب<br><small style="font-weight:400">للاستفادة من جميع الميزات</small></div>'
      +'<div class="dr-foot"><div class="soc"><a>📘</a><a>📸</a><a>💬</a><a>✈️</a></div>جميع الحقوق محفوظة © Rab7na 2025</div>'
      +'</aside>';
  },

  hero: function(){
    return '<div class="hero2"><div><h2>عرض أسعار الشحن</h2><p>حسب المحافظة</p><button class="hero2-btn" onclick="openShip&&openShip()">اعرف الآن</button></div><div class="hero2-art">🚚</div></div>';
  },

  card: function(p,i){
    var img=p.image||((p.images&&p.images[0])||'');
    var price=p.price||p.sale_price||0;
    var old=Math.round(price*1.18)||price;
    var disc=Math.max(5,Math.round((1-price/old)*100))||10;
    return '<div class="pcard2" onclick="openP('+i+')">'
      +'<div class="pimg2"><img loading="lazy" src="'+img+'" alt=""><span class="disc2">-'+disc+'%</span><button class="fav2" onclick="event.stopPropagation()">♡</button></div>'
      +'<div class="pbody2"><div class="pname2">'+(p.name||'')+'</div>'
      +'<div class="rate2"><b>★</b> 4.'+(8-(i%3))+' ('+(120+(i*7)%280)+')</div>'
      +'<div class="price2"><s>'+old+' ج.م</s><b>'+price+' ج.م</b></div>'
      +'<button class="add2" onclick="event.stopPropagation();addDirect('+i+')">🛒 أضف إلى السلة</button>'
      +'</div></div>';
  },

  footer: function(){ return ''; },

  mobileNav: function(){
    return '<nav class="bnav2">'
      +'<button onclick="go&&go(\'profile\')"><span class="bi">👤</span>حسابي</button>'
      +'<button onclick="go&&go(\'orders\')"><span class="bi">📦</span>طلباتي</button>'
      +'<button class="on"><span class="bi">🏠</span>الرئيسية</button>'
      +'<button onclick="document.getElementById(\'prodTitle\')&&document.getElementById(\'prodTitle\').scrollIntoView()"><span class="bi">🗂️</span>التصنيفات</button>'
      +'<button onclick="openCart()"><span class="bi">🛒</span>السلة</button>'
      +'</nav>';
  }
};

/* helpers */
window.addDirect=function(i){
  var P=window.P||window.__PRODUCTS||[];
  if(!P[i])return;
  var c=window.cart||(window.cart=[]);
  var ex=c.find(function(x){return x.id===P[i].id});
  if(ex)ex.qty++;else c.push({id:P[i].id,name:P[i].name,price:P[i].price,image:P[i].image,qty:1});
  if(window.updCC)updCC();
  if(window.openCart)openCart();
};
window.openDrawer2=function(){var d=document.getElementById('dr2'),o=document.getElementById('ov2');if(d)d.classList.add('open');if(o)o.classList.add('open');};
window.closeDrawer2=function(){var d=document.getElementById('dr2'),o=document.getElementById('ov2');if(d)d.classList.remove('open');if(o)o.classList.remove('open');};
window.openWA=function(){if(window.Rab7naSupport)Rab7naSupport.open();};
