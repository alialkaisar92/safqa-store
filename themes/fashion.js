window.THEME={id:'fashion',name:'Fashion',css:`
body{background:#fff5f7;color:#1f2937}
#header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#fff}
#header .lg{font-weight:900;color:#db2777;font-size:1.2rem;letter-spacing:1px}
#header .ic{display:flex;gap:12px;font-size:1.1rem}
.fs-hero{height:60vh;min-height:320px;position:relative;overflow:hidden}
.fs-hero img{width:100%;height:100%;object-fit:cover}
.fs-hero .ov{position:absolute;bottom:0;right:0;left:0;padding:24px;background:linear-gradient(transparent,rgba(0,0,0,.6));color:#fff}
.fs-hero h1{font-size:1.8rem;font-weight:900}
.sec-t{padding:20px 16px 0;font-size:1.15rem;font-weight:800;color:#db2777}
.pgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;padding:14px}
.fs-card{position:relative;cursor:pointer}
.fs-card .imw{position:relative;border-radius:18px;overflow:hidden}
.fs-card img{height:210px;width:100%;object-fit:cover;transition:.3s}
.fs-card:hover img{transform:scale(1.06)}
.fs-card .fav{position:absolute;top:10px;right:10px;background:#fff;border-radius:50%;width:32px;height:32px;font-size:.9rem}
.fs-card .qv{position:absolute;bottom:10px;right:10px;left:10px;background:rgba(255,255,255,.95);border-radius:10px;padding:8px;font-size:.75rem;font-weight:800;opacity:0;transition:.2s;text-align:center}
.fs-card:hover .qv{opacity:1}
.fs-card .nm{font-size:.8rem;font-weight:700;margin-top:8px}
.fs-card .pr{color:#db2777;font-weight:800;font-size:.85rem}
.cats{display:flex;gap:10px;overflow-x:auto;padding:14px 16px}
.cats .cat{flex:0 0 auto;background:#fff;border:1px solid #fbcfe8;border-radius:14px;padding:10px 20px;font-size:.8rem;font-weight:700;color:#db2777}
#mnav{position:fixed;bottom:0;right:0;left:0;background:#fff;display:flex;justify-content:space-around;padding:10px 0;border-top:1px solid #fbcfe8}
#mnav a{font-size:.66rem;color:#9ca3af;text-align:center}
#footer{padding:30px 16px 80px;text-align:center;color:#9ca3af;font-size:.75rem}
`,header:()=>`<div class="lg">FASHION</div><div class="ic"><span>🔍</span><span>♡</span><button class="cartb" onclick="openCart()" style="background:none">🛒<i id="cc">0</i></button></div>`,
hero:()=>`<div class="fs-hero"><img src="${(P[1]||P[0]||{}).image||''}"><div class="ov"><h1>كولكشن 2026</h1><p>أناقة تُلفت الأنظار</p></div></div>`,
card:(p,i)=>`<div class="fs-card" onclick="openP(${i})"><div class="imw"><img src="${p.image||''}"><button class="fav" onclick="event.stopPropagation()">♡</button><div class="qv">👁 نظرة سريعة</div></div><div class="nm">${p.name}</div><div class="pr">${fmt(p.price)}</div></div>`,
sections:['hero','featured','categories','best','products'],
mobileNav:()=>`<a>🏠<br>Home</a><a>🛍️<br>Shop</a><a>♡<br>Wish</a><a onclick="openCart()">🛒<br>Bag</a>`,
footer:()=>`<div>FASHION © ${new Date().getFullYear()} — Style that speaks</div>`};
