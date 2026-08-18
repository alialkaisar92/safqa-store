(function(){
window.ehToast=function(m){var d=document.createElement("div");d.className="eh-toast";d.textContent=m;document.body.appendChild(d);setTimeout(function(){d.remove()},2200);};
function header(){return;var h=document.querySelector(".header");if(!h||h.dataset.eh)return;h.dataset.eh="1";
h.innerHTML='<div class="eh-brand"><span class="eh-logo">Rab7na 💰</span><small>منصة التسويق بالعمولة</small></div>'
+'<button class="eh-profile" onclick="go(\'account\')"><span class="eh-pname">أحمد محمد<small>✔ مسوق نشط</small></span><span class="eh-av">👤</span></button>'
+'<button class="eh-cartb" onclick="go(\'cart\')">🛒<i>0</i></button>'
+'<button class="eh-bell" onclick="go(\'account\')">🔔<i>3</i></button>';}
function wallet(){}
function hero(){}
function search(){}
var IC={"الكل":"🛍️","أخرى":"📦","أطفال":"🧸","إلكترونيات":"📱","منزل":"🏠","جمال":"💄","أزياء":"👗","رياضة":"⚽"};
function cats(){}
function sechead(){}
function stats(){}
function rebuild(){}
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
var storePendingEmail='',storeResendTimer=null,storeResendUntil=0;
function tok(){return localStorage.getItem('etok')||''}
function uInfo(){try{return JSON.parse(localStorage.getItem('euser')||'null')}catch(e){return null}}
function hdr(){return {'Content-Type':'application/json','x-auth-token':tok()}}
function ensureModal(){if(document.getElementById('authModal'))return;
var m=document.createElement('div');m.id='authModal';m.className='auth-ovl';
m.innerHTML='<div class="auth-card"><button class="auth-x" onclick="authClose()" aria-label="إغلاق">×</button><div class="auth-brand"><span>ر</span><div><b>rab7na</b><small>منصة التسويق بالعمولة</small></div></div><div class="auth-tabs"><button id="atLogin" class="on" onclick="authTab(\'login\')">تسجيل الدخول</button><button id="atReg" onclick="authTab(\'reg\')">إنشاء حساب</button></div><div id="authBody"></div><p class="auth-msg" id="authMsg"></p><div class="auth-wa-row"><div id="authWaWelcome" class="auth-wa-welcome"><button type="button" class="auth-wa-close" onclick="closeAuthWaWelcome()" aria-label="إغلاق رسالة الترحيب">×</button><b>أهلًا بك في rab7na</b><span>تحتاج مساعدة في التسجيل؟ نحن هنا لمساعدتك.</span></div><a id="authWhatsapp" class="auth-whatsapp" href="https://wa.me/20113132636?text=%D9%85%D8%B1%D8%AD%D8%A8%D9%8B%D8%A7%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%AA%D8%B3%D8%AC%D9%8A%D9%84" target="_blank" rel="noopener noreferrer" aria-label="التواصل عبر واتساب">تحتاج مساعدة؟ تواصل معنا عبر واتساب <bdi>01131332636</bdi></a></div><div class="auth-foot">آمن وسهل — ابدأ في دقائق</div></div>';
document.body.appendChild(m);}
window.authOpen=function(tab){ensureModal();document.getElementById('authModal').style.display='flex';authTab(tab||'login')};
window.authClose=function(){var m=document.getElementById('authModal');if(m)m.style.display='none'};
function storeGoogle(){var box=document.getElementById('storeGoogle');if(!box)return;fetch('/api/auth/google-config').then(function(r){return r.json()}).then(function(d){var id=d.clientId||'';if(!id){box.innerHTML='<div class="google-off">تسجيل Google غير متاح حاليًا</div>';return;}if(!window.google||!google.accounts||!google.accounts.id){setTimeout(storeGoogle,250);return;}google.accounts.id.initialize({client_id:id,callback:storeGoogleDone,auto_select:false,cancel_on_tap_outside:true,use_fedcm_for_prompt:true});box.innerHTML='';google.accounts.id.renderButton(box,{theme:'outline',size:'large',width:330,text:'continue_with',shape:'rectangular',logo_alignment:'center'});}).catch(function(){box.innerHTML='<div class="google-off">تعذر تحميل تسجيل Google</div>'})}
function storeGoogleDone(response){msg('جارٍ التحقق من Google…',true);fetch('/api/auth/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential:response.credential})}).then(function(r){return r.json()}).then(function(d){if(d.ok){localStorage.setItem('etok',d.token);if(d.refresh)localStorage.setItem('ertok',d.refresh);localStorage.setItem('euser',JSON.stringify(d.user));authClose();authRender();ehToast('أهلاً '+d.user.name+' 👋')}else msg(d.error||'تعذر تسجيل الدخول عبر Google',false)}).catch(function(){msg('تعذر الاتصال بالخادم',false)})}
window.closeAuthWaWelcome=function(){var e=document.getElementById('authWaWelcome');if(e)e.style.display='none'};window.authTab=function(t){var L=document.getElementById('atLogin'),R=document.getElementById('atReg');L.classList.toggle('on',t==='login');R.classList.toggle('on',t==='reg');var w=document.getElementById('authWaWelcome');if(w&&t==='reg')w.style.display='block';document.getElementById('authMsg').textContent='';
var b=document.getElementById('authBody');
if(t==='login'){var wa=document.getElementById('authWhatsapp');if(wa)wa.style.display='none';b.innerHTML='<div class="auth-google" id="storeGoogle"></div><div class="auth-or">أو باستخدام بياناتك</div><label>البريد أو رقم الهاتف أو اسم المستخدم</label><input id="liC" autocomplete="username" placeholder="أدخل بريدك أو رقم هاتفك"><label>كلمة المرور</label><input id="liP" type="password" autocomplete="current-password" placeholder="أدخل كلمة المرور"><button class="auth-submit" onclick="doLogin()">تسجيل الدخول</button><p class="auth-help"><span onclick="authTab(\'reg\')">ليس لديك حساب؟ إنشاء حساب جديد</span></p>'}
else{var wa=document.getElementById('authWhatsapp');if(wa)wa.style.display='flex';b.innerHTML='<div class="auth-google" id="storeGoogle"></div><div class="auth-or">أو باستخدام بياناتك</div><label>البريد الإلكتروني</label><input id="rgE" type="email" autocomplete="email" placeholder="name@example.com"><label>رقم الموبايل</label><input id="rgPh" type="tel" inputmode="numeric" autocomplete="tel" placeholder="01xxxxxxxxx"><label>اسم المستخدم</label><input id="rgU" autocomplete="username" placeholder="مثال: ahmed_2026"><label>كلمة المرور <small>(6 أحرف على الأقل)</small></label><input id="rgP" type="password" autocomplete="new-password" placeholder="أنشئ كلمة مرور قوية"><label>إعادة كتابة كلمة المرور</label><input id="rgP2" type="password" autocomplete="new-password" placeholder="أعد كتابة كلمة المرور"><button class="auth-submit" onclick="doReg()">إنشاء الحساب وإرسال الرمز</button><p class="auth-help">سيصلك رمز من 6 أرقام على بريدك لتفعيل الحساب.</p>';}storeGoogle();};
function msg(s,ok){var e=document.getElementById('authMsg');if(e){e.textContent=s;e.style.color=ok?'#16a34a':'#b42318'}}
window.doLogin=function(){var c=document.getElementById('liC'),p=document.getElementById('liP');if(!c||!p||!c.value.trim()||!p.value)return msg('اكتب بيانات الدخول أولًا',false);fetch('/api/auth/login',{method:'POST',headers:hdr(),body:JSON.stringify({contact:c.value.trim(),username:c.value.trim(),password:p.value})}).then(function(r){return r.json()}).then(function(d){if(d.ok){localStorage.setItem('etok',d.token);if(d.refresh)localStorage.setItem('ertok',d.refresh);localStorage.setItem('euser',JSON.stringify(d.user));authClose();authRender();ehToast('أهلاً '+d.user.name+' 👋')}else msg(d.error||'بيانات الدخول غير صحيحة',false)}).catch(function(){msg('تعذر الاتصال بالخادم',false)})};
window.doReg=function(){var e=document.getElementById('rgE'),ph=document.getElementById('rgPh'),u=document.getElementById('rgU'),p=document.getElementById('rgP'),p2=document.getElementById('rgP2');var email=e&&e.value.trim().toLowerCase(),phone=ph&&ph.value.trim(),username=u&&u.value.trim();if(!email||!phone||!username||!p||!p2||!p.value||!p2.value)return msg('أكمل بيانات التسجيل كلها أولًا',false);if(!/^\\S+@\\S+\\.\\S+$/.test(email))return msg('اكتب بريدًا إلكترونيًا صحيحًا',false);if(!/^01\\d{9}$/.test(phone))return msg('رقم الموبايل يجب أن يكون 11 رقمًا ويبدأ بـ 01',false);if(p.value.length<6)return msg('كلمة المرور يجب أن تكون 6 أحرف على الأقل',false);if(p.value!==p2.value)return msg('كلمتا المرور غير متطابقتين',false);var b=document.querySelector('.auth-submit');if(b){b.disabled=true;b.textContent='جاري إرسال الرمز...'}fetch('/api/auth/register',{method:'POST',headers:hdr(),body:JSON.stringify({email:email,phone:phone,username:username,name:username,display_name:username,password:p.value,password2:p2.value})}).then(function(r){return r.json()}).then(function(d){if(d.verificationRequired){storePendingEmail=d.email||email;storeVerifyForm(d.message||'تم إرسال رمز التحقق إلى بريدك')}else if(d.ok){localStorage.setItem('etok',d.token);if(d.refresh)localStorage.setItem('ertok',d.refresh);localStorage.setItem('euser',JSON.stringify(d.user));authClose();authRender();ehToast('تم إنشاء حسابك ✅')}else{msg(d.message||d.error||'تعذر إنشاء الحساب',false);if(d.remainingSec){storeStartCountdown(d.remainingSec)}}}).catch(function(){msg('تعذر الاتصال بالخادم',false)}).finally(function(){if(b){b.disabled=false;b.textContent='إنشاء الحساب وإرسال الرمز'}})};
function storeStartCountdown(seconds){clearInterval(storeResendTimer);storeResendUntil=Date.now()+(Number(seconds||60)*1000);var b=document.getElementById('storeResendBtn');function tick(){var left=Math.max(0,Math.ceil((storeResendUntil-Date.now())/1000));if(!b)return;if(left){b.disabled=true;b.textContent='إعادة الإرسال بعد '+left+' ثانية'}else{b.disabled=false;b.textContent='إعادة إرسال الرمز';clearInterval(storeResendTimer)}}tick();storeResendTimer=setInterval(tick,1000)}
function storeVerifyForm(note){var b=document.getElementById('authBody');if(!b)return;b.innerHTML='<div class="verify-icon">✉</div><h3 class="verify-title">فعّل حسابك</h3><p class="verify-note">'+note+'<br><b>'+storePendingEmail+'</b></p><label>رمز التحقق</label><input id="storeCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000"><button class="auth-submit" onclick="storeVerify()">تفعيل الحساب</button><button id="storeResendBtn" class="auth-resend" onclick="storeResend()">إعادة الإرسال</button><p class="auth-help">الرمز صالح 10 دقائق. يمكنك طلب رمز جديد بعد دقيقة.</p>';msg('');storeStartCountdown();}
window.storeVerify=function(){var c=document.getElementById('storeCode');var code=c&&c.value.trim();if(!/^\\d{6}$/.test(code))return msg('اكتب الرمز المكوّن من 6 أرقام',false);fetch('/api/auth/email/verify',{method:'POST',headers:hdr(),body:JSON.stringify({email:storePendingEmail,code:code})}).then(function(r){return r.json()}).then(function(d){if(d.ok){localStorage.setItem('etok',d.token);if(d.refresh)localStorage.setItem('ertok',d.refresh);localStorage.setItem('euser',JSON.stringify(d.user));authClose();authRender();ehToast('تم تفعيل حسابك بنجاح ✅')}else msg(d.error||'رمز التحقق غير صحيح',false)}).catch(function(){msg('تعذر الاتصال بالخادم',false)})};
window.storeResend=function(){var b=document.getElementById('storeResendBtn');if(b&&b.disabled)return;if(b){b.disabled=true;b.textContent='جاري الإرسال...'}msg('جاري إرسال رمز جديد...',true);fetch('/api/auth/email/resend',{method:'POST',headers:hdr(),body:JSON.stringify({email:storePendingEmail})}).then(function(r){return r.json()}).then(function(d){msg(d.message||d.error||'تعذر إعادة إرسال الرمز',!!d.ok);if(d.ok)storeStartCountdown(60);else if(d.remainingSec)storeStartCountdown(d.remainingSec);else if(b){b.disabled=false;b.textContent='إعادة إرسال الرمز'}}).catch(function(){msg('تعذر الاتصال بالخادم',false);if(b){b.disabled=false;b.textContent='إعادة إرسال الرمز'}})};
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
function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]})}
function renderNotif(){var list=document.getElementById('ehNotifList');if(!list)return;var t=localStorage.getItem('etok')||'';if(!t){list.innerHTML='<div style="color:#888;font-size:.78rem;padding:10px 0">سجّل الدخول لمتابعة تحديثات الطلبات والمنتجات.</div>';return;}list.innerHTML='<div style="color:#888;font-size:.78rem;padding:10px 0">جاري تحميل الإشعارات...</div>';fetch('/api/notifications',{headers:{'x-auth-token':t}}).then(function(r){return r.json()}).then(function(d){var l=d.notifications||[];if(!l.length){list.innerHTML='<div style="color:#888;font-size:.78rem;padding:10px 0">لا توجد إشعارات جديدة.</div>';return;}list.innerHTML=l.map(function(n){return '<button type="button" data-notif-id="'+esc(n.id)+'" style="display:block;width:100%;text-align:right;border:1px solid '+(n.read?'#eee':'#b7e4c7')+';background:'+(n.read?'#fff':'#f0fff5')+';border-radius:12px;padding:10px;margin-bottom:8px;font-family:inherit;cursor:pointer"><b style="font-size:.8rem">'+esc(n.title)+'</b><div style="color:#666;font-size:.68rem;margin-top:3px">'+esc(n.body)+'</div><div style="color:#999;font-size:.64rem;margin-top:4px">'+esc(n.createdAt||'')+'</div></button>';}).join('')+'<button type="button" id="markNotifRead" style="width:100%;border:0;background:#e8f5ed;color:#176b43;border-radius:10px;padding:8px;font-family:inherit;font-weight:700">تعليم الكل كمقروء</button>';list.querySelectorAll('[data-notif-id]').forEach(function(b){b.onclick=function(){fetch('/api/notifications/read',{method:'POST',headers:{'Content-Type':'application/json','x-auth-token':t},body:JSON.stringify({id:b.getAttribute('data-notif-id')})}).then(renderNotif)}});var all=document.getElementById('markNotifRead');if(all)all.onclick=function(){fetch('/api/notifications/read',{method:'POST',headers:{'Content-Type':'application/json','x-auth-token':t},body:'{}'}).then(renderNotif)};}).catch(function(){list.innerHTML='<div style="color:#b33;font-size:.78rem;padding:10px 0">تعذر تحميل الإشعارات حالياً.</div>';});}
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
(function(){var loaded=false, lastUnread=0;
 function playNoticeSound(){try{
  var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;var c=new AC(),o=c.createOscillator(),g=c.createGain();
  o.type='sine';o.frequency.setValueAtTime(660,c.currentTime);o.frequency.exponentialRampToValueAtTime(990,c.currentTime+.12);
  g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.08,c.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.42);
  o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.45);setTimeout(function(){try{c.close()}catch(e){}},600);
 }catch(e){}}
 window.rab7naNoticeSound=playNoticeSound;
 function registerSubscription(OneSignal){
  var token=localStorage.getItem('etok')||'', user=JSON.parse(localStorage.getItem('euser')||'null');
  if(!token)return Promise.resolve();
  var uid=user&&user.id?String(user.id):'';
  var p=Promise.resolve();
  if(uid&&OneSignal.login)p=p.then(function(){return OneSignal.login(uid).catch(function(){})});
  return p.then(function(){return OneSignal.getUser()}).then(function(u){
   var sub=u&&u.getPushSubscription?u.getPushSubscription():null,id=sub&&sub.id;
   if(!id)return null;
   return fetch('/api/notifications/register',{method:'POST',headers:{'Content-Type':'application/json','x-auth-token':token},body:JSON.stringify({playerId:id,externalId:uid})});
  });
 }
 function loadOS(){if(loaded)return;loaded=true;
  fetch('/api/onesignal/config').then(function(r){return r.json()}).then(function(c){
   var APPID=c.appId||'f283c3ca-8c41-49fe-800d-7a174920696d';
   if(!APPID)return;
   window.OneSignalDeferred=window.OneSignalDeferred||[];
   var s=document.createElement('script');s.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';s.async=true;
   s.onload=function(){OneSignalDeferred.push(function(OneSignal){
    OneSignal.init({appId:APPID,notifyButton:false,autoResubscribe:true,serviceWorkerPath:'/sw.js',serviceWorkerParam:{scope:'/'}})
    .then(function(){return OneSignal.Slidedown.promptPush()}).then(function(){return registerSubscription(OneSignal)}).catch(function(){});
   });};
   document.head.appendChild(s);
  }).catch(function(){});}
 function maybe(){}
 /* لا نطلب الإذن تلقائيًا؛ التهيئة تبدأ فقط من زر المستخدم. */
 function pollNotifications(){var t=localStorage.getItem('etok');if(!t)return;fetch('/api/notifications',{headers:{'x-auth-token':t}}).then(function(r){return r.json()}).then(function(d){
  var n=Number(d&&d.unread||0);if(lastUnread&&n>lastUnread)playNoticeSound();lastUnread=n;
 }).catch(function(){});}
 setInterval(pollNotifications,12000);pollNotifications();
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

/* rab7na push permission control: explicit user action */
(function(){
  var ready=false;
  function token(){return localStorage.getItem('etok')||'';}
  function showState(btn,msg,ok){if(btn){btn.textContent=msg;btn.disabled=false;btn.classList.toggle('is-ok',!!ok);}}
  function addButton(){
    if(document.getElementById('rab7naPushBtn'))return;
    var host=document.querySelector('.header')||document.querySelector('.topbar')||document.body;
    if(!host)return;
    var b=document.createElement('button');b.id='rab7naPushBtn';b.type='button';b.textContent='🔔 تفعيل الإشعارات';
    b.style.cssText='position:fixed;z-index:80;bottom:86px;right:14px;border:0;border-radius:999px;padding:12px 16px;background:#0f766e;color:#fff;font:700 13px inherit;box-shadow:0 8px 24px #0f766e44;cursor:pointer';
    b.onclick=enable;document.body.appendChild(b);update(b);
  }
  function update(btn){
    if(!btn)btn=document.getElementById('rab7naPushBtn');
    if(!btn)return;
    if(!token()){showState(btn,'🔔 سجّل الدخول لتفعيل الإشعارات',false);return;}
    if(window.Notification&&Notification.permission==='denied'){showState(btn,'⚙️ السماح من إعدادات المتصفح',false);return;}
    if(window.Notification&&Notification.permission==='granted')showState(btn,'✅ الإشعارات مفعّلة',true);
  }
  function withTimeout(p,ms){return Promise.race([p,new Promise(function(_,reject){setTimeout(function(){reject(Error('انتهت مهلة خدمة الإشعارات؛ حاول مرة أخرى'))},ms)})]);}
  function load(){
    if(window.__rab7naOSPromise)return window.__rab7naOSPromise;
    window.__rab7naOSPromise=withTimeout(fetch('/api/onesignal/config').then(function(r){return r.json()}).then(function(c){
      var appId=c&&c.appId;if(!appId)throw Error('خدمة الإشعارات غير مهيأة');
      return new Promise(function(resolve,reject){
        if(window.OneSignal&&typeof window.OneSignal.init==='function')return resolve(window.OneSignal);
        var done=false;
        function finish(OS){if(done)return;done=true;resolve(OS)}
        window.OneSignalDeferred=window.OneSignalDeferred||[];
        window.OneSignalDeferred.push(function(OS){finish(OS)});
        var s=document.querySelector('script[data-rab7na-os]')||document.querySelector('script[src*="OneSignalSDK.page.js"]');
        if(!s){s=document.createElement('script');s.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';s.async=true;s.dataset.rab7naOs='1';s.onerror=function(){reject(Error('تعذر تحميل خدمة الإشعارات'))};document.head.appendChild(s)}
        setTimeout(function(){if(!done)reject(Error('تعذر تشغيل خدمة الإشعارات'))},12000);
      }).then(function(OS){
        if(OS.__rab7naInitialized)return OS;
        var sw=window.navigator&&navigator.serviceWorker?navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(function(){return null}):Promise.resolve(null);
        return sw.then(function(){return OS.init({appId:appId,notifyButton:{enable:false},autoResubscribe:true,serviceWorkerPath:'/sw.js',serviceWorkerParam:{scope:'/'}})}).then(function(){OS.__rab7naInitialized=true;return OS});
      });
    }),15000).catch(function(e){window.__rab7naOSPromise=null;throw e});
    return window.__rab7naOSPromise;
  }
  function enable(){
    var b=document.getElementById('rab7naPushBtn');if(!b)return;
    if(!token()){showState(b,'سجّل الدخول أولًا',false);return;}
    b.disabled=true;b.textContent='⏳ جاري التفعيل...';
    withTimeout(load().then(function(OS){
      if(OS.Slidedown&&OS.Slidedown.promptPush)return Promise.resolve(OS.Slidedown.promptPush()).then(function(){return OS});
      if(OS.User&&OS.User.PushSubscription&&OS.User.PushSubscription.optIn)return OS.User.PushSubscription.optIn().then(function(){return OS});
      return OS;
    }),20000).then(function(OS){
      var user=JSON.parse(localStorage.getItem('euser')||'null'),uid=user&&user.id?String(user.id):'';
      if(uid&&OS.login)return OS.login(uid).then(function(){return OS});return OS;
    }).then(function(OS){
      function readId(){
        var ps=OS.User&&OS.User.PushSubscription;
        return ps&&ps.id?String(ps.id):'';
      }
      function waitForId(left){
        var id=readId();
        if(id)return Promise.resolve(id);
        if(left<=0)return Promise.reject(Error('لم يتم السماح بعد'));
        return new Promise(function(resolve){setTimeout(resolve,500)}).then(function(){return waitForId(left-1)});
      }
      return waitForId(16).then(function(id){
        var eu=JSON.parse(localStorage.getItem('euser')||'null')||{};
        return fetch('/api/notifications/register',{method:'POST',headers:{'Content-Type':'application/json','x-auth-token':token()},body:JSON.stringify({playerId:id,externalId:eu.id||''})}).then(function(r){if(!r.ok)throw Error('تعذر تسجيل جهازك للإشعارات');return r});
      }).then(function(){showState(b,'✅ الإشعارات مفعّلة',true);if(window.rab7naNoticeSound)window.rab7naNoticeSound()});
    }).catch(function(e){showState(b,e&&e.message?e.message:'🔔 حاول التفعيل مرة أخرى',false)});
  }
  window.rab7naEnablePush=enable;
  setInterval(function(){addButton();update(document.getElementById('rab7naPushBtn'));},1200);setTimeout(function(){addButton();update(document.getElementById('rab7naPushBtn'));},500);
})();

/* Native Web Push fallback: يعمل داخل الموقع وخارجه دون الاعتماد على لوحة OneSignal */
(function(){
  function b64ToBytes(base64){
    var padding='='.repeat((4-base64.length%4)%4), raw=atob((base64+padding).replace(/-/g,'+').replace(/_/g,'/')), out=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i); return out;
  }
  function setNativeButton(btn,msg,ok){if(btn){btn.textContent=msg;btn.disabled=false;btn.classList.toggle('is-ok',!!ok);if(ok)btn.style.display='none';}}
  async function syncNativeSubscription(requestPermission){
    var btn=document.getElementById('rab7naPushBtn'), t=localStorage.getItem('etok')||'';
    if(!t)return false;
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){setNativeButton(btn,'المتصفح لا يدعم الإشعارات',false);return false;}
    if(Notification.permission==='denied'){setNativeButton(btn,'⚙️ السماح من إعدادات المتصفح',false);return false;}
    if(btn){btn.disabled=true;btn.textContent='⏳ جاري تفعيل الإشعارات...';}
    try{
      var keyRes=await fetch('/api/push/vapid-public-key',{cache:'no-store'}), key=await keyRes.json();
      if(!key.publicKey)throw Error('خدمة الإشعارات غير مهيأة بعد');
      var reg=await navigator.serviceWorker.register('/sw.js',{scope:'/'});
      var permission=Notification.permission;
      if(permission==='default' && requestPermission){permission=await Promise.race([Notification.requestPermission(),new Promise(function(_,reject){setTimeout(function(){reject(Error('افتح السماح من إعدادات المتصفح ثم حاول مرة أخرى'))},12000)})]);}
      if(permission!=='granted')throw Error('لم يتم السماح بالإشعارات من المتصفح');
      var sub=await reg.pushManager.getSubscription();
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(key.publicKey)});
      var r=await fetch('/api/notifications/register',{method:'POST',headers:{'Content-Type':'application/json','x-auth-token':t},body:JSON.stringify({subscription:sub.toJSON(),externalId:(JSON.parse(localStorage.getItem('euser')||'null')||{}).id||''})});
      if(!r.ok)throw Error('تعذر تسجيل جهازك للإشعارات');
      localStorage.setItem('rab7naPushEnabled','1');
      setNativeButton(btn,'✅ الإشعارات مفعّلة',true);
      return true;
    }catch(e){if(btn){btn.disabled=false;btn.style.display='';}setNativeButton(btn,e&&e.message?e.message:'تعذر تفعيل الإشعارات',false);return false;}
  }
  async function enableNative(){return syncNativeSubscription(true);}
  window.rab7naEnableNativePush=enableNative;
  setInterval(function(){var b=document.getElementById('rab7naPushBtn');if(!b)return;b.onclick=enableNative;var t=localStorage.getItem('etok')||'';if(!t)setNativeButton(b,'🔔 سجّل الدخول لتفعيل الإشعارات',false);else if(window.Notification&&Notification.permission==='granted'){syncNativeSubscription(false);}else if(window.Notification&&Notification.permission==='denied')setNativeButton(b,'⚙️ السماح من إعدادات المتصفح',false);else if(!b.disabled)setNativeButton(b,'🔔 تفعيل الإشعارات',false);},1500);
  setTimeout(function(){if(window.Notification&&Notification.permission==='granted'&&localStorage.getItem('etok'))syncNativeSubscription(false);},2500);
})();
