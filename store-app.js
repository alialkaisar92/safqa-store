/* store-app.js v22 — شبكة ذكية مستقلة + تصنيف تلقائي + مترجم آمن */
(function(){
var W=window, D=document;
function saH(){var t="";try{t=localStorage.getItem("sq_user_token")||"";}catch(e){}return {"Content-Type":"application/json","x-sq-token":t};}
function E(s){return(s==null?'':String(s)).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function G(id){return D.getElementById(id);}
function FT(iso){try{return new Date(iso).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});}catch(e){return'';}}
function ED(s){try{return new Date(String(s).replace(' ','T')+'Z').toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'});}catch(e){return s||'—';}}
function saErr(err,what){try{if(err&&/is not defined/.test(err.message))return;var o=G('saErrBox');if(!o){o=D.createElement('div');o.id='saErrBox';o.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#b91c1c;color:#fff;padding:10px 12px;font:700 11px Cairo,sans-serif;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.3)';D.body.appendChild(o);}o.textContent='⚠️ ['+what+']: '+(err&&err.message?err.message:err);setTimeout(function(){var x=G('saErrBox');if(x)x.remove();},6000);}catch(_){}}

/* ===== CSS محقون: إخفاء الشبكة القديمة + تصميم الأقسام المجمّعة ===== */
(function injectCSS(){if(D.getElementById('saStyle'))return;var st=D.createElement('style');st.id='saStyle';st.textContent=
'#g{display:none !important}'+
'#g2{display:block;max-width:640px;margin:0 auto}'+
'.sa-sec{margin:6px 0 26px;animation:saSecIn .5s cubic-bezier(.2,.8,.2,1) both}'+
'@keyframes saSecIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}'+
'.sa-sec-h{display:flex;align-items:center;gap:12px;margin:0 2px 13px;padding-bottom:11px;border-bottom:2px solid rgba(15,118,110,.10);position:relative}'+
'.sa-sec-h::after{content:"";position:absolute;bottom:-2px;right:0;width:54px;height:2px;background:linear-gradient(90deg,#14b8a6,transparent);border-radius:2px}'+
'.sa-sec-ic{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;font-size:1.4rem;background:linear-gradient(145deg,#0F766E,#0a4f49);box-shadow:0 8px 18px -8px rgba(15,118,110,.6);flex-shrink:0}'+
'.sa-sec-tx{flex:1;min-width:0}'+
'.sa-sec-tx b{display:block;font-size:1.18rem;font-weight:900;color:#0f2420;letter-spacing:-.4px;line-height:1.1}'+
'.sa-sec-tx small{display:block;font-size:.72rem;color:#6b7280;font-weight:600;margin-top:3px}'+
'.sa-sec-cnt{background:#f0fdfa;color:#0F766E;font-weight:800;font-size:.74rem;padding:5px 12px;border-radius:50px;font-variant-numeric:tabular-nums;flex-shrink:0}'+
'.sa-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:13px}'+
'@media(min-width:480px){.sa-grid{grid-template-columns:repeat(3,1fr)}}'+
'.sa-card{background:#fff;border-radius:18px;overflow:hidden;cursor:pointer;position:relative;border:1px solid rgba(15,118,110,.07);box-shadow:0 1px 2px rgba(16,32,29,.05),0 12px 26px -16px rgba(16,32,29,.3);transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s;animation:saCardIn .45s cubic-bezier(.2,.8,.2,1) both}'+
'.sa-card:active{transform:scale(.96)}'+
'.sa-card:hover{transform:translateY(-5px);box-shadow:0 2px 4px rgba(16,32,29,.06),0 22px 44px -18px rgba(15,118,110,.4)}'+
'@keyframes saCardIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}'+
'.sa-card .sa-img{width:100%;aspect-ratio:1;object-fit:cover;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);display:block}'+
'.sa-card .sa-ph{width:100%;aspect-ratio:1;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);display:grid;place-items:center;font-size:2.2rem}'+
'.sa-card .sa-b{padding:11px 12px 14px}'+
'.sa-card .sa-t{font-size:.84rem;font-weight:700;line-height:1.46;color:#1f2937;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.5em;margin-bottom:8px}'+
'.sa-card .sa-pr{font-size:1.1rem;font-weight:900;color:#0F766E;letter-spacing:-.3px;font-variant-numeric:tabular-nums}'+
'.sa-card .sa-st{position:absolute;top:9px;right:9px;padding:4px 9px;border-radius:9px;font-size:.62rem;font-weight:800;color:#fff;backdrop-filter:blur(8px);box-shadow:0 2px 8px rgba(0,0,0,.18);display:inline-flex;align-items:center;gap:4px}'+
'.sa-card .sa-st::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.9}'+
'.sa-st.ok{background:rgba(16,185,129,.92)}.sa-st.low{background:rgba(245,158,11,.94)}.sa-st.out{background:rgba(239,68,68,.92)}'+
'.sa-empty{text-align:center;padding:60px 20px;color:#6b7280}.sa-empty .ic{font-size:3rem;opacity:.5;margin-bottom:12px}';
st.textContent+='.scrim:not(.open),.drawer:not(.open),.notif-drawer:not(.open),.chat-screen:not(.open),.pm:not(.show){pointer-events:none !important}';D.head.appendChild(st);})();

/* ===== التصنيف الذكي بالعربي ===== */
var CATS=[
 {k:'clean',  l:'التنظيف والمنزلات', ic:'🧽', kw:['تنظيف','منظف','مساحات','صابون','غسيل','غسالة','ملمع','بخار','مناديل','معطر','مطهر','ممسحة','كلور','جل','سائل','فوط','منشف']},
 {k:'car',    l:'العناية بالسيارة',  ic:'🚗', kw:['سيارة','زجاج','مساحات','مقعد','عطر سيارة','شاحن سيارة','تلميع','فرشة','مكيف','إطارات']},
 {k:'beauty', l:'العطور والتجميل',   ic:'💄', kw:['عطر','عطور','برفيوم','كريم','مكياج','روج','شامبو','بشرة','عناية','صبغة','مانيكير','بارفان']},
 {k:'health', l:'الصحة والعناية',    ic:'💊', kw:['مساج','مدلك','فيتامين','صحي','طبي','علاج','مسكن','حرارة','ضغط','ظهر','رقبة']},
 {k:'elec',   l:'الإلكترونيات',      ic:'🔌', kw:['شاحن','سماعة','كابل','باور','بنك','ساعة','هاتف','موبايل','حامل','وصلة','بلوتوث','usb']},
 {k:'kitchen',l:'المطبخ',            ic:'🍳', kw:['مطبخ','قدر','مقلاة','سكين','ملعقة','كوب','طبق','حافظ','ثلاجة','غلاية','خلاط','مصفاة']},
 {k:'home',   l:'المنزل والديكور',   ic:'🛋️', kw:['منزل','ديكور','وسادة','ستارة','سجاد','منظم','شمعة','إضاءة','مصباح','مفرش']},
 {k:'kids',   l:'الأطفال',           ic:'🧸', kw:['أطفال','لعبة','رضاعة','حفاض','بيبي','طفل','رضيع']},
 {k:'other',  l:'منتجات أخرى',       ic:'📦', kw:[]}
];
function classify(name){var n=(name||'').toLowerCase();for(var i=0;i<CATS.length-1;i++){var ks=CATS[i].kw;for(var j=0;j<ks.length;j++){if(n.indexOf(ks[j])>=0)return CATS[i];}}return CATS[CATS.length-1];}

/* ===== بيانات + رسم مجمّع ===== */
var _P=null,_CUR=null,_QTY=1;
function SL(s,a){if(s===null||s===undefined)return'<span class="stock-out">التوفر غير مؤكد</span>';if(!a||s<=0)return'<span class="stock-out">نفد المخزون</span>';if(s<=5)return'<span class="stock-low">متبقي '+s+'</span>';return'<span class="stock-ok">متوفر</span>';}
function SLc(s,a){return(!a||s<=0)?'out':(s<=5?'low':'ok');}
async function loadP(){var tk='';try{tk=localStorage.getItem('sq_user_token')||'';}catch(e){}try{var _r=await fetch('/api/products',{credentials:'include',headers:tk?{'x-sq-token':tk}:{}});if(_r.status===401){try{location.replace('/login');}catch(e){}_P=[];window.__LP=(_P?_P.length:-1);return _P;}_P=await _r.json();}catch(e){_P=[];}if(!_P||!Array.isArray(_P))_P=[];return _P;}
W.stockLabel=SL;
function cardHTML(p,i,delay){var known=p.stock!==null&&p.stock!==undefined;var st=known&&p.available?(p.stock>10?'ok':'low'):'out';var stx=!known?'التوفر غير مؤكد':(p.available?(p.stock>10?'متوفر':'محدود'):'نفد');var img=p.image?'<img class="sa-img" src="'+E(p.image)+'" loading="lazy" onerror="this.outerHTML=\'<div class=sa-ph>🛍️</div>\'">':'<div class="sa-ph">🛍️</div>';return '<div class="sa-card" data-i="'+i+'" onclick="openP('+i+')" style="animation-delay:'+(delay*40)+'ms"><div class="sa-st '+st+'">'+stx+'</div>'+img+'<div class="sa-b"><div class="sa-t">'+E(p.name)+'</div><div class="sa-pr">'+Number(p.price).toLocaleString('ar-EG')+' ج.م</div></div></div>';}
function renderGrouped(){var _gg=G('g');if(_gg)_gg.style.display='none';var host=G('g2');if(!host)return;if(!_P||!_P.length){host.innerHTML='<div class="sa-empty"><div class="ic">📦</div>لا توجد منتجات</div>';return;}var q=(G('s')&&G('s').value||'').trim().toLowerCase();var list=_P.map(function(p,i){return {p:p,i:i};}).filter(function(o){if(!q)return true;return (o.p.name||'').toLowerCase().indexOf(q)>=0||(o.p.barcode||'').toLowerCase().indexOf(q)>=0;});if(!list.length){host.innerHTML='<div class="sa-empty"><div class="ic">🔍</div>لا نتائج عن «'+E(q)+'»</div>';return;}var groups={},order=[];list.forEach(function(o){var c=classify(o.p.name);if(!groups[c.k]){groups[c.k]={cat:c,items:[]};order.push(c.k);}groups[c.k].items.push(o);});var html='',si=0;order.forEach(function(k){var g=groups[k];html+='<section class="sa-sec" style="animation-delay:'+(si*60)+'ms"><div class="sa-sec-h"><div class="sa-sec-ic">'+g.cat.ic+'</div><div class="sa-sec-tx"><b>'+E(g.cat.l)+'</b><small>منتجات مختارة بعناية</small></div><div class="sa-sec-cnt">'+g.items.length+'</div></div><div class="sa-grid">';g.items.forEach(function(o,ci){html+=cardHTML(o.p,o.i,ci);});html+='</div></section>';si++;});host.innerHTML=html;}
W.renderGrouped=renderGrouped;W.reloadProducts=async function(){_P=null;await loadP();renderGrouped();};
function ensureG2(){if(G('g2'))return;var g=G('g');if(!g)return;var h=D.createElement('div');h.id='g2';g.parentNode.insertBefore(h,g.nextSibling);}

/* ===== ربط الضغطة على الكارت (delegation — مضمون) ===== */
function bindGrid(){var host=G('g2');if(!host||host._bound)return;if(host){host._bound=true;host.addEventListener('touchend',function(e){var c=e.target.closest?e.target.closest('.sa-card'):null;if(c){var ii=parseInt(c.getAttribute('data-i'),10);if(!isNaN(ii)&&W.openP){e.preventDefault();W.openP(ii);}}});host.addEventListener('click',function(e){var c=e.target.closest?e.target.closest('.sa-card'):null;if(!c)return;var i=parseInt(c.getAttribute('data-i'),10);if(!isNaN(i)&&W.openP)W.openP(i);});}}

/* ===== البحث ===== */
function bindSearch(){var s=G('s');if(!s||s._saBound)return;if(s){s._saBound=true;s.addEventListener('input',function(){renderGrouped();});}}

/* ===== تفاصيل المنتج ===== */
function saTap(m){try{var x=G('saTapBox');if(!x){x=document.createElement('div');x.id='saTapBox';document.body.appendChild(x);}x.style.cssText='position:fixed;bottom:70px;left:50%;transform:translateX(-50%);z-index:99999;background:#1e293b;color:#fff;padding:8px 16px;border-radius:50px;font:700 12px Cairo,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4)';x.textContent=m;clearTimeout(x._t);x._t=setTimeout(function(){if(x.parentNode)x.remove();},4000);}catch(_){}}

W.openP=async function(i){ensurePM();if(!_P)await loadP();var c=_P[i];if(!c)return;_CUR=c;_QTY=1;var img=G('pm-img');if(img)img.src=c.image||'';var nm=G('pm-name');if(nm)nm.textContent=c.name;var pr=G('pm-price');if(pr)pr.textContent=Number(c.price).toLocaleString('ar-EG')+' ج.م';var cd=G('pm-code');if(cd)cd.textContent=c.barcode||'—';var st=G('pm-stock');if(st)st.innerHTML=SL(c.stock,c.available);var nt=G('pm-note');if(nt)nt.textContent=c.note||'—';var ds=G('pm-desc');if(ds)ds.innerHTML=c.desc||'';var SUGG=2.2;var _sugg=Math.round(Number(c.price)*SUGG/10)*10;if(_sugg<Number(c.price))_sugg=Number(c.price);var ep=G('editPrice');if(ep){ep.value=_sugg;ep.min=c.price;}var qv=G('qtyVal');if(qv)qv.textContent='1';var mh=G('minHint');if(mh)mh.style.display='none';var sh=G('stockHint');if(sh)sh.style.display='none';var btn=G('btnAdd');if(btn){btn.disabled=!c.available;btn.style.opacity=c.available?'1':'.5';btn.textContent=c.available?'🛒 أضف إلى السلة':'نفد المخزون';}var dr=G('pm-drive');if(dr){if(c.media){dr.href=c.media;dr.style.display='block';}else dr.style.display='none';}var _sg=G('pm-sugg');if(_sg)_sg.textContent=_sugg.toLocaleString('ar-EG')+' ج.م';if(W.updProfit)W.updProfit();var pm=G('pm');if(pm){pm.classList.add('show');D.body.style.overflow='hidden';}};
W.closeP=function(){var pm=G('pm');if(pm){pm.classList.remove('show');D.body.style.overflow='';}};
W.checkMin=function(){var ep=G('editPrice');if(!ep||!_CUR)return;var v=Number(ep.value),mn=Number(_CUR.price),ok=v>=mn;var mh=G('minHint');if(mh)mh.style.display=ok?'none':'block';var btn=G('btnAdd');if(btn){btn.disabled=!ok||!_CUR.available;btn.style.opacity=(!ok||!_CUR.available)?'.5':'1';}};
W.updProfit=function(){var ep=G('editPrice'),pf=G('pm-profit');if(!ep||!pf||!_CUR)return;var v=Number(ep.value)||0,g=Number(_CUR.price)||0,d=v-g;pf.textContent=(d>0?'+':'')+d.toLocaleString('ar-EG')+' ج.م';pf.style.color=d>0?'#0F766E':'#ef4444';};
W.chgQty=function(d){var mx=_CUR&&_CUR.stock!=null?Number(_CUR.stock):0;_QTY=Math.max(1,Math.min(Math.max(1,mx),_QTY+d));var qv=G('qtyVal');if(qv)qv.textContent=_QTY;var sh=G('stockHint');if(sh)sh.style.display=(_QTY>mx)?'block':'none';};
W.addCart=function(){if(!_CUR||!_CUR.available)return;var ep=G('editPrice');var sale=ep?Number(ep.value):_CUR.price;if(sale<Number(_CUR.price))return;if(_CUR.stock==null||_QTY>Number(_CUR.stock)){var sh=G('stockHint');if(sh)sh.style.display='block';return;}var cart=JSON.parse(localStorage.getItem('scart')||'[]');var ex=cart.find(function(x){return x.id===_CUR.id&&x.price===sale;});if(ex){if(ex.qty+_QTY>_CUR.stock){alert('الكمية أكبر من المخزون');return;}ex.qty+=_QTY;}else{cart.push({id:_CUR.id,name:_CUR.name,price:sale,basePrice:_CUR.price,cost:_CUR.cost,propertyId:_CUR.propertyId,image:_CUR.image,barcode:_CUR.barcode,stock:_CUR.stock,qty:_QTY});}localStorage.setItem('scart',JSON.stringify(cart));if(W.updCC)try{W.updCC();}catch(_){}var btn=G('btnAdd');if(btn){btn.textContent='✓ تم الإضافة';setTimeout(function(){btn.textContent='🛒 أضف إلى السلة';W.closeP();},800);}};

/* ===== دوال مساعدة لـ EasyOrders ===== */
if(typeof W.EO_TOKEN_KEY==='undefined')W.EO_TOKEN_KEY='eo_mkt_token';
if(typeof W.eoSessionReady==='undefined')W.eoSessionReady=false;
if(typeof W.eo$!=='function')W.eo$=function(id){return D.getElementById(id);};
if(typeof W.eoEsc!=='function')W.eoEsc=E;
if(typeof W.eoFmtDate!=='function')W.eoFmtDate=ED;
if(typeof W.eoImgErr!=='function')W.eoImgErr=function(el){if(el)el.style.display='none';};
if(typeof W.eoSetResult!=='function')W.eoSetResult=function(type,msg){var b=G('eoResult');if(!b)return;b.className='eo-result show '+(type||'');b.innerHTML='<span>'+(type==='ok'?'✓':type==='err'?'✕':'')+'</span><span>'+E(msg)+'</span>';};
if(typeof W.eoHideResult!=='function')W.eoHideResult=function(){var b=G('eoResult');if(b)b.className='eo-result';};
if(typeof W.eoToast!=='function')W.eoToast=function(m){var el=D.createElement('div');el.className='eo-toast';el.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:12px 24px;border-radius:50px;font:700 13px Cairo,sans-serif;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,.3)';el.textContent=m;D.body.appendChild(el);setTimeout(function(){el.remove();},2600);};
if(typeof W.eoLock!=='function')W.eoLock=function(id,on){var b=G(id);if(b)b.disabled=!!on;};
if(typeof W.eoToggle!=='function')W.eoToggle=function(inpId,togId){var i=G(inpId),tg=G(togId);if(!i)return;var show=i.type==='password';i.type=show?'text':'password';if(tg)tg.textContent=show?'إخفاء':'إظهار';};
if(typeof W.eoUpdateBar!=='function')W.eoUpdateBar=function(on){var dot=G('eoDot'),txt=G('eoTxt');if(dot)dot.classList.toggle('on',!!on);if(txt)txt.textContent=on?'متصل':'ربط المتجر';var dd=G('drEoDot'),dt=G('drEoTxt');if(dd)dd.classList.toggle('on',!!on);if(dt)dt.textContent=on?'EasyOrders متصّل ✓':'ربط EasyOrders';};

/* ===== مترجم الأزرار الآمن ===== */
function runOc(oc,e){var parts=oc.split(';'),h=0,m;for(var pi=0;pi<parts.length;pi++){var s=parts[pi].trim();if(!s)continue;
 if((m=s.match(/^go\(\s*['"]([^'"]+)['"]\s*\)$/))){if(W.go){W.go(m[1]);h++;}}
 else if((m=s.match(/^openP\(\s*(\d+)\s*\)$/))){if(W.openP){W.openP(+m[1]);h++;}}
 else if(s==='openChat()'){if(W.openChat){W.openChat();h++;}}
 else if(s==='closeChat()'){if(W.closeChat){W.closeChat();h++;}}
 else if(s==='chatSend()'){if(W.chatSend){W.chatSend();h++;}}
 else if(s==='chatToggleVoice()'){if(W.chatToggleVoice){W.chatToggleVoice();h++;}}
 else if(s==='addCart()'){if(W.addCart){W.addCart();h++;}}
 else if(s==='closeP()'){if(W.closeP){W.closeP();h++;}}
 else if(s==='openDrawer()'){if(W.openDrawer){W.openDrawer();h++;}}
 else if(s==='closeDrawer()'){if(W.closeDrawer){W.closeDrawer();h++;}}
 else if(s==='openNotif()'){if(W.openNotif){W.openNotif();h++;}}
 else if(s==='closeNotif()'){if(W.closeNotif){W.closeNotif();h++;}}
 else if(s==='fillDrawer()'){if(W.fillDrawer){W.fillDrawer();h++;}}
 else if((m=s.match(/^cartQty\(\s*(\d+)\s*,\s*(-?\d+)\s*\)$/))){if(W.cartQty){W.cartQty(+m[1],+m[2]);h++;}}
 else if((m=s.match(/^rmCart\(\s*(\d+)\s*\)$/))){if(W.rmCart){W.rmCart(+m[1]);h++;}}
 else if(s==='submitOrder()'){if(W.submitOrder){W.submitOrder();h++;}}
 else if(s==='recalc()'){if(W.recalc){W.recalc();h++;}}
 else if(s==='checkMin()'){if(W.checkMin){W.checkMin();h++;}}
 else if((m=s.match(/^chgQty\(\s*(-?\d+)\s*\)$/))){if(W.chgQty){W.chgQty(+m[1]);h++;}}
 else if(s==='doWd()'){if(W.doWd){W.doWd();h++;}}
 else if(s==='saveProf()'){if(W.saveProf){W.saveProf();h++;}}
 else if(s==='sendSupport()'){if(W.sendSupport){W.sendSupport();h++;}}
 else if(s==='onGov()'){if(W.onGov){W.onGov();h++;}}
 else if(s==='eoTest()'){if(W.eoTest){W.eoTest();h++;}}
 else if(s==='eoSave()'){if(W.eoSave){W.eoSave();h++;}}
 else if(s==='eoDiag()'){if(W.eoDiag){W.eoDiag();h++;}}
 else if(s==='eoSyncNow()'){if(W.eoSyncNow){W.eoSyncNow();h++;}}
 else if(s==='eoSyncStatuses'){if(W.eoSyncStatuses){W.eoSyncStatuses();h++;}}
 else if(s==='eoSaveSecret()'){if(W.eoSaveSecret){W.eoSaveSecret();h++;}}
 else if(s==='eoCopyUrl()'){if(W.eoCopyUrl){W.eoCopyUrl();h++;}}
 else if(s==='eoDisconnect()'){if(W.eoDisconnect){W.eoDisconnect();h++;}}
 else if((m=s.match(/^eoToggle\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)$/))){if(W.eoToggle){W.eoToggle(m[1],m[2]);h++;}}
 else if((m=s.match(/^goToSlide\(\s*(\d+)\s*\)$/))){if(W.goToSlide){W.goToSlide(+m[1]);h++;}}
 else if(s.indexOf("getElementById('s').focus()")>=0){var ss=G('s');if(ss)ss.focus();h++;}
 else if(s.indexOf("getElementById('chatFile').click()")>=0){var cf=G('chatFile');if(cf)cf.click();h++;}
 else if(s.indexOf('chatSend()')>=0&&s.indexOf('Enter')>=0){if(e&&e.key==='Enter'&&W.chatSend){W.chatSend();h++;}}
}return h;}
function hook(evName,attr){D.addEventListener(evName,function(e){if(e.__saD){if(e.__saD>2)return;e.__saD++;}else{e.__saD=1;}var el=e.target;while(el&&el.nodeType===1&&el!==D.documentElement){var oc=el.getAttribute&&el.getAttribute(attr);if(oc){var hh=0;try{hh=runOc(oc,e);}catch(err){saErr(err,attr);}if(hh>0){e.stopImmediatePropagation();if(evName==='click')e.preventDefault();}return;}el=el.parentElement;}},true);}
hook('click','onclick');
document.addEventListener('pointerdown',function(e){window.__lastTap=(e.target?(e.target.className&&e.target.className.toString?e.target.className.toString():e.target.tagName)||'?':'?');},true);hook('input','oninput');hook('change','onchange');hook('keydown','onkeydown');

/* ===== الشات ===== */
var CP=null,CL=-1,REC=null,CHUNKS=[],RECON=false;
W.chatRender=async function(force){var b=G('chatBody');if(!b)return;try{var m=await(await fetch('/api/chat/messages',{headers:saH(),credentials:'include'})).json();if(!Array.isArray(m))m=[];if(!force&&m.length===CL)return;var ab=b.scrollHeight-b.scrollTop-b.clientHeight<80;if(!m.length){b.innerHTML='<div class="chat-empty"><div class="ic">💬</div><p>ابدأ المحادثة</p></div>';CL=0;return;}b.innerHTML=m.map(function(x){var c='';if(x.type==='image')c='<img src="'+x.media+'" alt="">';else if(x.type==='video')c='<video src="'+x.media+'" controls></video>';else if(x.type==='voice')c='<audio src="'+x.media+'" controls></audio>';if(x.text)c+='<div class="msg-text">'+E(x.text)+'</div>';var tk=x.from==='user'?' ✓✓':'';return '<div class="msg '+x.from+'"><div class="bubble">'+c+'<div class="msg-time">'+FT(x.time)+tk+'</div></div></div>';}).join('');if(ab||force||m.length>CL)b.scrollTop=b.scrollHeight;CL=m.length;}catch(err){saErr(err,'chatRender');}};
W.chatSend=async function(){var inp=G('chatInput');if(!inp)return;var t=inp.value.trim();if(!t)return;var btn=G('chatSendBtn');if(btn)btn.disabled=true;inp.value='';try{await fetch('/api/chat/send',{method:'POST',headers:saH(),credentials:'include',body:JSON.stringify({type:'text',text:t})});await W.chatRender(true);}catch(err){saErr(err,'chatSend');}finally{if(btn)btn.disabled=false;inp.focus();}};
var W=window,D=document;function saH(){var tk='';try{tk=localStorage.getItem('sq_user_token')||'';}catch(e){}return {'Content-Type':'application/json','x-sq-token':tk};}window.chatOnFile=function(input){var f=input.files&&input.files[0];if(!f)return;if(f.size>8*1024*1024){try{alert('الحد الأقصى 8 ميجا');}catch(e){}input.value='';return;}var tp=f.type.indexOf('video')===0?'video':'image';var r=new FileReader();r.onload=function(ev){fetch('/api/chat/send',{method:'POST',headers:saH(),credentials:'include',body:JSON.stringify({type:tp,media:ev.target.result})}).then(function(rr){if(!rr.ok)throw new Error('فشل');if(W.chatRender)W.chatRender(true);}).catch(function(e){try{alert('فشل إرسال الملف');}catch(_){}});};r.readAsDataURL(f);input.value='';};
W.chatToggleVoice=async function(){var mic=G('chatMic');if(!mic)return;if(RECON){if(REC)REC.stop();return;}try{var st=await navigator.mediaDevices.getUserMedia({audio:true});CHUNKS=[];REC=new MediaRecorder(st);REC.ondataavailable=function(ev){if(ev.data.size>0)CHUNKS.push(ev.data);};REC.onstop=function(){var bl=new Blob(CHUNKS,{type:REC.mimeType||'audio/webm'});st.getTracks().forEach(function(t){t.stop();});var r=new FileReader();r.onload=function(ev){fetch('/api/chat/send',{method:'POST',headers:saH(),credentials:'include',body:JSON.stringify({type:'voice',media:ev.target.result})}).then(function(){W.chatRender(true);});};r.readAsDataURL(bl);RECON=false;mic.classList.remove('rec');mic.textContent='🎤';};REC.start();RECON=true;mic.classList.add('rec');mic.textContent='⏹️';}catch(err){saErr(err,'voice');}};
W.openChat=function(){var s=G('chatScreen');if(s){s.classList.add('open');D.body.style.overflow='hidden';W.chatRender(true);if(!CP)CP=setInterval(function(){W.chatRender(false);},3000);}};
W.closeChat=function(){var s=G('chatScreen');if(s){s.classList.remove('open');D.body.style.overflow='';}if(CP){clearInterval(CP);CP=null;}};

/* ===== إيزي أوردز render ===== */
W.eoRenderConnection=function(c){var card=G('eoStatusCard');if(!card)return;var on=c&&c.connection_status==='connected';card.classList.toggle('connected',on);var pt=G('eoPillTxt');if(pt)pt.textContent=on?'متصل بـ EasyOrders':(c&&c.connection_status==='error'?'خطأ':'غير متصل');var ti=G('eoStatusTitle');if(ti)ti.textContent=on?'متجرك متصل ✓':'اربط متجرك على EasyOrders';var sn=G('eoStoreName');if(sn)sn.textContent=(c&&c.store_name)?c.store_name:'—';var cs=G('eoConnState');if(cs)cs.textContent=on?'نشط':'—';var ls=G('eoLastSync');if(ls)ls.textContent=(c&&c.last_sync)?ED(c.last_sync):'—';var sb=G('eoSyncBtn');if(sb)sb.style.display=on?'inline-flex':'none';var db=G('eoDisconnectBtn');if(db)db.style.display=(c&&c.has_key)?'inline-flex':'none';if(W.eoUpdateBar)try{W.eoUpdateBar(on);}catch(_){}};
W.eoRenderProducts=function(prods){var g=G('eoProdGrid');if(!g)return;var pc=G('eoProdCount');if(pc)pc.textContent=(prods||[]).length+' منتج';if(!prods||!prods.length){g.innerHTML='<div class="eo-empty" style="grid-column:1/-1"><div class="ic">📦</div>لا توجد منتجات بعد</div>';return;}g.innerHTML=prods.map(function(p){var pr=(p.sale_price!=null?p.sale_price:p.price);var sk=p.track_stock?(p.quantity>0?'<span class="eo-badge green">متوفر '+p.quantity+'</span>':'<span class="eo-badge red">نفد</span>'):'<span class="eo-badge gray">بدون تتبع</span>';var im=p.image?'<img src="'+E(p.image)+'" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:14px" onerror="this.style.display=\'none\'">':'<div style="width:100%;aspect-ratio:1;background:#f1f5f9;border-radius:14px;display:grid;place-items:center;font-size:2rem">🛍️</div>';return '<div style="background:#fff;border:1px solid #f1f5f9;border-radius:18px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,.06)">'+im+'<div style="padding:11px"><div style="font-weight:700;font-size:.82rem;min-height:2.3em">'+E(p.name)+'</div><div style="display:flex;justify-content:space-between;margin-top:7px"><span style="font-weight:800;color:#0F766E">'+(pr!=null?Number(pr).toLocaleString('ar-EG'):'—')+' ج.م</span>'+sk+'</div></div></div>';}).join('');};
W.eoRenderOrders=function(orders){var el=G('eoOrderList');if(!el)return;orders=orders||[];if(!orders.length){el.innerHTML='<div class="eo-empty"><div class="ic">🛍️</div>لا توجد طلبات بعد</div>';return;}el.innerHTML=orders.map(function(o){var sd=o.status_display||{ar:o.status};return '<div class="eo-order"><div class="eo-order-head"><div class="eo-order-id">طلب #'+E(o.id)+'</div><span class="eo-badge gray">'+E(sd.ar||'—')+'</span></div><div class="eo-order-meta">'+E(o.customer_name||'—')+' · '+E(o.customer_phone||'')+'<br>الإجمالي '+(o.total!=null?o.total:'—')+' ج.م</div></div>';}).join('');};
W.eoLoadAll=async function(){var ok=true;if(W.eoReady)ok=await W.eoReady();else if(W.eoEnsureSession)ok=await W.eoEnsureSession();if(!ok)return;try{var me=await W.eoApi('/auth/me');W.eoRenderConnection(me.connection);var r=await Promise.all([W.eoApi('/products'),W.eoApi('/orders'),W.eoApi('/webhook/url')]);W.eoRenderProducts(r[0].products||[]);W.eoRenderOrders(r[1].orders||[]);if(r[2]&&r[2].webhook){var wb=G('eoWebhookUrl');if(wb&&wb.childNodes[0])wb.childNodes[0].nodeValue=r[2].webhook.url+' ';}}catch(err){saErr(err,'eoLoadAll');}};

/* ===== الإقلاع ===== */
function saDiag(){try{var info={};info.g2=!!G('g2');info.gDisp=G('g')?getComputedStyle(G('g')).display:'-';info.cards=document.querySelectorAll('.sa-card').length;info.sec=document.querySelectorAll('.sa-sec').length;info.P=_P?_P.length:'null';info.openP=typeof W.openP;info.pm=!!G('pm');info.lastTap=(window.__lastTap||'-');var ok=info.g2&&info.gDisp==='none'&&info.cards>0;var x=G('saDiagBox');if(!x){x=document.createElement('div');x.id='saDiagBox';document.body.appendChild(x);}x.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:'+(ok?'#065f46':'#b45309')+';color:#fff;padding:9px 10px;font:700 11px Cairo,sans-serif;text-align:center;line-height:1.6;box-shadow:0 4px 16px rgba(0,0,0,.35)';x.textContent=(ok?'✅ التصنيف شغال':'⚠️ فيه حاجة ناقصة — صوّر الشريط ده')+' | g2='+info.g2+' gDisp='+info.gDisp+' cards='+info.cards+' أقسام='+info.sec+' منتجات='+info.P+' openP='+info.openP+' pm='+info.pm+' tap='+info.lastTap;setTimeout(function(){var y=G('saDiagBox');if(y)y.remove();},30000);}catch(_){}}
function injectPMCSS(){if(G('saPMCSS'))return;var st=document.createElement('style');st.id='saPMCSS';st.textContent=
'.pm{position:fixed !important;inset:0 !important;z-index:400 !important;background:rgba(6,18,16,.55);backdrop-filter:blur(4px);display:flex !important;align-items:flex-end;justify-content:center;opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s}'+
'.pm.show{opacity:1 !important;visibility:visible !important}'+
'.pm-b{background:#fff;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;border-radius:24px 24px 0 0;padding:0 18px 28px;box-shadow:0 -20px 60px -20px rgba(0,0,0,.5);transform:translateY(30px);transition:transform .35s cubic-bezier(.2,.8,.2,1)}'+
'.pm.show .pm-b{transform:none}'+
'.pm-h{position:sticky;top:0;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:16px 4px 12px;border-bottom:1px solid #f1f5f9;z-index:2}'+
'.pm-h h3{font-size:1.05rem;font-weight:900;color:#0f2420}'+
'.pm-h button{width:38px;height:38px;border-radius:12px;background:#f1f5f9;border:none;font-size:1.3rem;cursor:pointer;color:#475569;transition:.15s}'+
'.pm-h button:active{transform:scale(.88);background:#e2e8f0}'+
'.pm-b>img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:18px;background:#f1f5f9;margin:14px 0 12px}'+
'.pm-name{font-size:1.2rem;font-weight:900;color:#0f2420;line-height:1.4;margin-bottom:6px}'+
'.pm-price{font-size:1.5rem;font-weight:900;color:#0F766E;font-variant-numeric:tabular-nums;margin-bottom:14px}'+
'.pm .box{background:#f8fafc;border:1px solid #eef2f6;border-radius:14px;padding:11px 14px;margin-bottom:9px}'+
'.pm .box .l{font-size:.72rem;color:#64748b;font-weight:700;margin-bottom:3px}'+
'.pm .box .v{font-size:.95rem;font-weight:700;color:#1e293b}'+
'.pm .note-box{background:#f0fdfa;border-color:#ccfbf1}'+
'.pm .drive{display:block;background:linear-gradient(135deg,#0F766E,#0a4f49);color:#fff;text-align:center;padding:12px;border-radius:14px;font-weight:800;font-size:.9rem;text-decoration:none;margin:10px 0}'+
'.pm label{display:block;font-size:.8rem;font-weight:700;color:#475569;margin:12px 0 6px}'+
'.pm input[type=number]{width:100%;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:12px;font-family:Cairo,sans-serif;font-size:1rem;font-weight:700;outline:none;transition:.2s;box-sizing:border-box}'+
'.pm input[type=number]:focus{border-color:#0F766E;box-shadow:0 0 0 3px rgba(15,118,110,.12)}'+
'.pm .hint{font-size:.74rem;color:#ef4444;font-weight:700;margin-top:5px;display:none}'+
'.pm .qty-row{display:flex;align-items:center;gap:12px}'+
'.pm .qty-btn{width:44px;height:44px;border-radius:12px;background:#f0fdfa;border:1.5px solid #ccfbf1;color:#0F766E;font-size:1.4rem;font-weight:800;cursor:pointer;transition:.15s}'+
'.pm .qty-btn:active{transform:scale(.9);background:#ccfbf1}'+
'.pm .qty-val{font-size:1.2rem;font-weight:900;min-width:30px;text-align:center;color:#0f2420}'+
'.pm .btn-accent{width:100%;margin-top:18px;background:linear-gradient(135deg,#14b8a6,#0d9488);color:#fff;border:none;padding:15px;border-radius:16px;font-family:Cairo,sans-serif;font-size:1.05rem;font-weight:900;cursor:pointer;box-shadow:0 10px 26px -10px rgba(13,148,136,.6);transition:.15s}'+
'.pm .btn-accent:active{transform:scale(.97)}'+
'.pm .btn-accent:disabled{opacity:.5}';
document.head.appendChild(st);}
function ensurePM(){if(G('pm'))return;var h=document.createElement('div');h.innerHTML='<div class="pm" id="pm"><div class="pm-h"><h3>تفاصيل المنتج</h3><button onclick="closeP()">×</button></div><div class="pm-b"><img id="pm-img" src="" alt=""><div class="pm-name" id="pm-name"></div><div class="pm-base-l">سعر الجملة — تكلفتك من سوقلي</div><div class="pm-price" id="pm-price"></div><div class="box"><div class="l">كود المنتج</div><div class="v" id="pm-code">—</div></div><div class="box" id="pm-stock-box"><div class="l">المخزون</div><div class="v" id="pm-stock">—</div></div><div class="box note-box"><div class="l">ملاحظات سوقلي</div><div class="v" id="pm-note">—</div></div><a class="drive" id="pm-drive" href="#" target="_blank" style="display:none">📁 صور وفيديوهات على الطبيعة</a><div id="pm-desc" style="font-size:.88rem;line-height:1.7;color:#475569;margin:10px 0"></div><label>سعر البيع للعميل (ج.م)</label><input type="number" id="editPrice" oninput="checkMin();updProfit()"><div class="hint" id="minHint">لا يمكن البيع بأقل من السعر الأساسي</div><label>الكمية</label><div class="qty-row"><button class="qty-btn" onclick="chgQty(-1)">−</button><span class="qty-val" id="qtyVal">1</span><button class="qty-btn" onclick="chgQty(1)">+</button></div><div class="hint" id="stockHint">الكمية أكبر من المخزون المتاح</div><button class="btn btn-accent" id="btnAdd" onclick="addCart()">🛒 أضف إلى السلة</button></div></div>';document.body.appendChild(h.firstChild);}
function injectPMPolish(){if(G('saPMPolish'))return;var st=document.createElement('style');st.id='saPMPolish';st.textContent=
'.pm-b{position:relative;border-radius:28px 28px 0 0 !important}'+
'.pm-b::before{content:"";position:absolute;top:8px;left:50%;transform:translateX(-50%);width:44px;height:5px;border-radius:6px;background:#d4dbe4;z-index:6}'+
'.pm-h{position:sticky;top:0;left:0;right:0;width:100%;margin:0 !important;padding:20px 20px 14px !important;box-sizing:border-box;background:#fff !important;border-bottom:1px solid #eef2f6 !important;display:flex !important;align-items:center !important;justify-content:space-between !important;gap:12px}'+
'.pm-h h3{font-size:1.12rem !important;font-weight:900 !important;color:#0f2420 !important;flex:1;text-align:right;margin:0}'+
'.pm-h button{width:40px;height:40px;border-radius:50% !important;background:#f1f5f9 !important;flex-shrink:0;display:grid;place-items:center}'+
'.pm-b>img{border-radius:20px !important;box-shadow:0 10px 28px -12px rgba(16,32,29,.35) !important}'+
'.pm .box{border-radius:16px !important}'+
'.pm .btn-accent{position:sticky;bottom:0;border-radius:18px !important;box-shadow:0 -6px 22px rgba(255,255,255,.95),0 14px 32px -10px rgba(13,148,136,.6) !important}'+'.sugg-box{background:#f0fdfa !important;border-color:#99f6e4 !important}.sugg-box .v{color:#0F766E !important;font-size:1.2rem !important;font-weight:900 !important}.profit-box{background:#fffbeb !important;border-color:#fde68a !important}.profit-box .v{font-weight:900 !important;font-size:1.05rem !important}.pm-base-l{font-size:.74rem;color:#64748b;font-weight:700;margin:14px 0 2px}.sugg-box,.profit-box,#pm-sugg,#pm-profit{display:none !important}';
document.head.appendChild(st);}

// ===== EasyOrders UI =====
let _eoConnected = false;
async function eoCheckStatus() {
  try {
    const r = await fetch('/api/easyorders/status');
    const j = await r.json();
    _eoConnected = j.connected;
    eoUpdateExportBtns();
  } catch(e) {}
}
function eoUpdateExportBtns() {
  document.querySelectorAll('.eo-export-btn').forEach(b => {
    b.style.display = _eoConnected ? 'block' : 'none';
  });
}
async function eoExport(idx) {
  if(!_eoConnected) { alert('اربط EasyOrders الأول من لوحة الأدمن'); return; }
  const p = _P[idx];
  if(!p) return;
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '⏳ جارٍ التصدير…';
  try {
    const r = await fetch('/api/easyorders/export', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id: p.id, name: p.name, price: p.price, sale_price: p.price, image: p.image, stock: p.stock == null ? null : Number(p.stock)})
    });
    const j = await r.json();
    if(j.ok) { btn.textContent = '✅ تم التصدير'; setTimeout(() => { btn.textContent = '📤 تصدير إلى EasyOrders'; btn.disabled = false; }, 2000); }
    else { alert('فشل التصدير: ' + (j.error||'')); btn.textContent = '📤 تصدير إلى EasyOrders'; btn.disabled = false; }
  } catch(e) { alert('تعذّر الاتصال'); btn.textContent = '📤 تصدير إلى EasyOrders'; btn.disabled = false; }
}
// اختبر الاتصال عند التحميل
setTimeout(eoCheckStatus, 1000);

async function boot(){injectPMCSS();injectPMPolish();ensurePM();ensureG2();await loadP();bindGrid();bindSearch();renderGrouped();}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot);else boot();
setTimeout(function(){try{if((!_P||!_P.length)&&G('g2')){loadP().then(function(){if(_P&&_P.length)renderGrouped();});}}catch(e){}},2500);
// إعادة رسم لو الـ search اتغيّر قبل ما أربط (احتياطي)
setTimeout(function(){ensureG2();bindGrid();bindSearch();if(_P)renderGrouped();},1200);


/* CLEAN-DIAG-v24 — لا تشخيص بعد الآن */
saDiag=function(){};saTap=function(){};
})();

(function(){try{if(document.getElementById('chatStyle2'))return;var s=document.createElement('style');s.id='chatStyle2';s.textContent='#chatScreen{background:#e5ddd5}.chat-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#8a8a8a;gap:8px}.chat-empty .ic{font-size:3rem;opacity:.5}.msg{display:flex;margin:4px 12px}.msg.user{justify-content:flex-start}.msg.admin{justify-content:flex-end}.bubble{max-width:78%;padding:8px 12px 6px;border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,.12);word-wrap:break-word}.msg.user .bubble{background:#fff;border-top-right-radius:4px}.msg.admin .bubble{background:#d9fdd3;border-top-left-radius:4px}.msg-text{font:500 .92rem/1.5 Cairo,sans-serif;color:#111;white-space:pre-wrap}.bubble img,.bubble video{max-width:100%;border-radius:12px;display:block;margin-bottom:4px;max-height:260px}.bubble audio{width:220px;max-width:100%}.msg-time{font:600 .62rem/1 Cairo,sans-serif;color:#9a9a9a;text-align:left;margin-top:4px}.msg.admin .msg-time{color:#5f7d54}#chatInput{flex:1;border:none;border-radius:24px;padding:11px 16px;font:500 .92rem Cairo;outline:none;background:#fff}#chatSendBtn{background:linear-gradient(135deg,#14b8a6,#0d9488);border:none;color:#fff;width:44px;height:44px;border-radius:50%;font-size:1.1rem;cursor:pointer}';(document.head||document.documentElement).appendChild(s);}catch(e){}})();

window.chatOnFile=function(input){var f=input.files&&input.files[0];if(!f)return;if(f.size>8*1024*1024){try{alert('الحد الأقصى 8 ميجا');}catch(e){}input.value='';return;}var tp=f.type.indexOf('video')===0?'video':'image';var r=new FileReader();r.onload=function(ev){fetch('/api/chat/send',{method:'POST',headers:saH(),credentials:'include',body:JSON.stringify({type:tp,media:ev.target.result})}).then(function(rr){if(!rr.ok)throw new Error('فشل');if(W.chatRender)W.chatRender(true);}).catch(function(e){try{alert('فشل إرسال الملف');}catch(_){}});};r.readAsDataURL(f);input.value='';};

/* ===== MODAL_ENHANCE_V1: مخزون متوفر + تصدير EasyOrders في تفاصيل المنتج ===== */
(function(){
  var W=window, D=document;
  W.__PM_CACHE=null; W.__pmCur=null; W.__pmIdx=-1;
  function pmH(){var tk='';try{tk=localStorage.getItem('sq_user_token')||'';}catch(e){}return {'Content-Type':'application/json','x-sq-token':tk};}
  function ensureCache(){
    if(W.__PM_CACHE && W.__PM_CACHE.length) return Promise.resolve(W.__PM_CACHE);
    return fetch('/api/products',{credentials:'include',headers:pmH()}).then(function(r){return r.json();}).then(function(list){W.__PM_CACHE=Array.isArray(list)?list:[];return W.__PM_CACHE;}).catch(function(){return [];});
  }
  function num(s){if(s==null)return 0;var n=parseFloat(String(s).replace(/[^\d.]/g,''));return isNaN(n)?0:n;}
  function pmEnhance(){
    try{
      var c = W.__pmCur; var pm = D.getElementById('pm'); if(!pm) return;
      var stock = (c && c.stock!=null) ? c.stock : (c && c.available!=null ? c.available : null);
      var avail = !(c && (c.available===false || c.available===0 || stock===0 || stock==='0'));
      var se = D.getElementById('pm-stock');
      if(!se){ se=D.createElement('div'); se.id='pm-stock'; var b=D.getElementById('btnAdd'); if(b&&b.parentNode)b.parentNode.insertBefore(se,b); else pm.appendChild(se); }
      se.style.cssText='margin:14px 0 4px;padding:13px 16px;border-radius:15px;font-family:Cairo,sans-serif;display:flex !important;align-items:center;justify-content:space-between;gap:10px;background:'+(avail?'#f0fdf4':'#fef2f2')+';border:1.5px solid '+(avail?'#86efac':'#fca5a5');
      se.innerHTML='<span style="font-weight:800;font-size:.9rem;color:'+(avail?'#15803d':'#b91c1c')+'">📦 المخزون المتوفر</span><span style="font-weight:900;font-size:1.08rem;color:'+(avail?'#16a34a':'#dc2626')+'">'+(avail?(num(stock)>0?num(stock)+' قطعة':'متوفر'):'نفد المخزون')+'</span>';
      var ex = D.getElementById('pm-eo-export');
      if(!ex){ ex=D.createElement('button'); ex.id='pm-eo-export'; ex.type='button'; var b2=D.getElementById('btnAdd'); if(b2&&b2.parentNode)b2.parentNode.insertBefore(ex,b2.nextSibling); else pm.appendChild(ex); }
      ex.style.cssText='width:100%;margin:10px 0 0;padding:14px;border:none;border-radius:15px;background:linear-gradient(135deg,#0ea5e9,#0369a1);color:#fff;font-family:Cairo,sans-serif;font-weight:800;font-size:.95rem;cursor:pointer;box-shadow:0 8px 22px -8px rgba(14,165,233,.6);display:flex;align-items:center;justify-content:center;gap:8px';
      if(!ex.disabled) ex.innerHTML='📤 تصدير هذا المنتج إلى EasyOrders';
      ex.onclick=function(ev){ev.preventDefault();ev.stopPropagation();eoExportModal(c,ex);};
    }catch(e){console.warn('[pmEnhance]',e);}
  }
  function eoExportModal(c, btn){
    if(!c){alert('مفيش منتج محدّد');return;}
    fetch('/api/easyorders/status').then(function(r){return r.ok?r.json():{connected:false};}).then(function(j){
      if(!j||!j.connected){alert('⚠️ اربط EasyOrders الأول من لوحة الأدمن:\nافتح /admin → 🔗 ربط EasyOrders → حط الـ API Key');return;}
      btn.disabled=true; btn.innerHTML='⏳ جارٍ التصدير…';
      fetch('/api/easyorders/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:c.id,name:c.name,price:c.price,sale_price:c.price,image:c.image,stock:c.stock == null ? null : Number(c.stock),description:c.desc||c.description||''})})
        .then(function(r){return r.json().then(function(jj){return {ok:r.ok,jj:jj};}).catch(function(){return {ok:r.ok,jj:{}};});})
        .then(function(res){ if(res.ok&&res.jj&&res.jj.ok){btn.innerHTML='✅ تم التصدير بنجاح';setTimeout(function(){btn.innerHTML='📤 تصدير هذا المنتج إلى EasyOrders';btn.disabled=false;},2400);} else {alert('فشل التصدير: '+((res.jj&&res.jj.error)||'خطأ غير معروف'));btn.innerHTML='📤 تصدير هذا المنتج إلى EasyOrders';btn.disabled=false;} })
        .catch(function(e){alert('تعذّر الاتصال بالسيرفر');btn.innerHTML='📤 تصدير هذا المنتج إلى EasyOrders';btn.disabled=false;});
    }).catch(function(e){alert('تعذّر التحقق من EasyOrders');btn.innerHTML='📤 تصدير هذا المنتج إلى EasyOrders';btn.disabled=false;});
  }
  var _orig = W.openP;
  W.openP = function(i){
    W.__pmIdx = i; var p;
    if(typeof _orig==='function'){ try{ p=_orig(i); }catch(e){ console.warn('[openP orig]',e); } }
    ensureCache().then(function(list){ W.__pmCur=list[i]||null; setTimeout(pmEnhance,50); setTimeout(pmEnhance,220); setTimeout(pmEnhance,500); });
    return p;
  };
  W.pmEnhance = pmEnhance; W.eoExportModal = eoExportModal;
  console.log('[modal-enhance] ready');
})();

