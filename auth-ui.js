/* auth-ui.js — نظيف بالكامل: قائمة + ملف شخصي + حراسة + fallbacks */
(function(){
var W=window,D=document,TK='sq_user_token',US='sq_user';
function G(id){return D.getElementById(id);}
function E(s){return(s==null?'':String(s)).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function ck(t){try{document.cookie='sq_t='+encodeURIComponent(t)+';path=/;max-age='+(30*86400)+';SameSite=Lax';}catch(e){}}
function unck(){try{document.cookie='sq_t=;path=/;max-age=0';}catch(e){}}
W.SQ_USER=null;try{W.SQ_USER=JSON.parse(localStorage.getItem(US)||'null');}catch(e){}
function saveUser(u){W.SQ_USER=u;try{if(u)localStorage.setItem(US,JSON.stringify(u));else localStorage.removeItem(US);}catch(e){}}
function saveToken(t){try{if(t)localStorage.setItem(TK,t);else localStorage.removeItem(TK);}catch(e){}}
function hdr(){return {'Content-Type':'application/json','x-sq-token':localStorage.getItem(TK)||''};}
try{if(localStorage.getItem(TK))ck(localStorage.getItem(TK));}catch(e){}

function injectCSS(){if(G('auCSS'))return;var s=D.createElement('style');s.id='auCSS';s.textContent=
'.sa-acct-d{margin:14px 14px 6px;padding:14px;border-radius:18px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);position:relative}'+
'.sa-x{position:absolute;top:-2px;left:-2px;width:30px;height:30px;border-radius:9px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#cbd5d1;cursor:pointer;font-size:.9rem}'+
'.sa-acct-row{display:flex;align-items:center;gap:12px}'+
'.sa-acct-row .sa-av{width:44px;height:44px;border-radius:50%;background:linear-gradient(145deg,#14b8a6,#0a4f49);color:#fff;display:grid;place-items:center;font:900 1.15rem Cairo,sans-serif;flex-shrink:0;box-shadow:0 4px 12px -4px rgba(13,148,136,.7)}'+
'.sa-acct-meta{flex:1;min-width:0}'+
'.sa-acct-meta b{display:block;color:#eafff9;font:800 .94rem Cairo,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
'.sa-acct-meta small{display:block;color:#7fb3a8;font:600 .72rem Cairo,sans-serif;direction:ltr;text-align:right}'+
'.sa-acct-acts{display:flex;gap:8px;margin-top:12px}'+
'.sa-act{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px;border-radius:11px;background:rgba(94,234,212,.10);border:1px solid rgba(94,234,212,.18);color:#9ff3e3;font:700 .82rem Cairo,sans-serif;cursor:pointer}'+
'.sa-act.danger{background:rgba(239,68,68,.10);border-color:rgba(239,68,68,.22);color:#fca5a5}'+
'.sa-act:active{transform:scale(.97)}'+
'.sa-login-btn{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;margin-top:11px;padding:13px;border-radius:13px;background:linear-gradient(135deg,#14b8a6,#0d9488);border:none;color:#fff;font:800 .92rem Cairo,sans-serif;cursor:pointer;box-shadow:0 8px 20px -8px rgba(13,148,136,.7)}'+
'.sa-profile{margin:0 0 18px;background:#fff;border:1px solid rgba(15,118,110,.08);border-radius:22px;padding:22px 20px;box-shadow:0 12px 30px -18px rgba(16,32,29,.3);animation:saPrIn .45s cubic-bezier(.2,.85,.3,1.05) both}'+
'@keyframes saPrIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}'+
'.sa-pr-head{display:flex;align-items:center;gap:15px;padding-bottom:18px;border-bottom:1px dashed #e2e8e6;margin-bottom:18px}'+
'.sa-pr-head .sa-pr-av{width:64px;height:64px;border-radius:20px;background:linear-gradient(145deg,#14b8a6,#0a4f49);color:#fff;display:grid;place-items:center;font:900 1.8rem Cairo,sans-serif;box-shadow:0 10px 24px -10px rgba(13,148,136,.7);flex-shrink:0}'+
'.sa-pr-head h3{font:900 1.3rem Cairo,sans-serif;color:#0c2420;letter-spacing:-.4px}'+
'.sa-pr-head p{font:600 .8rem Cairo,sans-serif;color:#64748b;margin-top:3px}'+
'.sa-pr-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}'+
'@media(max-width:420px){.sa-pr-grid{grid-template-columns:1fr}}'+
'.sa-pr-card{background:#f8fafb;border:1px solid #eef2f1;border-radius:15px;padding:13px 14px;position:relative}'+
'.sa-pr-card .l{display:block;font:700 .7rem Cairo,sans-serif;color:#7a8a86;margin-bottom:5px}'+
'.sa-pr-card .v{display:block;font:800 .98rem Cairo,sans-serif;color:#0f2420;word-break:break-word}'+
'.sa-pr-card .v.mono{direction:ltr;text-align:right;color:#0F766E}'+
'.sa-pr-edit{position:absolute;top:11px;left:11px;background:#ecfdf5;border:1px solid #99f6e4;color:#0d9488;font:700 .68rem Cairo,sans-serif;padding:4px 10px;border-radius:8px;cursor:pointer}'+
'.sa-pr-edit:active{transform:scale(.94)}';
D.head.appendChild(s);}

function drawerEl(){return G('drawer')||D.querySelector('.drawer')||D.querySelector('aside[class*="drawer"]')||D.querySelector('div[class*="drawer"]');}
function renderDrawer(){try{var d=drawerEl();if(!d)return;var old=G('saAcctDrawer');if(old)old.remove();
 try{d.querySelectorAll('*').forEach(function(el){if(el===G('saAcctDrawer'))return;var tx=(el.textContent||'');if(el.children.length<=4&&/مسو[ّ]?ق معتمد|مسوق معتمد/.test(tx)&&el.querySelector&&(el.querySelector('button')||el.querySelector('[onclick*="close"]'))){el.style.display='none';}});}catch(e){}
 var el=D.createElement('div');el.id='saAcctDrawer';
 if(W.SQ_USER){var nm=W.SQ_USER.display_name||W.SQ_USER.username||'؟';el.className='sa-acct-d';
  el.innerHTML='<div class="sa-acct-row"><button class="sa-x" id="saXBtn" title="إغلاق">✕</button><div class="sa-av">'+E(nm.charAt(0).toUpperCase())+'</div><div class="sa-acct-meta"><b>'+E(nm)+'</b><small>@'+E(W.SQ_USER.username||'')+(W.SQ_USER.phone?' · '+E(W.SQ_USER.phone):'')+'</small></div></div><div class="sa-acct-acts"><button class="sa-act" id="saProfLink">👤 الملف الشخصي</button><button class="sa-act danger" id="saOutBtn">⏻ خروج</button></div>';}
 else{el.className='sa-acct-d';el.innerHTML='<div class="sa-acct-row"><button class="sa-x" id="saXBtn" title="إغلاق">✕</button><div class="sa-av">؟</div><div class="sa-acct-meta"><b>مرحباً بيك</b><small>سجّل دخولك عشان تبدأ</small></div></div><button class="sa-login-btn" id="saLoginBtn">🔐 تسجيل الدخول / إنشاء حساب</button>';}
 d.insertBefore(el,d.firstChild);
 var xb=G('saXBtn');if(xb)xb.onclick=closeDrawerSoft;var ob=G('saOutBtn');if(ob)ob.onclick=auLogout;var lb=G('saLoginBtn');if(lb)lb.onclick=function(){location.href='/login';};var pl=G('saProfLink');if(pl)pl.onclick=function(){closeDrawerSoft();if(W.go)W.go('account');};}catch(e){console.warn('[auth] drawer',e);}}
function closeDrawerSoft(){try{if(W.closeDrawer)W.closeDrawer();else{var d=drawerEl();if(d)d.classList.remove('open');var s=D.querySelector('.scrim');if(s)s.classList.remove('open');}}catch(e){}}

function accountPage(){return G('p-account')||G('v-account')||D.querySelector('[data-p="account"]')||D.querySelector('[data-v="account"]');}
function showAccount(){try{var pg=accountPage();if(!pg)return false;D.querySelectorAll('.page,[data-p],[data-v]').forEach(function(p){if(p!==pg){p.classList.add('hidden');p.style.display='none';}});pg.classList.remove('hidden');pg.style.display='';renderProfile();return true;}catch(e){console.warn('[auth] showAccount',e);return false;}}
function renderProfile(){try{var pg=accountPage();if(!pg)return;var el=G('saProfile');if(!el){el=D.createElement('div');el.id='saProfile';el.className='sa-profile';pg.insertBefore(el,pg.firstChild);}fillProfile(el);}catch(e){console.warn('[auth] profile',e);}}
function fillProfile(el){if(!W.SQ_USER){el.innerHTML='<div style="text-align:center;padding:30px;color:#64748b">سجّل دخولك أولاً</div>';return;}var u=W.SQ_USER;var nm=u.display_name||u.username||'؟';var role=(u.role==='admin'?'مدير المنصة':(u.role==='marketer'?'مسوّق معتمد':'عضو في سوقلي'));var joined='';try{if(u.created_at)joined=new Date(u.created_at).toLocaleDateString('ar-EG',{year:'numeric',month:'long'});}catch(e){}
 el.innerHTML='<div class="sa-pr-head"><div class="sa-pr-av">'+E(nm.charAt(0).toUpperCase())+'</div><div><h3>'+E(nm)+'</h3><p>ملفك الشخصي وبيانات حسابك</p></div></div><div class="sa-pr-grid"><div class="sa-pr-card"><span class="l">اسم المستخدم</span><span class="v mono">@'+E(u.username||'')+'</span></div><div class="sa-pr-card"><span class="l">الاسم الظاهر</span><span class="v" id="saPrName">'+E(nm)+'</span><button class="sa-pr-edit" id="saPrEdit">تعديل</button></div><div class="sa-pr-card"><span class="l">الموبايل</span><span class="v" id="saPrPhone">'+(u.phone?E(u.phone):'<span style="color:#cbd5d1">—</span>')+'</span><button class="sa-pr-edit" id="saPrContact">تعديل</button></div><div class="sa-pr-card"><span class="l">الإيميل</span><span class="v" id="saPrEmail">'+(u.email?E(u.email):'<span style="color:#cbd5d1">—</span>')+'</span></div><div class="sa-pr-card"><span class="l">نوع الحساب</span><span class="v">'+E(role)+'</span></div><div class="sa-pr-card"><span class="l">عضو منذ</span><span class="v">'+(joined?E(joined):'—')+'</span></div></div>';
 var eb=G('saPrEdit');if(eb)eb.onclick=editName;var cb=G('saPrContact');if(cb)cb.onclick=editContact;}
function editName(){try{var cur=(W.SQ_USER&&W.SQ_USER.display_name)||'';var nv=prompt('الاسم الظاهر الجديد:',cur);if(nv===null)return;nv=nv.trim();if(!nv||nv===cur)return;fetch('/api/auth/update',{method:'POST',headers:hdr(),body:JSON.stringify({display_name:nv,phone:(W.SQ_USER&&W.SQ_USER.phone)||'',email:(W.SQ_USER&&W.SQ_USER.email)||''})}).then(function(r){return r.json();}).then(function(j){if(j&&j.ok){saveUser(j.user);renderProfile();renderDrawer();alert('تم التحديث ✓');}else alert(j&&j.error||'فشل');}).catch(function(){alert('تعذّر الاتصال');});}catch(e){}}
function editContact(){try{var ph=prompt('رقم الموبايل:',(W.SQ_USER&&W.SQ_USER.phone)||'');if(ph===null)return;var em=prompt('البريد الإلكتروني:',(W.SQ_USER&&W.SQ_USER.email)||'');if(em===null)return;fetch('/api/auth/update',{method:'POST',headers:hdr(),body:JSON.stringify({display_name:(W.SQ_USER&&W.SQ_USER.display_name)||'',phone:ph.trim(),email:em.trim()})}).then(function(r){return r.json();}).then(function(j){if(j&&j.ok){saveUser(j.user);renderProfile();renderDrawer();alert('تم التحديث ✓');}else alert(j&&j.error||'فشل');}).catch(function(){alert('تعذّر الاتصال');});}catch(e){}}

var _go=W.go;
W.go=function(p){try{if(p==='account'){var ok=showAccount();return ok?1:(_go?_go(p):0);}if(p==='store'){setTimeout(renderDrawer,120);}}catch(e){}return _go?_go(p):0;};
var _od=W.openDrawer;if(typeof _od==='function'){W.openDrawer=function(){var r=_od.apply(this,arguments);setTimeout(renderDrawer,60);return r;};}

W.auLogout=async function(){try{await fetch('/api/auth/logout',{method:'POST',headers:hdr()});}catch(e){}saveToken(null);saveUser(null);unck();location.href='/login';};

async function refreshMe(){var t=localStorage.getItem(TK);if(!t)return false;try{var r=await fetch('/api/auth/me',{headers:hdr(),credentials:'include'});if(r.ok){var j=await r.json();saveUser(j.user);ck(t);return true;}saveToken(null);saveUser(null);unck();return false;}catch(e){return !!W.SQ_USER;}}
function maybeReturn(){try{var ret=localStorage.getItem('sq_ret');if(ret&&W.SQ_USER){localStorage.removeItem('sq_ret');setTimeout(function(){if(W.go)W.go(ret);},300);}}catch(e){}}

/* ===== شبكة أمان احتياطية ===== */
function fbH(){var tk='';try{tk=localStorage.getItem('sq_user_token')||'';}catch(e){}return {'Content-Type':'application/json','x-sq-token':tk};}
function fbCSS(){if(document.getElementById('fbCSS'))return;var s=document.createElement('style');s.id='fbCSS';s.textContent='.pm{position:fixed!important;inset:0!important;z-index:400!important;background:rgba(6,18,16,.55);backdrop-filter:blur(4px);display:flex!important;align-items:flex-end;justify-content:center;opacity:0;visibility:hidden;transition:.3s}.pm.show{opacity:1!important;visibility:visible!important}.pm-b{background:#fff;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;border-radius:24px 24px 0 0;padding:0 18px 26px;box-shadow:0 -20px 60px -20px rgba(0,0,0,.5);transform:translateY(30px);transition:.35s}.pm.show .pm-b{transform:none}.pm-b .fb-x{position:sticky;top:0;background:#fff;width:100%;display:flex;justify-content:space-between;align-items:center;padding:16px 2px 12px;border-bottom:1px solid #f1f5f9;font:900 1.05rem Cairo,sans-serif;color:#0f2420}.pm-b .fb-x button{width:38px;height:38px;border-radius:50%;background:#f1f5f9;border:none;font-size:1.3rem;cursor:pointer;color:#475569}.pm-b>img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:18px;background:#f1f5f9;margin:14px 0}.pm-b .fb-nm{font:900 1.2rem Cairo,sans-serif;color:#0f2420}.pm-b .fb-pr{font:900 1.5rem Cairo,sans-serif;color:#0F766E;margin:8px 0 16px}.pm-b .fb-add{width:100%;padding:15px;border:none;border-radius:16px;background:linear-gradient(135deg,#14b8a6,#0d9488);color:#fff;font:900 1.05rem Cairo,sans-serif;cursor:pointer;box-shadow:0 10px 26px -10px rgba(13,148,136,.6)}';document.head.appendChild(s);}
function fbModal(){fbCSS();if(document.getElementById('pm'))return;var h=document.createElement('div');h.innerHTML='<div class="pm" id="pm"><div class="pm-b"><div class="fb-x"><span>تفاصيل المنتج</span><button onclick="closeP()">×</button></div><img id="pm-img" src="" alt=""><div class="fb-nm" id="pm-name"></div><div class="fb-pr" id="pm-price"></div><button class="fb-add" id="btnAdd" onclick="addCart()">🛒 أضف إلى السلة</button></div></div>';document.body.appendChild(h.firstChild);}
function installFb(){if(W.__fbInstalled)return;W.__fbInstalled=true;W.__fbP=null;
 if(typeof W.openP!=='function'){W.openP=async function(i){try{if(!W.__fbP){var r=await fetch('/api/products',{headers:fbH(),credentials:'include'});W.__fbP=await r.json();}var c=W.__fbP[i];if(!c)return;W.__fbCur=c;fbModal();var im=document.getElementById('pm-img');if(im)im.src=c.image||'';var nm=document.getElementById('pm-name');if(nm)nm.textContent=c.name;var pr=document.getElementById('pm-price');if(pr)pr.textContent=Number(c.price).toLocaleString('ar-EG')+' ج.م';var pm=document.getElementById('pm');if(pm)pm.classList.add('show');document.body.style.overflow='hidden';}catch(e){console.warn('[fb openP]',e);}};}
 if(typeof W.closeP!=='function'){W.closeP=function(){var pm=document.getElementById('pm');if(pm)pm.classList.remove('show');document.body.style.overflow='';};}
 if(typeof W.addCart!=='function'){W.addCart=function(){if(!W.__fbCur)return;try{var cart=JSON.parse(localStorage.getItem('scart')||'[]');cart.push({id:W.__fbCur.id,name:W.__fbCur.name,price:W.__fbCur.price,basePrice:W.__fbCur.price,image:W.__fbCur.image,qty:1});localStorage.setItem('scart',JSON.stringify(cart));}catch(e){}if(W.updCC)try{W.updCC();}catch(e){}alert('تمت الإضافة للسلة ✓');W.closeP();};}
 if(typeof W.openChat!=='function'){W.openChat=function(){var s=document.getElementById('chatScreen');if(s){s.classList.add('open');document.body.style.overflow='hidden';fbChatRender();if(!W.__fbPoll)W.__fbPoll=setInterval(fbChatRender,3000);}};}
 if(typeof W.closeChat!=='function'){W.closeChat=function(){var s=document.getElementById('chatScreen');if(s)s.classList.remove('open');document.body.style.overflow='';if(W.__fbPoll){clearInterval(W.__fbPoll);W.__fbPoll=null;}};}
 if(typeof W.chatSend!=='function'){W.chatSend=async function(){var inp=document.getElementById('chatInput');if(!inp)return;var tx=inp.value.trim();if(!tx)return;inp.value='';try{await fetch('/api/chat/send',{method:'POST',headers:fbH(),credentials:'include',body:JSON.stringify({type:'text',text:tx})});fbChatRender();}catch(e){}};}
 if(typeof W.chatRender!=='function'){W.chatRender=fbChatRender;}
 console.log('[safe] fallbacks installed');}
async function fbChatRender(){var b=document.getElementById('chatBody');if(!b)return;try{var m=await(await fetch('/api/chat/messages',{headers:fbH(),credentials:'include'})).json();if(!Array.isArray(m))m=[];if(!m.length){b.innerHTML='<div class="chat-empty"><div class="ic">💬</div><p>ابدأ المحادثة</p></div>';return;}b.innerHTML=m.map(function(x){var c='';if(x.type==='image')c='<img src="'+x.media+'" alt="">';else if(x.type==='video')c='<video src="'+x.media+'" controls></video>';else if(x.type==='voice')c='<audio src="'+x.media+'" controls></audio>';if(x.text)c+='<div class="msg-text">'+(x.text.replace(/[&<>]/g,function(z){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[z];}))+'</div>';return '<div class="msg '+x.from+'"><div class="bubble">'+c+'<div class="msg-time">'+(function(){try{return new Date(x.time).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});}catch(e){return'';}})()+'</div></div></div>';}).join('');b.scrollTop=b.scrollHeight;}catch(e){}}
function maybeFb(){try{if(typeof W.openP!=='function'||typeof W.openChat!=='function')installFb();}catch(e){}}

function boot(){try{var old=G('authFab');if(old)old.remove();}catch(e){}
 injectCSS();
 refreshMe().then(function(ok){if(!ok){location.replace('/login');return;}renderDrawer();maybeFb();if(location.hash==='#account'||/[\?&]p=account/.test(location.search))showAccount();maybeReturn();});}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot);else boot();
setTimeout(maybeFb,2200);setTimeout(maybeFb,4500);
})();
