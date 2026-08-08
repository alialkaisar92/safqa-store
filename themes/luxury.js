window.THEME={id:'luxury',name:'Luxury',css:`
body{background:#0b0b0d;color:#e5e7eb;font-family:Georgia,serif}
#header{padding:20px;text-align:center;border-bottom:1px solid #C9A84C}
#header .lg{font-size:1.5rem;color:#C9A84C;letter-spacing:4px}
#header .nv{margin-top:8px}#header .nv a{color:#e5e7eb;margin:0 12px;font-size:.78rem}
.lx-hero{display:flex;gap:16px;align-items:center;padding:28px}
.lx-hero .tx{flex:1}.lx-hero h1{font-size:1.7rem;color:#C9A84C}.lx-hero p{font-size:.85rem;color:#9ca3af;margin-top:8px}
.lx-hero img{width:44%;height:160px;object-fit:cover;border-radius:4px}
.sec-t{color:#C9A84C;padding:22px 20px 0;font-size:1.25rem;font-family:Georgia,serif}
.pgrid{display:grid;grid-template-columns:1fr;gap:22px;padding:20px}
@media(min-width:760px){.pgrid{grid-template-columns:repeat(2,1fr)}}
.lx-card{border:1px solid #C9A84C;border-radius:4px;overflow:hidden;background:#141417}
.lx-card img{width:100%;height:250px;object-fit:cover}
.lx-card .in{padding:18px}
.lx-card .nm{font-size:1.05rem}.lx-card .ds{font-size:.74rem;color:#9ca3af;margin:6px 0}
.lx-card .pr{color:#C9A84C;font-size:1.15rem}.lx-card .op{color:#6b7280;text-decoration:line-through;font-size:.8rem;margin:0 8px}
.lx-card .off{background:#C9A84C;color:#0b0b0d;font-size:.65rem;padding:2px 8px}
.lx-card .buy{display:block;width:100%;margin-top:14px;border:1px solid #C9A84C;background:none;color:#C9A84C;padding:11px;font-size:.85rem;cursor:pointer}
.lx-banner{margin:20px;border:1px solid #C9A84C;padding:26px;text-align:center;color:#C9A84C;font-size:1.1rem}
.cats{display:flex;gap:10px;overflow-x:auto;padding:14px 20px}
.cats .cat{flex:0 0 auto;border:1px solid #C9A84C;color:#C9A84C;border-radius:2px;padding:8px 18px;font-size:.78rem}
#footer{border-top:1px solid #C9A84C;margin-top:20px;padding:26px;text-align:center;color:#9ca3af;font-size:.72rem}
`,header:()=>`<div class="lg">L U X U R Y</div><div class="nv"><a>الرئيسية</a><a>المجموعات</a><a>عن المتجر</a><a>تواصل</a></div>`,
hero:()=>`<div class="lx-hero"><div class="tx"><h1>فخامة تُروى</h1><p>تشكيلة مختارة بعناية لذواقة التميز والجودة</p></div><img src="${(P[0]||{}).image||''}"></div>`,
card:(p,i)=>{var old=Math.round(p.price*1.3),off=Math.round(100-(p.price/old*100));return `<div class="lx-card"><img src="${p.image||''}"><div class="in"><div class="nm">${p.name}</div><div class="ds">${(p.desc||'قطعة فريدة تضيف لمسة من الرقي.').slice(0,46)}</div><span class="pr">${fmt(p.price)}</span><span class="op">${fmt(old)}</span><span class="off">-${off}%</span><button class="buy" onclick="openP(${i})">اقتناء القطعة</button></div></div>`},
sections:['hero','featured','banner','categories','products'],
banner:()=>`<div class="lx-banner">✦ مجموعة محدودة الإصدار — اكتشفها قبل النفاد ✦</div>`,
footer:()=>`<div>LUXURY © ${new Date().getFullYear()} — جميع الحقوق محفوظة</div>`};
