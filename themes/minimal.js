window.THEME={id:'minimal',name:'Minimal',css:`
body{background:#fff;color:#111}
#header{display:flex;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #eee}
#header .lg{font-weight:600;letter-spacing:2px;font-size:1rem}
.mn-hero{padding:60px 20px;text-align:center}
.mn-hero h1{font-size:1.6rem;font-weight:600;letter-spacing:1px}
.mn-hero p{color:#888;margin-top:8px;font-size:.85rem}
.sec-t{padding:30px 20px 0;font-size:1rem;font-weight:600}
.pgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;padding:20px}
.mn-card{cursor:pointer}
.mn-card img{width:100%;height:200px;object-fit:cover;background:#f5f5f5}
.mn-card .nm{font-size:.8rem;margin-top:10px;font-weight:500}
.mn-card .pr{color:#555;font-size:.8rem;margin-top:2px}
#footer{padding:40px 20px;text-align:center;color:#aaa;font-size:.7rem;border-top:1px solid #eee;margin-top:30px}
`,header:()=>`<div class="lg">MINIMAL.</div><button class="cartb" onclick="openCart()" style="background:none;font-size:1.1rem">🛒<i id="cc">0</i></button>`,
hero:()=>`<div class="mn-hero"><h1>أقل، لكن أفضل.</h1><p>منتجات مختارة بعناية فائقة</p></div>`,
card:(p,i)=>`<div class="mn-card" onclick="openP(${i})"><img src="${p.image||''}"><div class="nm">${p.name}</div><div class="pr">${fmt(p.price)}</div></div>`,
sections:['hero','featured','products'],
footer:()=>`<div>MINIMAL — ${new Date().getFullYear()}</div>`};
