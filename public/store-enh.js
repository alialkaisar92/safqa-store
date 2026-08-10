(function(){
window.ehToast=function(m){var d=document.createElement("div");d.className="eh-toast";d.textContent=m;document.body.appendChild(d);setTimeout(function(){d.remove()},2200);};
function header(){return;var h=document.querySelector(".header");if(!h||h.dataset.eh)return;h.dataset.eh="1";
h.innerHTML='<div class="eh-brand"><span class="eh-logo">Earnify 💰</span><small>منصة التسويق بالعمولة</small></div>'
+'<button class="eh-profile" onclick="go(\'account\')"><span class="eh-pname">أحمد محمد<small>✔ مسوق نشط</small></span><span class="eh-av">👤</span></button>'
+'<button class="eh-cartb" onclick="go(\'cart\')">🛒<i>0</i></button>'
+'<button class="eh-bell" onclick="go(\'account\')">🔔<i>3</i></button>';}
function wallet(){var s=document.getElementById("s");if(!s||document.getElementById("ehWallet"))return;
var w=document.createElement("div");w.id="ehWallet";w.className="eh-wallet";
w.innerHTML='<div style="display:flex;gap:10px;align-items:center"><span class="wic">💼</span><div class="bal"><small>رصيدك المتاح</small><b id="ehBal">... ج.م</b></div></div><button class="wbtn" onclick="go(\'withdraw\')">سحب الأرباح</button>';
s.parentNode.insertBefore(w,s);
fetch("/api/me").then(function(r){return r.json()}).then(function(me){var b=(me&&me.balance!=null)?me.balance:2450;var el=document.getElementById("ehBal");if(el)el.textContent=(+b).toLocaleString("ar-EG")+" ج.م";}).catch(function(){});}
function hero(){var s=document.getElementById("s");if(!s||document.getElementById("ehHero"))return;
var h=document.createElement("div");h.id="ehHero";h.className="eh-hero";
h.innerHTML='<h3>🔥 سوّق واربح حتى 30% عمولة</h3><p>شحن سريع لجميع المحافظات<br>سحب أرباح فوري</p><button class="hbtn" onclick="document.getElementById(\'g\').scrollIntoView({behavior:\'smooth\'})">تصفح المنتجات ❮</button><div class="dots"><i class="on"></i><i></i><i></i><i></i></div>';
s.parentNode.insertBefore(h,s);
var q=document.createElement("div");q.className="eh-quick";
q.innerHTML='<button onclick="document.getElementById(\'g\').scrollIntoView({behavior:\'smooth\'})"><i>★</i><b>المنتجات المميزة</b><small>أفضل العروض</small></button><button onclick="go(\'support\')"><i>🎧</i><b>الدعم</b><small>فريق جاهز</small></button><button onclick="go(\'orders\')"><i>📦</i><b>طلباتي</b><small>تتبع طلباتك</small></button><button onclick="go(\'withdraw\')"><i>💰</i><b>سحب الأرباح</b><small>حول أرباحك</small></button>';
h.parentNode.insertBefore(q,s);}
function search(){var s=document.getElementById("s");if(!s||s.dataset.eh)return;s.dataset.eh="1";
var w=document.createElement("div");w.className="eh-search";s.parentNode.insertBefore(w,s);w.appendChild(s);
var f=document.createElement("button");f.className="fbtn";f.textContent="فلتر ⚙";w.appendChild(f);
var b=document.createElement("button");b.className="bbtn";b.textContent="⌗";b.onclick=function(){ehToast("امسح الباركود 📷")};w.appendChild(b);}
var IC={"الكل":"🛍️","أخرى":"📦","أطفال":"🧸","إلكترونيات":"📱","منزل":"🏠","جمال":"💄","أزياء":"👗","رياضة":"⚽"};
function cats(){var old=document.getElementById("cats");if(!old)return;
if(!document.getElementById("ehCats")){var bar=document.createElement("div");bar.id="ehCats";bar.className="eh-cats";old.parentNode.insertBefore(bar,old);
[].forEach.call(old.querySelectorAll(".c"),function(b,i){var t=(b.getAttribute("data-c")||"").trim();var label=(b.textContent||"").trim();
var p=document.createElement("button");p.innerHTML=(IC[label]||"📦")+" "+label;if(i===0)p.classList.add("on");
p.onclick=function(){bar.querySelectorAll("button").forEach(function(x){x.classList.remove("on")});p.classList.add("on");cc=b.getAttribute("data-c");renderP();};
bar.appendChild(p);});}}
function sechead(){var g=document.getElementById("g");if(!g||document.getElementById("ehSec"))return;
var d=document.createElement("div");d.id="ehSec";d.className="eh-sechead";d.innerHTML='<b>⭐ منتجات مميزة</b><a href="#" onclick="return false">عرض الكل ❮</a>';g.parentNode.insertBefore(d,g);}
function stats(){var g=document.getElementById("g");if(!g||document.getElementById("ehStats"))return;
var d=document.createElement("div");d.id="ehStats";d.className="eh-stats";
d.innerHTML='<div><small>إجمالي الأرباح</small><b>18,760 ج.م</b><em>↑ 12.5%</em></div><div><small>عدد الطلبات</small><b>320</b><em>↑ 18.7%</em></div><div><small>عدد النقرات</small><b>8,540</b><em>↑ 25.6%</em></div><div><small>معدل التحويل</small><b>4.8%</b><em>↑ 12.5%</em></div>';
g.parentNode.insertBefore(d,g.nextSibling);}
function rebuild(){var g=document.getElementById("g");if(!g)return;
g.querySelectorAll(".card:not([data-ref])").forEach(function(c){c.setAttribute("data-ref","1");
var oc=c.getAttribute("onclick")||"";var m=oc.match(/openP\((\d+)\)/);var idx=m?+m[1]:-1;
var P=(window.products&&idx>=0)?products[idx]:null;
var img=c.querySelector("img");var src=P&&P.image?P.image:(img?img.src:"");
var name=P?P.name:(c.querySelector(".t")?c.querySelector(".t").textContent:"");
var price=P?(+P.price).toLocaleString("ar-EG")+" ج.م":(c.querySelector(".pr")?c.querySelector(".pr").textContent:"");
var stock=P?(+P.stock).toLocaleString("ar-EG"):"0";
var rate=(4+Math.random()).toFixed(1);var cnt=Math.floor(100+Math.random()*300);
c.innerHTML='<div class="rf-img"><img src="'+src+'" loading="lazy"><button class="rf-fav" onclick="event.stopPropagation();ehToast(\'تمت الإضافة للمفضلة ❤\')">🤍</button><span class="rf-comm">عمولة 30%</span></div>'
+'<div class="rf-body"><div class="rf-name">'+name+'</div>'
+'<div class="rf-row"><span class="rf-price">'+price+'</span><span class="rf-rate"><b>★</b> '+rate+' ('+cnt+')</span></div>'
+'<div class="rf-stock">متوفر: '+stock+' قطعة</div>'
+'<button class="rf-view">عرض المنتج</button></div>';});}
setInterval(function(){header();wallet();hero();search();cats();sechead();stats();rebuild();},700);
})();

(function(){
var I={
home:'<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/></svg>',
grid:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
box:'<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>',
bag:'<svg viewBox="0 0 24 24"><path d="M9 5h6l3 4c1.5 5-1.5 11-6 11s-7.5-6-6-11l3-4z"/><path d="M12 10v6"/><path d="M14.5 11.5c-.5-1-4.5-1-4.5 1s4 2 4 3-3.5 1.5-4.5.5"/></svg>',
person:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>'
};
function nav(){return;var n=document.querySelector(".nav");if(!n||n.dataset.eh)return;n.dataset.eh="1";
var items=[{id:"store",l:"الرئيسية",i:I.home},{id:"products",l:"المنتجات",i:I.grid},{id:"orders",l:"طلباتي",i:I.box},{id:"withdraw",l:"الأرباح",i:I.bag},{id:"account",l:"حسابي",i:I.person}];
n.innerHTML=items.map(function(it,idx){return '<button class="eh-nitem'+(idx===0?" on":"")+'" data-id="'+it.id+'">'+it.i+"<span>"+it.l+"</span></button>";}).join("");
n.querySelectorAll(".eh-nitem").forEach(function(b){b.onclick=function(){
n.querySelectorAll(".eh-nitem").forEach(function(x){x.classList.remove("on")});b.classList.add("on");
var id=b.dataset.id;
if(id==="products"){go("store");setTimeout(function(){var g=document.getElementById("g");if(g)g.scrollIntoView({behavior:"smooth"})},200);}
else go(id);};});}
setInterval(nav,700);
})();

(function(){
function fix(){
 var h=document.querySelector(".header");
 if(h&&!document.getElementById("ht")){var d=document.createElement("div");d.id="ht";d.style.display="none";h.appendChild(d);}
 document.querySelectorAll(".nav .eh-nitem").forEach(function(b){if(b.dataset.id==="account")b.dataset.id="profile";});
 var pp=document.querySelector(".eh-profile");if(pp)pp.onclick=function(){go("profile")};
 
}
setInterval(fix,400);
})();

(function(){
window.ehScan=function(){
 if(window.BarcodeDetector&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){
  var ov=document.createElement("div");ov.className="eh-scan";
  ov.innerHTML='<div class="sframe"><video autoplay playsinline muted></video><div class="sline"></div></div><div class="shint">وجّه الكاميرا نحو الباركود</div><button class="sclose" onclick="ehScanClose()">إلغاء</button>';
  document.body.appendChild(ov);
  var v=ov.querySelector("video");
  navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}).then(function(st){
   v.srcObject=st;
   var det=new BarcodeDetector({formats:["ean_13","ean_8","code_128","code_39","upc_a","upc_e","qr_code","itf"]});
   var timer=setInterval(function(){
    if(!document.body.contains(ov)){clearInterval(timer);return;}
    det.detect(v).then(function(codes){if(codes&&codes.length){var val=codes[0].rawValue;clearInterval(timer);ehScanClose();ehFindByBarcode(val);}}).catch(function(){});
   },350);
   ov.dataset.timer=timer;
  }).catch(function(){ehScanClose();ehScanManual();});
 } else { ehScanManual(); }
};
window.ehScanManual=function(){var b=prompt("اكتب رقم الباركود:");if(b)ehFindByBarcode(b);};
window.ehScanClose=function(){var ov=document.querySelector(".eh-scan");if(ov){if(ov.dataset.timer)clearInterval(+ov.dataset.timer);var v=ov.querySelector("video");if(v&&v.srcObject){v.srcObject.getTracks().forEach(function(t){t.stop();});}ov.remove();}};
function ehFindByBarcode(code){
 code=String(code).trim();var idx=-1;
 for(var i=0;i<products.length;i++){if(String(products[i].barcode||"").trim()===code){idx=i;break;}}
 if(idx<0){for(var j=0;j<products.length;j++){if(String(products[j].barcode||"").indexOf(code)>-1||String(products[j].id)===code){idx=j;break;}}}
 if(idx>=0){openP(idx);ehToast("تم العثور على المنتج ✅");}
 else ehToast("مفيش منتج بالباركود ده");
}
function wireBc(){var b=document.querySelector(".eh-search .bbtn");if(b&&!b.dataset.bc){b.dataset.bc="1";b.onclick=function(){ehScan();};}}
setInterval(wireBc,500);
})();
(function(){
function tok(){return localStorage.getItem('etok')||''}
function uInfo(){try{return JSON.parse(localStorage.getItem('euser')||'null')}catch(e){return null}}
function hdr(){return {'Content-Type':'application/json','x-auth-token':tok()}}
function ensureModal(){if(document.getElementById('authModal'))return;
var m=document.createElement('div');m.id='authModal';m.className='auth-ovl';
m.innerHTML='<div class="auth-card"><button class="auth-x" onclick="authClose()">✕</button><div class="auth-tabs"><button id="atLogin" class="on" onclick="authTab(\'login\')">تسجيل دخول</button><button id="atReg" onclick="authTab(\'reg\')">إنشاء حساب</button></div><div id="authBody"></div><p class="auth-msg" id="authMsg"></p></div>';
document.body.appendChild(m);}
window.authOpen=function(tab){ensureModal();document.getElementById('authModal').style.display='flex';authTab(tab||'login')};
window.authClose=function(){var m=document.getElementById('authModal');if(m)m.style.display='none'};
window.authTab=function(t){var L=document.getElementById('atLogin'),R=document.getElementById('atReg');L.classList.toggle('on',t==='login');R.classList.toggle('on',t==='reg');document.getElementById('authMsg').textContent='';
var b=document.getElementById('authBody');
if(t==='login'){b.innerHTML='<label>رقم الهاتف أو الإيميل</label><input id="liC"><label>كلمة السر</label><input id="liP" type="password"><button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="doLogin()">دخول</button><p style="text-align:center;margin-top:10px;font-size:.8rem">معندكش حساب؟ <a href="#" onclick="authTab(\'reg\');return false" style="color:var(--p);font-weight:700">إنشاء حساب</a></p>';}
else{b.innerHTML='<label>الاسم</label><input id="rgN"><label>رقم الهاتف أو الإيميل</label><input id="rgC"><label>كلمة السر (6+ أحرف)</label><input id="rgP" type="password"><button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="doReg()">إنشاء الحساب</button>';}};
function msg(s,ok){var e=document.getElementById('authMsg');if(e){e.textContent=s;e.style.color=ok?'#16a34a':'#dc2626'}}
window.doLogin=function(){fetch('/api/auth/login',{method:'POST',headers:hdr(),body:JSON.stringify({contact:document.getElementById('liC').value,password:document.getElementById('liP').value})}).then(function(r){return r.json()}).then(function(d){if(d.ok){localStorage.setItem('etok',d.token);localStorage.setItem('euser',JSON.stringify(d.user));authClose();authRender();ehToast('أهلاً '+d.user.name+' 👋')}else msg(d.error,false)})};
window.doReg=function(){fetch('/api/auth/register',{method:'POST',headers:hdr(),body:JSON.stringify({name:document.getElementById('rgN').value,contact:document.getElementById('rgC').value,password:document.getElementById('rgP').value})}).then(function(r){return r.json()}).then(function(d){if(d.ok){localStorage.setItem('etok',d.token);localStorage.setItem('euser',JSON.stringify(d.user));authClose();authRender();ehToast('تم إنشاء حسابك ✅')}else msg(d.error,false)})};
window.authLogout=function(){fetch('/api/auth/logout',{method:'POST',headers:hdr()}).then(function(){localStorage.removeItem('etok');localStorage.removeItem('euser');authRender();ehToast('تم تسجيل الخروج')})};
function authRender(){var p=document.getElementById('p-profile');if(!p)return;
var box=document.getElementById('authBox');if(!box){box=document.createElement('div');box.id='authBox';p.insertBefore(box,p.firstChild)}
var u=uInfo();
if(!tok()||!u){box.innerHTML='<div class="auth-inline"><b>👤 سجّل دخولك أو اعمل حساب جديد</b><p style="color:var(--mut);font-size:.8rem;margin:6px 0">عشان تتابع طلباتك ورصيدك</p><div class="row"><button class="btn btn-primary" onclick="authOpen(\'login\')">تسجيل دخول</button><button class="btn btn-ghost" onclick="authOpen(\'reg\')">إنشاء حساب</button></div></div>';}
else{box.innerHTML='<div class="auth-inline"><b>أهلاً '+u.name+' 👋</b><p style="color:var(--mut);font-size:.8rem;margin:6px 0">'+u.contact+' • رصيدك '+(u.balance||0)+' ج.م</p><button class="btn btn-ghost" onclick="authLogout()">تسجيل خروج</button></div>';}}
if(tok()){fetch('/api/auth/me',{headers:hdr()}).then(function(r){return r.json()}).then(function(d){if(!d.logged){localStorage.removeItem('etok');localStorage.removeItem('euser')}})}
setInterval(authRender,1500);
})();
(function(){
/* === الإشعارات === */
function ensureNotif(){if(document.getElementById('ehNotif'))return;
var p=document.createElement('div');p.id='ehNotif';p.style.cssText='position:fixed;top:64px;right:10px;left:10px;max-width:360px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.25);z-index:220;display:none;padding:14px';
p.innerHTML='<b style="font-size:.9rem">🔔 الإشعارات</b><div id="ehNotifList" style="margin-top:10px"></div>';
document.body.appendChild(p);}
function renderNotif(){var l=[{t:'تم شحن طلبك #1042',d:'منذ ساعة'},{t:'عمولة جديدة +45 ج.م',d:'منذ 3 ساعات'},{t:'منتج جديد متاح للتسويق',d:'أمس'}];
document.getElementById('ehNotifList').innerHTML=l.map(function(n){return '<div style="border:1px solid #eee;border-radius:12px;padding:10px;margin-bottom:8px"><b style="font-size:.8rem">'+n.t+'</b><div style="color:#888;font-size:.68rem">'+n.d+'</div></div>';}).join('');}
window.ehNotifToggle=function(){ensureNotif();var p=document.getElementById('ehNotif');var open=p.style.display==='block';p.style.display=open?'none':'block';if(!open)renderNotif();};
function wireBell(){var b=document.querySelector('.eh-bell');if(b&&!b.dataset.nt){b.dataset.nt='1';b.onclick=function(e){e.stopPropagation();ehNotifToggle();};}}
/* === خصوصية: المسجّل يشوف بياناته هو بس === */
function isMember(){return !!localStorage.getItem('etok')}
function gate(){
 if(!isMember())return;
 var op=document.getElementById('p-orders');
 if(op&&op.classList.contains('active')){var ol=document.getElementById('oList');if(ol){ol.innerHTML='<div style="text-align:center;padding:50px 0;color:#888">📦 لا توجد طلبات بعد<br><small style="color:#aaa">طلباتك هتظهر هنا أول ما تبيع</small></div>';}}
 var pp=document.getElementById('p-profile');
 if(pp&&pp.classList.contains('active')){var sg=pp.querySelector('.stat-grid');if(sg){var u=null;try{u=JSON.parse(localStorage.getItem('euser'))}catch(e){}
 sg.innerHTML='<div class="stat"><div class="l">رصيدك</div><div class="v">'+((u&&u.balance)||0)+' ج.م</div></div><div class="stat"><div class="l">طلباتك</div><div class="v">0</div></div>';}}
}
setInterval(function(){wireBell();gate();},800);
})();

(function(){document.addEventListener("click",function(e){var b=e.target.closest("[data-p=orders],[data-p=profile]");if(b&&localStorage.getItem("etok")){var ol=document.getElementById("oList");if(ol)ol.innerHTML="";}});})();
(function(){function ping(){var t=localStorage.getItem('etok');if(t)fetch('/api/auth/ping',{method:'POST',headers:{'x-auth-token':t}})}if(localStorage.getItem('etok')){ping();setInterval(ping,30000)}})();
(function(){
function act(a){var t=localStorage.getItem('etok');if(!t)return;fetch('/api/auth/ping',{method:'POST',headers:{'Content-Type':'application/json','x-auth-token':t},body:JSON.stringify({action:a})}).catch(function(){});}
function cur(){var a=document.querySelector('.page.active');return a?a.id.replace('p-',''):''}
document.addEventListener('click',function(e){
 if(e.target.closest('.card'))act('بيشوف المنتجات');
 else if(e.target.closest('[data-p]'))act('في صفحة '+(e.target.closest('[data-p]').getAttribute('data-p')||''));
 else if(e.target.closest('button'))act('بيستخدم '+cur());
},true);
setInterval(function(){if(localStorage.getItem('etok'))act('نشط في '+cur())},15000);
})();
(function(){fetch('/api/admin/settings').then(function(r){return r.json()}).then(function(s){
 if(s.name){var l=document.querySelector('.eh-logo');if(l)l.textContent=s.name+' 💰';document.title=s.name;}
 if(s.announcement){var h=document.querySelector('.eh-hero h1, .eh-hero');if(h)h.innerHTML=s.announcement;}
}).catch(function(){});})();
(function(){var loaded=false;
function loadOS(){if(loaded)return;loaded=true;
 fetch('/api/onesignal/config').then(function(r){return r.json()}).then(function(c){
  var APPID=c.appId||'f283c3ca-8c41-49fe-800d-7a174920696d';
  window.OneSignalDeferred=window.OneSignalDeferred||[];
  var s=document.createElement('script');s.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';s.async=true;
  s.onload=function(){OneSignalDeferred.push(function(OneSignal){
   OneSignal.init({appId:APPID,notifyButton:false,autoResubscribe:true}).then(function(){return OneSignal.Slidedown.promptPush()}).then(function(){return OneSignal.getUser()}).then(function(u){
    var id=u&&u.getPushSubscription?u.getPushSubscription().id:null;
    if(id)fetch('/api/notifications/register',{method:'POST',headers:{'Content-Type':'application/json','x-auth-token':localStorage.getItem('etok')||''},body:JSON.stringify({playerId:id})});
   }).catch(function(){});
  });};
  document.head.appendChild(s);
 }).catch(function(){});}
function maybe(){if(localStorage.getItem('etok'))loadOS();}
document.addEventListener('click',function(){maybe()},{once:true});
setInterval(maybe,6000);
var _ol=window.authLogout;window.authLogout=function(){fetch('/api/notifications/unlink',{method:'POST',headers:{'x-auth-token':localStorage.getItem('etok')||''}}).then(function(){if(_ol)_ol()});};
})();
(function(){
window.AppState={user:null};
function setSess(a,r,u){if(a)localStorage.setItem('etok',a);if(r)localStorage.setItem('ertok',r);if(u){localStorage.setItem('euser',JSON.stringify(u));AppState.user=u}}
window.authClear=function(){localStorage.removeItem('etok');localStorage.removeItem('ertok');localStorage.removeItem('euser');AppState.user=null};
window.authRefresh=function(cb){var r=localStorage.getItem('ertok');if(!r){authClear();return cb&&cb(false)}
fetch('/api/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh:r})}).then(function(x){return x.json()}).then(function(d){if(d.ok){setSess(d.access,d.refresh,d.user);cb&&cb(true)}else{authClear();cb&&cb(false)}}).catch(function(){cb&&cb(false)})};
fetch('/api/auth/me',{headers:{'x-auth-token':localStorage.getItem('etok')||''}}).then(function(r){if(r.status===401){authRefresh()}return r.json()}).then(function(d){if(d&&d.logged){AppState.user=d.user;localStorage.setItem('euser',JSON.stringify(d.user))}else if(d&&d.banned){authClear()}}).catch(function(){});
setInterval(function(){if(localStorage.getItem('etok'))authRefresh()},20*60*1000);
/* حراسة الصفحات الخاصة */
function guard(){var t=localStorage.getItem('etok');
['p-orders','p-withdraw','p-profile','p-support'].forEach(function(id){var p=document.getElementById(id);if(!p)return;var g=p.querySelector('.authgate');
if(!t){if(!g){g=document.createElement('div');g.className='authgate';g.style.cssText='position:absolute;inset:0;background:#f6f8f7;z-index:50;display:flex;align-items:center;justify-content:center';g.innerHTML='<div style="text-align:center">🔒<br><b>سجّل دخولك أولاً</b><div style="margin-top:12px"><button class="btn btn-primary" onclick="authOpen(\'login\')">تسجيل دخول</button></div></div>';p.style.position='relative';p.appendChild(g)}}
else if(g)g.remove();});}
setInterval(guard,900);
/* إزالة الـ Loader بعد تجهيز الواجهة */
setTimeout(function(){var s=document.getElementById('splash');if(s)s.remove()},800);
})();
window.authOpen=function(){location.href='/login'};


function openFilterSheet(){
 var ex=document.getElementById('fsheet');if(ex){ex.remove();return;}
 var cats=['الكل','إلكترونيات','أطفال','منزل ومطبخ','جمال وعناية','أخرى'];
 var sh=document.createElement('div');sh.id='fsheet';
 sh.style.cssText='position:fixed;bottom:0;right:0;left:0;background:#fff;border-radius:22px 22px 0 0;padding:18px 16px 26px;z-index:9999;box-shadow:0 -12px 40px rgba(0,0,0,.25)';
 sh.innerHTML='<h3 style="margin-bottom:12px;font-size:1rem">🎛️ فلتر المنتجات</h3>'+cats.map(function(cc){return '<button data-c="'+cc+'" style="display:block;width:100%;margin:6px 0;padding:13px;border-radius:14px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:700;font-size:.85rem">'+cc+'</button>'}).join('');
 sh.querySelectorAll('button').forEach(function(b){b.onclick=function(){applyCat(b.getAttribute('data-c'));};});
 document.body.appendChild(sh);
}
function applyCat(cc){
 var sh=document.getElementById('fsheet');if(sh)sh.remove();
 document.querySelectorAll('button').forEach(function(el){
   var tx=(el.textContent||'').trim();
   if(tx.indexOf(cc)>-1&&tx.length<cc.length+8){el.click();}
 });
}

window.__filterUser=0;
if(typeof openFilterSheet==='function'){var _ofs=openFilterSheet;openFilterSheet=function(){window.__filterUser=1;_ofs();};}
document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){var s=document.getElementById('fsheet');if(s&&!window.__filterUser)s.remove();},400);});
