
let products=[], priceList=[], cart=JSON.parse(localStorage.getItem('scart')||'[]'), cur=null, qty=1, submitting=false, cc='all', cs='', wM='vodafone';
const titles={store:'سوقلي',cart:'السلة',checkout:'إتمام الطلب',orders:'طلباتي',profile:'حسابي',withdraw:'أرباحي',easyorders:'EasyOrders',support:'الدعم'};

function updCC(){document.getElementById('cc').textContent=cart.reduce((s,i)=>s+(i.qty||1),0)}
function go(p){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  document.getElementById('p-'+p).classList.add('active');
  document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));
  const n=document.querySelector('.nav button[data-p="'+p+'"]'); if(n) n.classList.add('active');
  document.getElementById('ht').textContent='سوقلي';var _tg=document.querySelector('.hdr-tag');if(_tg)_tg.textContent=(p==='store')?'تسويق ذكي • اربح أكثر':((typeof titles!=='undefined'&&titles[p])?titles[p]:'');var _eob=document.getElementById('eoBar');if(_eob)_eob.style.display=(p==='easyorders')?'none':'';
  if(p==='cart') renderCart();
  if(p==='orders') loadOrders();
  if(p==='profile'||p==='withdraw') loadMe();
  if(p==='checkout'){ initCheckout(); recalc(); }
  if(p==='support'){ if(document.getElementById('tickets')) loadTickets(); }
  document.querySelectorAll('.dr-link').forEach(function(x){x.classList.toggle('on',x.dataset.p===p);});
}

function stockLabel(s, avail){
  if(!avail || s<=0) return '<span class="stock-out">نفد المخزون</span>';
  if(s<=5) return '<span class="stock-low">متبقي: '+s+' قطعة فقط</span>';
  return '<span class="stock-ok">متوفر: '+s+' قطعة</span>';
}

async function loadProducts(){
  const r=await fetch('/api/products'); products=await r.json();
  const cats=['الكل',...new Set(products.map(p=>p.cat))];
  const catIcons={'الكل':'🛍️','عطور':'🌸','إكسسوارات':'💍','مستحضرات':'💄','ملابس':'👗','أجهزة':'📱','منزل':'🏠','أطفال':'👶','رياضة':'⚽'};
  document.getElementById('cats').innerHTML=cats.map((c,i)=>{
    const icon=catIcons[c]||'📦';
    return '<button class="c'+(i===0?' active':'')+'" data-c="'+(c==='الكل'?'all':c)+'"><div class="c-icon">'+icon+'</div><span>'+c+'</span></button>';
  }).join('');
  renderP();
}
function renderP(){
  let f=products;
  if(cc!=='all') f=f.filter(p=>p.cat===cc);
  if(cs.trim()){const q=cs.trim().toLowerCase();f=f.filter(p=>p.name.toLowerCase().includes(q)||(p.barcode||'').toLowerCase().includes(q))}
  document.getElementById('g').innerHTML=f.map(p=>{
    const i=products.indexOf(p);
    const stockClass=p.available?(p.stock>10?'ok':'low'):'out';
    const stockText=p.available?(p.stock>10?'متوفر':'مخزون محدود'):'نفد';
    return '<div class="card" onclick="openP('+i+')"><div class="card-badges"><div class="badge-stock '+stockClass+'">'+stockText+'</div></div>'+'<img src="'+(p.image||'')+'" loading="lazy"><div class="b"><div class="t">'+p.name+'</div><div class="pr">'+Number(p.price).toLocaleString('ar-EG')+' ج.م</div></div></div>';
  }).join('')||'<div class="empty">مفيش منتجات</div>';
}

function openP(i){
  cur=products[i]; if(!cur) return;
  qty=1;
  document.getElementById('pm-img').src=cur.image||'';
  document.getElementById('pm-name').textContent=cur.name;
  document.getElementById('pm-price').textContent=Number(cur.price).toLocaleString('ar-EG')+' ج.م';
  var _pc=document.getElementById('pm-comm'); if(_pc) _pc.textContent=(cur.price>0)?(Math.round(cur.price*0.1).toLocaleString('ar-EG')+' ج.م'):'—';
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
  const max=cur && cur.stock != null ? Number(cur.stock) : 0;
  qty=Math.max(1,Math.min(max,qty+d));
  document.getElementById('qtyVal').textContent=qty;
  document.getElementById('stockHint').style.display=(qty>max)?'block':'none';
}

function addCart(){
  if(!cur||!cur.available) return;
  const sale=Number(document.getElementById('editPrice').value);
  if(sale<Number(cur.price)) return;
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
  setTimeout(()=>{btn.textContent='🛒 أضف إلى السلة';closeP()},800);
}

function renderCart(){
  const list=document.getElementById('cartList'), empty=document.getElementById('cartEmpty'), foot=document.getElementById('cartFooter');
  if(!cart.length){list.innerHTML='';empty.style.display='block';foot.style.display='none';return}
  empty.style.display='none';foot.style.display='block';
  let total=0;
  list.innerHTML=cart.map((it,i)=>{
    total+=it.price*it.qty;
    return '<div class="cart-item"><img src="'+(it.image||'')+'"><div class="info"><div class="name">'+it.name+'</div><div class="meta">'+stockLabel(it.stock,true)+'</div><div class="price">'+(it.price*it.qty).toLocaleString('ar-EG')+' ج.م <small style="color:var(--muted);font-weight:600">('+it.price+' × '+it.qty+')</small></div><div class="actions"><button class="qbtn" onclick="cartQty('+i+',-1)">−</button><span class="qval">'+it.qty+'</span><button class="qbtn" onclick="cartQty('+i+',1)">+</button><button class="rm" onclick="rmCart('+i+')">حذف</button></div></div></div>';
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
    const r=await fetch('/api/create-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json();
    msg.textContent=d.message||d.error; msg.className='msg '+(d.message?'ok':'err');
    if(d.message){cart=[];localStorage.setItem('scart','[]');updCC();setTimeout(()=>go('orders'),1200)}
  }catch(e){msg.textContent='خطأ في الاتصال';msg.className='msg err'}
  submitting=false;
  document.getElementById('btnSubmit').disabled=false;
}

async function loadOrders(){
  const me=await(await fetch('/api/me')).json();
  const sc={'تم التسليم':'s1','تم التوصيل':'s1','قيد التأكيد':'s2','جاري الشحن':'s3','ملغي':'s4'};
  document.getElementById('oList').innerHTML=(me.orders||[]).length?me.orders.map(o=>'<div class="order"><div class="order-top"><div class="order-name">'+(o.products?o.products.join(' + '):'طلب')+'</div><span class="status '+(sc[o.status]||'s2')+'">'+o.status+'</span></div><div class="order-meta">#'+(o.serial||o.id)+' • '+o.date+' • عمولة <b style="color:var(--primary)">'+o.commission+' ج.م</b>'+(o.shipping!=null?' • شحن '+o.shipping+' ج.م':'')+'<br>'+o.customer+' — '+o.phone+'</div></div>').join(''):'<div class="empty"><div class="ic">📦</div>لا توجد طلبات</div>';
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
  const r=await fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('pName').value,phone:document.getElementById('pPhone').value})});
  const d=await r.json(); document.getElementById('pMsg').textContent=d.message; document.getElementById('pMsg').className='msg ok';
}
function sw(el){document.querySelectorAll('.w').forEach(x=>x.classList.remove('sel'));el.classList.add('sel');wM=el.dataset.m}
async function doWd(){
  const amount=Number(document.getElementById('wAmt').value), details=document.getElementById('wDet').value, msg=document.getElementById('wMsg');
  if(!amount||amount<=0){msg.textContent='أدخل مبلغ صحيح';msg.className='msg err';return}
  if(!details){msg.textContent='أدخل رقم المحفظة';msg.className='msg err';return}
  const r=await fetch('/api/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount,method:wM,details})});
  const d=await r.json(); msg.textContent=d.message||d.error; msg.className='msg '+(d.message?'ok':'err');
  if(d.message){loadMe();document.getElementById('wAmt').value='';document.getElementById('wDet').value=''}
}
async function sendSupport(){
  const message=document.getElementById('sMsg').value, msg=document.getElementById('sRes');
  if(!message.trim()){msg.textContent='اكتب رسالتك';msg.className='msg err';return}
  const r=await fetch('/api/support',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});
  const d=await r.json(); msg.textContent=d.message||d.error; msg.className='msg '+(d.message?'ok':'err');
  if(d.message){document.getElementById('sMsg').value='';loadTickets()}
}
async function loadTickets(){
  const me=await(await fetch('/api/me')).json();
  const t=me.tickets||[];
  document.getElementById('tickets').innerHTML=t.length?'<div class="section-title">رسائلك</div>'+t.map(x=>'<div class="ticket"><div class="date">'+x.date+' • '+x.status+'</div><div class="txt">'+x.message+'</div>'+(x.reply?'<div style="margin-top:8px;padding:10px;background:#f0fdfa;border-radius:10px;font-size:.85rem"><b>الرد:</b> '+x.reply+'</div>':'')+'</div>').join(''):'';
}

document.getElementById('s').oninput=e=>{clearTimeout(window.t);window.t=setTimeout(()=>{cs=e.target.value;renderP()},180)};
document.getElementById('cats').onclick=e=>{if(e.target.classList.contains('c')){document.querySelectorAll('.c').forEach(b=>b.classList.remove('active'));e.target.classList.add('active');cc=e.target.dataset.c;renderP()}};
updCC(); loadProducts(); loadPrices(); loadBanners();

let BANNERS=[];
let currentSlide=0;
function renderBanners(){const zone=document.getElementById('bannerZone');if(!zone)return;if(!BANNERS.length){zone.innerHTML='';zone.style.display='none';return;}zone.style.display='block';zone.innerHTML='<div class="banner-slider"><div class="banner-track" id="bannerTrack">'+BANNERS.map((b,i)=>'<div class="banner-slide" style="background:'+(b.bg||'linear-gradient(135deg,#0F766E,#14B8A6)')+'"><div class="banner-content"><h2>'+(b.title||'')+'</h2><p>'+(b.sub||'')+'</p>'+(b.btn?'<button class="banner-btn" onclick="'+(b.action||'')+'">'+b.btn+'</button>':'')+'</div></div>').join('')+'</div><div class="banner-dots" id="bannerDots">'+BANNERS.map((b,i)=>'<div class="banner-dot'+(i===0?' active':'')+'" onclick="goToSlide('+i+')"></div>').join('')+'</div></div>';currentSlide=0;}
function goToSlide(n){if(!BANNERS.length)return;currentSlide=n;const track=document.getElementById('bannerTrack');if(track)track.style.transform='translateX('+(n*100)+'%)';document.querySelectorAll('.banner-dot').forEach((d,i)=>d.classList.toggle('active',i===n));}
setInterval(()=>{if(document.getElementById('p-store')&&document.getElementById('p-store').classList.contains('active')&&BANNERS.length>1){currentSlide=(currentSlide+1)%BANNERS.length;goToSlide(currentSlide);}},4000);

function openDrawer(){var d=document.getElementById('drawer'),s=document.getElementById('scrim');if(d)d.classList.add('open');if(s)s.classList.add('open');fillDrawer();}
function closeDrawer(){var d=document.getElementById('drawer'),s=document.getElementById('scrim');if(d)d.classList.remove('open');if(s)s.classList.remove('open');}
function fillDrawer(){fetch('/api/me').then(function(r){return r.json();}).then(function(r){if(!r)return;var nm=(r.profile&&(r.profile.name||r.profile.username))||r.name||null;var bal=r.balance!=null?Number(r.balance):null;var av=document.getElementById('drAv'),nmE=document.getElementById('drName'),bE=document.getElementById('drBal');if(nm&&nmE)nmE.textContent=nm;if(av)av.textContent=(nm||'م').charAt(0);if(bE&&bal!=null)bE.innerHTML=bal.toLocaleString('ar-EG')+' <small>ج.م</small>';}).catch(function(){});}

let NOTIF_SEEN=Number(localStorage.getItem('notifSeen')||0); window.__NOTIFS=[];
function openNotif(){var d=document.getElementById('notifDrawer'),s=document.getElementById('notifScrim');if(d)d.classList.add('open');if(s)s.classList.add('open');NOTIF_SEEN=Date.now();localStorage.setItem('notifSeen',NOTIF_SEEN);updateNotifDot(false);renderNotifs();}
function closeNotif(){var d=document.getElementById('notifDrawer'),s=document.getElementById('notifScrim');if(d)d.classList.remove('open');if(s)s.classList.remove('open');}
function fmtNotifTime(t){if(!t)return'';try{var d=new Date(t);return d.toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'});}catch(e){return t;}}
function renderNotifs(){var el=document.getElementById('notifList');if(!el)return;var list=window.__NOTIFS||[];if(!list.length){el.innerHTML='<div class="nd-empty"><div class="ic">🔔</div>مفيش إشعارات دلوقتي</div>';return;}el.innerHTML=list.map(function(n,i){var isNew=Number(n.id)>NOTIF_SEEN;return '<div class="nd-item'+(isNew?' new':'')+'" style="animation-delay:'+(i*40)+'ms"><h4>'+eoEsc(n.title)+'</h4>'+(n.body?'<p>'+eoEsc(n.body)+'</p>':'')+'<time>'+fmtNotifTime(n.time)+'</time></div>';}).join('');}
function updateNotifDot(on){var d=document.getElementById('notifDot');if(d)d.classList.toggle('on',!!on);}
function notifBeep(){try{var ctx=new (window.AudioContext||window.webkitAudioContext)();var o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=880;g.gain.setValueAtTime(0.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.18,ctx.currentTime+0.02);g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.4);o.start();o.stop(ctx.currentTime+0.42);}catch(e){}}
async function pollNotifs(){try{var list=await(await fetch('/api/notifications')).json();list=list||[];var fresh=list.filter(function(n){return Number(n.id)>NOTIF_SEEN;});updateNotifDot(fresh.length>0);if(fresh.length>0){notifBeep();}window.__NOTIFS=list;var dr=document.getElementById('notifDrawer');if(dr&&dr.classList.contains('open'))renderNotifs();}catch(e){}}
setInterval(pollNotifs,20000); setTimeout(pollNotifs,1500);
