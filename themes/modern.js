window.THEME={id:'modern',name:'Modern',css:`
body{background:#f8fafc;color:#0f172a}
#header{position:sticky;top:0;background:#fff;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;box-shadow:0 2px 10px rgba(0,0,0,.06);z-index:9}
#header .lg{font-weight:900;color:#2563eb;font-size:1.2rem}
.md-hero{margin:14px;border-radius:24px;background:linear-gradient(135deg,#38bdf8,#2563eb);color:#fff;padding:40px 24px;text-align:center}
.md-hero h1{font-size:1.6rem;font-weight:900}.md-hero p{margin:8px 0 16px;opacity:.95}
.md-hero button{background:#fff;color:#2563eb;border-radius:50px;padding:12px 30px;font-weight:800}
.sec-t{padding:18px 16px 0;font-size:1.1rem;font-weight:800}
.pgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:14px}
@media(min-width:760px){.pgrid{grid-template-columns:repeat(4,1fr)}}
.md-card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,.07);position:relative;transition:.2s}
.md-card:hover{transform:translateY(-4px)}
.md-card img{height:150px;width:100%;object-fit:cover}
.md-card .in{padding:10px}
.md-card .nm{font-size:.8rem;font-weight:700}
.md-card .pr{color:#2563eb;font-weight:900;margin-top:4px}
.md-card .qa{position:absolute;top:8px;left:8px;background:#2563eb;color:#fff;border-radius:50%;width:32px;height:32px;font-size:.9rem;opacity:0;transition:.2s}
.md-card:hover .qa{opacity:1}
.cats{display:flex;gap:8px;overflow-x:auto;padding:12px 16px}
.cats .cat{flex:0 0 auto;background:#fff;border-radius:50px;padding:8px 18px;font-size:.78rem;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.06)}
#mnav{position:fixed;bottom:0;right:0;left:0;background:#fff;display:flex;justify-content:space-around;padding:8px 0;box-shadow:0 -2px 10px rgba(0,0,0,.08)}
#mnav a{font-size:.68rem;color:#64748b;text-align:center}
#footer{padding:30px 16px 70px;text-align:center;color:#64748b;font-size:.75rem}
`,header:()=>`<div class="lg">Modern⚡</div><button class="cartb" onclick="openCart()" style="background:#2563eb;color:#fff;border-radius:12px;padding:8px 13px">🛒<i id="cc">0</i></button>`,
hero:()=>`<div class="md-hero"><h1>تسوّق بذكاء</h1><p>أحدث المنتجات بأفضل الأسعار</p><button onclick="document.querySelector('.pgrid').scrollIntoView({behavior:'smooth'})">ابدأ التسوق</button></div>`,
card:(p,i)=>`<div class="md-card"><button class="qa" onclick="openP(${i})">+</button><img src="${p.image||''}"><div class="in"><div class="nm">${p.name}</div><div class="pr">${fmt(p.price)}</div></div></div>`,
sections:['hero','categories','featured','products'],
mobileNav:()=>`<a>🏠<br>الرئيسية</a><a>🛍️<br>المنتجات</a><a onclick="openCart()">🛒<br>السلة</a><a>👤<br>حسابي</a>`,
footer:()=>`<div>Modern Store © ${new Date().getFullYear()}</div>`};
