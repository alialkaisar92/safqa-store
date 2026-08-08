window.THEME={id:'store-pro',name:'Store Pro',css:`
body{background:#f7faf9;color:#0f172a}
#header .ab{background:linear-gradient(135deg,#10b981,#0f766e);color:#fff;font-size:.7rem;text-align:center;padding:6px}
#header .mh{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#fff}
#header .lg{font-weight:900;color:#0f766e;font-size:1.15rem}
#header .nv{display:flex;gap:10px;overflow-x:auto;background:#fff;padding:8px 16px;border-top:1px solid #eee}
#header .nv a{flex:0 0 auto;font-size:.75rem;font-weight:700;color:#5b6b7a}
.sp-hero{margin:14px;border-radius:18px;background:linear-gradient(135deg,#10b981,#0f766e);color:#fff;padding:34px 22px;text-align:center}
.sp-hero h1{font-size:1.5rem;font-weight:900}.sp-hero p{margin:8px 0 14px;opacity:.95}
.sp-hero button{background:#fff;color:#0f766e;border-radius:12px;padding:11px 26px;font-weight:800}
.sec-t{padding:18px 16px 0;font-size:1.05rem;font-weight:800}
.pgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:14px}
@media(min-width:760px){.pgrid{grid-template-columns:repeat(4,1fr)}}
.sp-card{background:#fff;border:1px solid rgba(15,118,110,.14);border-radius:14px;overflow:hidden;position:relative}
.sp-card .off{position:absolute;top:8px;right:8px;background:#ef4444;color:#fff;font-size:.62rem;font-weight:800;border-radius:6px;padding:2px 8px}
.sp-card img{height:140px;width:100%;object-fit:cover}
.sp-card .in{padding:10px}
.sp-card .nm{font-size:.78rem;font-weight:700;min-height:2.2em}
.sp-card .rt{color:#f59e0b;font-size:.66rem}
.sp-card .pr{color:#0f766e;font-weight:900}.sp-card .op{color:#999;text-decoration:line-through;font-size:.7rem;margin:0 6px}
.sp-card .stk{font-size:.64rem;color:#5b6b7a;margin:3px 0}
.sp-card .btns{display:flex;gap:6px}
.sp-card .add{flex:1;background:#0f766e;color:#fff;border-radius:8px;padding:8px;font-size:.7rem;font-weight:800}
.sp-card .buy{flex:1;background:#eef5f2;color:#0f766e;border-radius:8px;padding:8px;font-size:.7rem;font-weight:800}
.cats{display:flex;gap:8px;overflow-x:auto;padding:12px 16px}
.cats .cat{flex:0 0 auto;background:#fff;border:1px solid rgba(15,118,110,.14);border-radius:10px;padding:9px 16px;font-size:.75rem;font-weight:700}
#footer{background:#0f766e;color:#fff;margin-top:20px;padding:24px 16px;text-align:center;font-size:.75rem}
`,header:()=>`<div class="ab">✨ خصم 10% على أول طلب — كود: WELCOME</div><div class="mh"><div class="lg">🛍️ Earnify Store</div><button class="cartb" onclick="openCart()" style="background:#0f766e;color:#fff;border-radius:12px;padding:8px 13px">🛒<i id="cc">0</i></button></div><div class="nv"><a>الرئيسية</a><a>عروض</a><a>إلكترونيات</a><a>أزياء</a><a>منزل</a><a>جمال</a></div>`,
hero:()=>`<div class="sp-hero"><h1>كل ما تحتاجه في مكان واحد</h1><p>منتجات أصلية • شحن سريع • دفع عند الاستلام</p><button onclick="document.querySelector('.pgrid').scrollIntoView({behavior:'smooth'})">تسوّق الآن</button></div>`,
card:(p,i)=>{var old=Math.round(p.price*1.2),off=Math.round(100-(p.price/old*100));return `<div class="sp-card"><span class="off">-${off}%</span><img src="${p.image||''}"><div class="in"><div class="nm">${p.name}</div><div class="rt">★★★★☆</div><span class="pr">${fmt(p.price)}</span><span class="op">${fmt(old)}</span><div class="stk">${(p.stock>0)?'✔ متوفر':'✖ نفد'}</div><div class="btns"><button class="add" onclick="openP(${i})">🛒 أضف</button><button class="buy" onclick="openP(${i})">اشترِ الآن</button></div></div></div>`},
sections:['hero','categories','flash','products','best'],
footer:()=>`<div>Earnify Store © ${new Date().getFullYear()} — تسوّق بثقة</div>`};
