
var P=[],cart=[],cur=null,qty=1,SH=50,COMM=20,TH=null,STORE={};
var GOVS=['القاهرة','الجيزة','الإسكندرية','الدقهلية','الشرقية','الغربية','المنوفية','القليوبية','البحيرة','كفر الشيخ','دمياط','بورسعيد','الإسماعيلية','السويس','الفيوم','بني سويف','المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان'];
fGov.innerHTML=GOVS.map(g=>'<option>'+g+'</option>').join('');
function fmt(n){return Number(n).toLocaleString('ar-EG')+' ج.م'}
function range(a,b){var r=[];for(var i=a;i<b&&i<P.length;i++)r.push(i);return r}
function allIdx(){return range(0,P.length)}
var u=new URLSearchParams(location.search);var ref=u.get('ref')||'';if(ref)localStorage.setItem('sref',ref);
function boot(tid){loadTheme(tid||'store-pro');}
function loadTheme(id){var s=document.createElement('script');s.src='/themes/'+id+'.js?v=2';s.onload=function(){TH=window.THEME;document.getElementById('themeCss').textContent=TH.css||'';render();};s.onerror=function(){TH=window.THEME;render();};document.head.appendChild(s);}
function cards(idx){return idx.map(function(i){return TH.card(P[i],i)}).join('')}
function wrap(t,inner,cls){return '<section class="'+(cls||'sec-wrap')+'"><h2 class="sec-t">'+t+'</h2><div class="pgrid">'+inner+'</div></section>'}
function defCats(){return '<section class="cats-wrap"><h2 class="sec-t">تسوق حسب التصنيف</h2><div class="cats">'+['إلكترونيات','أزياء','جمال','منزل','رياضة'].map(c=>'<span class="cat">'+c+'</span>').join('')+'</div></section>'}
function secHtml(id){
 if(id=='hero')return TH.hero();
 if(id=='categories')return TH.categories?TH.categories():defCats();
 if(id=='products')return '<section class="sec-wrap"><h2 class="sec-t" id="prodTitle">كل المنتجات</h2><div class="pgrid" id="mainGrid"></div></section>';
 if(id=='featured')return wrap(TH.tFeat||'منتجات مميزة',cards(range(0,4)));
 if(id=='best')return wrap('الأكثر مبيعاً',cards(range(4,8)));
 if(id=='flash')return wrap('⚡ عروض خاطفة',cards(range(8,12)));
 if(id=='brands')return TH.brands?TH.brands():'';
 if(id=='banner')return TH.banner?TH.banner():'';
 if(id=='newsletter')return TH.newsletter?TH.newsletter():'';
 return '';}
function render(){if(!TH)return;
 document.getElementById('header').innerHTML=TH.header();
 document.getElementById('home').innerHTML=(TH.sections||['hero','products']).map(secHtml).join('');
 document.getElementById('footer').innerHTML=TH.footer();
 document.getElementById('mnav').innerHTML=TH.mobileNav?TH.mobileNav():'';
 document.title=(STORE.name||TH.name||'متجر إلكتروني');postRender();}

var curCat='الكل',curQ='';
function applyCustom(){var cs=document.getElementById('customCss');if(cs)cs.textContent=STORE.customCss||'';if(STORE.customHtml&&!document.getElementById('customHtmlBox')){var d=document.createElement('div');d.id='customHtmlBox';d.innerHTML=STORE.customHtml;document.body.appendChild(d);}if(STORE.customJs&&!window.__cjs){window.__cjs=1;try{new Function(STORE.customJs)();}catch(e){}}}
function postRender(){applyCustom();renderCats();renderGrid();setupWA();updCC();}
function getCats(){var s={};P.forEach(function(p){s[p.category||p.cat||'عام']=1});return ['الكل'].concat(Object.keys(s));}
function renderCats(){var e=document.getElementById('catRow');if(e)e.innerHTML=getCats().map(function(cc){return '<button class="cc'+(cc===curCat?' on':'')+'" onclick="setCat(\''+cc+'\')">'+cc+'</button>'}).join('');}
function setCat(cc){curCat=cc;renderCats();renderGrid();}
function doSearch(q){curQ=(q||'').trim();renderGrid();}
function visIdx(){return allIdx().filter(function(i){var p=P[i];if(curCat!=='الكل'&&(p.category||p.cat||'عام')!==curCat)return false;if(curQ&&(p.name||'').indexOf(curQ)===-1)return false;return true});}
function renderGrid(){var e=document.getElementById('mainGrid');if(!e||!TH)return;var v=visIdx();var tt=document.getElementById('prodTitle');if(tt)tt.textContent=(curCat!=='الكل'?curCat:(curQ?'نتائج البحث':'كل المنتجات'))+' ('+v.length+')';e.innerHTML=v.map(function(i){return TH.card(P[i],i)}).join('')||'<div style="grid-column:1/-1;text-align:center;padding:30px;color:#999">لا توجد منتجات مطابقة 🔍</div>';}
function setupWA(){var n=STORE.whatsapp||STORE.phone||'201000000000';var a=document.getElementById('waFloat');if(a)a.href='https://wa.me/'+String(n).replace(/[^0-9]/g,'')+'?text='+encodeURIComponent('مرحباً 👋 أريد الاستفسار عن المنتجات');}

fetch('/api/products').then(r=>r.json()).then(function(d){P=d||[];
 if(ref){fetch('/api/theme/'+ref).then(r=>r.json()).then(function(x){STORE=x.theme||{};boot(STORE.activeTheme||u.get('theme')||'store-pro');});}
 else{var tk=localStorage.getItem('etok')||'';
 if(tk){fetch('/api/auth/me',{headers:{'x-auth-token':tk}}).then(function(r){return r.json()}).then(function(m){return fetch('/api/theme/'+((m.user||{}).id||0))}).then(function(r){return r.json()}).then(function(x){STORE=x.theme||{};boot(STORE.activeTheme||u.get('theme')||'store-pro');}).catch(function(){boot(u.get('theme')||'store-pro');});}
 else boot(u.get('theme')||'store-pro');});}
window.addEventListener('message',function(e){var d=e.data||{};if(d.type==='themeLive'){if(TH)applyLive(d.settings);}});
function applyLive(s){if(!TH)return;if(s.customCss){var cc=document.getElementById('customCss');if(cc)cc.textContent=s.customCss;}
if(s.colors){var r=document.documentElement;if(s.colors.primary)r.style.setProperty('--p',s.colors.primary);if(s.colors.secondary)r.style.setProperty('--p2',s.colors.secondary);if(s.colors.background)r.style.setProperty('--bg',s.colors.background);}render();}
function openP(i){cur=P[i];qty=1;pmImg.src=cur.image||'';pmName.textContent=cur.name;pmPrice.textContent=fmt(cur.price);pmDesc.textContent=cur.desc||'';qV.textContent=1;openM('pm');}
function chQ(d){qty=Math.max(1,qty+d);qV.textContent=qty;}
function addToCart(){if(!cur)return;var ex=cart.find(c=>c.id===cur.id);if(ex)ex.qty+=qty;else cart.push({id:cur.id,name:cur.name,price:cur.price,image:cur.image,qty:qty});updCC();closeM('pm');openCart();}
function updCC(){var e=document.getElementById('cc');if(e)e.textContent=cart.reduce((a,c)=>a+c.qty,0);}
function openCart(){cItems.innerHTML=cart.length?cart.map(function(c,i){return '<div class="ci"><img src="'+(c.image||'')+'"><div class="n">'+c.name+'<br><small>'+c.qty+' × '+c.price+'</small></div><div class="p">'+fmt(c.price*c.qty)+'</div><button onclick="rmC('+i+')">حذف</button></div>';}).join(''):'<div style="text-align:center;color:#999;padding:30px">سلتك فارغة 🛒</div>';cTot.textContent=fmt(cart.reduce((a,c)=>a+c.price*c.qty,0));openM('cm');}
function rmC(i){cart.splice(i,1);updCC();openCart();}
function openCo(){if(!cart.length)return;closeM('cm');coTot.textContent=fmt(cart.reduce((a,c)=>a+c.price*c.qty,0)+SH);openM('co');}
function submitOrder(){var m=coMsg;m.className='msg';if(!fName.value||!fPhone.value||!fAddr.value){m.textContent='⚠️ اكمل بياناتك';m.className='msg err';return;}
 var items=cart.map(c=>({id:c.id,name:c.name,price:c.price,qty:c.qty}));var tot=cart.reduce((a,c)=>a+c.price*c.qty,0)+SH;
 fetch('/api/create-order',{method:'POST',headers:{'Content-Type':'application/json','x-auth-token':localStorage.getItem('etok')||''},body:JSON.stringify({client_name:fName.value,client_phone1:fPhone.value,client_address:fAddr.value,shipping_governorate:fGov.value,items:items,productNames:cart.map(c=>c.name),total:tot,commission:COMM,shipping_cost:SH,ref:localStorage.getItem('sref')||''})}).then(r=>r.json()).then(function(d){if(d.error){m.textContent='⚠️ '+d.error;m.className='msg err';}else{m.textContent='✅ تم استلام طلبك';m.className='msg ok';cart=[];updCC();setTimeout(()=>closeM('co'),1400);}}).catch(function(){m.textContent='⚠️ خطأ';m.className='msg err';});}
function openM(id){document.getElementById(id).classList.add('on')}function closeM(id){document.getElementById(id).classList.remove('on')}
