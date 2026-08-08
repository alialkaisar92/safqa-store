window.THEME={id:'electronics',name:'Electronics',css:`
body{background:#0f172a;color:#e2e8f0}
#header .tb{background:#16a34a;color:#052e16;font-size:.68rem;text-align:center;padding:5px}
#header .mh{display:flex;gap:12px;align-items:center;padding:12px 16px;background:#1e293b}
#header .lg{font-weight:900;color:#22c55e;font-size:1.1rem}
#header .sr{flex:1;background:#0f172a;border-radius:10px;padding:9px 12px;font-size:.8rem;color:#94a3b8}
.sec-t{padding:18px 16px 0;font-size:1.05rem;font-weight:800;color:#22c55e}
.cats{display:flex;gap:12px;overflow-x:auto;padding:14px 16px}
.cats .cat{flex:0 0 auto;background:#1e293b;border-radius:14px;padding:12px 16px;font-size:.7rem;text-align:center}
.pgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:14px}
@media(min-width:760px){.pgrid{grid-template-columns:repeat(4,1fr)}}
.el-card{background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155}
.el-card img{height:130px;width:100%;object-fit:cover}
.el-card .in{padding:10px}
.el-card .nm{font-size:.76rem;font-weight:700;min-height:2.2em}
.el-card .rt{color:#f59e0b;font-size:.68rem;margin:4px 0}
.el-card .pr{color:#22c55e;font-weight:900}.el-card .op{color:#64748b;text-decoration:line-through;font-size:.7rem;margin:0 6px}
.el-card .stk{font-size:.64rem;color:#94a3b8;margin:4px 0}
.el-card .add{width:100%;background:#22c55e;color:#052e16;border-radius:8px;padding:8px;font-weight:800;font-size:.74rem}
.brands{display:flex;gap:10px;overflow-x:auto;padding:14px 16px}
.brands span{flex:0 0 auto;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:10px 18px;font-size:.75rem;font-weight:700}
#footer{background:#1e293b;margin-top:20px;padding:24px 16px;text-align:center;color:#94a3b8;font-size:.72rem}
`,header:()=>`<div class="tb">🚚 شحن مجاني للطلبات فوق 500 ج.م</div><div class="mh"><div class="lg">⚡ ElectroMart</div><div class="sr">🔍 ابحث عن منتج...</div><button class="cartb" onclick="openCart()" style="background:#22c55e;color:#052e16;border-radius:10px;padding:8px 12px">🛒<i id="cc">0</i></button></div>`,
hero:()=>`<div style="margin:14px;border-radius:16px;background:linear-gradient(135deg,#16a34a,#0f172a);padding:30px 20px;color:#fff"><h1 style="font-size:1.5rem;font-weight:900">عروض الأسبوع 🔥</h1><p style="font-size:.85rem;margin-top:6px">خصومات حتى 40% على الإلكترونيات</p></div>`,
card:(p,i)=>{var old=Math.round(p.price*1.25),off=Math.round(100-(p.price/old*100));return `<div class="el-card"><img src="${p.image||''}"><div class="in"><div class="nm">${p.name}</div><div class="rt">★★★★★ <small>(${(i%40)+5})</small></div><span class="pr">${fmt(p.price)}</span><span class="op">${fmt(old)}</span> <span style="background:#22c55e;color:#052e16;font-size:.6rem;padding:1px 6px;border-radius:4px">-${off}%</span><div class="stk">${(p.stock>0)?'✔ متوفر':'✖ نفد'}</div><button class="add" onclick="openP(${i})">🛒 أضف للسلة</button></div></div>`},
sections:['hero','categories','flash','best','brands','products'],
brands:()=>`<h2 class="sec-t">أشهر الماركات</h2><div class="brands">${['Samsung','Apple','Xiaomi','Huawei','LG','Sony'].map(b=>'<span>'+b+'</span>').join('')}</div>`,
footer:()=>`<div>ElectroMart © ${new Date().getFullYear()} — التقنية بين يديك</div>`};
