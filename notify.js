/* NOTIFY_SAFE_WRAP */
try{
/* notify.js v3 — Web Push حقيقي + SSE لحظي + صوت بلّوري بصدى + إشعار منزلق */
(function(){
var W=window,D=document;
var ST={n:'sa_ln',c:'sa_lc',o:'sa_lo',b:'sa_lb'};
function gn(k){return Number(localStorage.getItem(k)||'0');}
function sn(k,v){try{localStorage.setItem(k,String(v));}catch(e){}}
var seen={};function mark(id){seen[id]=1;var ks=Object.keys(seen);if(ks.length>300)for(var i=0;i<100;i++)delete seen[ks[i]];}
function saw(id){return !!seen[id];}
function seeded(){return localStorage.getItem('sa_seeded')==='1';}

/* ===== صوت بلّوري احترافي بصدى خفيف (نغمة الآيفون المحسّنة) ===== */
var actx=null,aok=false;
function unlock(){if(aok)return;try{actx=actx||new(W.AudioContext||W.webkitAudioContext)();if(actx.state==='suspended')actx.resume();aok=true;}catch(e){}}
function bell(freqs,peak){try{unlock();if(!actx)return;var now=actx.currentTime;var delay=actx.createDelay();delay.delayTime.value=0.09;var fb=actx.createGain();fb.gain.value=0.28;delay.connect(fb);fb.connect(delay);var wet=actx.createGain();wet.gain.value=0.35;delay.connect(wet);wet.connect(actx.destination);
 for(var i=0;i<freqs.length;i++){var f=freqs[i];var o1=actx.createOscillator(),o2=actx.createOscillator(),g=actx.createGain();o1.type='sine';o2.type='triangle';o1.frequency.value=f;o2.frequency.value=f*2.002;var og=actx.createGain();og.gain.value=0.3;o2.connect(og);og.connect(g);o1.connect(g);g.connect(actx.destination);g.connect(delay);var t=now+i*0.09;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak||0.22,t+0.005);g.gain.exponentialRampToValueAtTime(0.0001,t+0.42);o1.start(t);o2.start(t);o1.stop(t+0.45);o2.stop(t+0.45);}}catch(e){}}
function snd(kind){if(kind==='chat')bell([1318.5,1568.0,2093.0],0.20);else if(kind==='order')bell([880.0,1174.7,1568.0],0.20);else if(kind==='balance')bell([1046.5,1318.5],0.18);else bell([1174.7,1568.0,2093.0],0.22);}
function vib(p){try{if(navigator.vibrate)navigator.vibrate(p);}catch(e){}}

/* ===== إذن + إشعار نظام ===== */
function perm(){if(!('Notification'in W))return false;if(Notification.permission==='default')try{Notification.requestPermission();}catch(e){}return Notification.permission==='granted';}
function sysN(t,b,tag){try{if('Notification'in W&&Notification.permission==='granted'){var n=new Notification(t,{body:b,tag:tag||'sa',icon:'/icon.svg',silent:true});n.onclick=function(){try{W.focus();n.close();}catch(e){}};setTimeout(function(){try{n.close();}catch(e){}},6000);return true;}}catch(e){}return false;}
function swN(t,b,tag){try{if(navigator.serviceWorker&&navigator.serviceWorker.controller){navigator.serviceWorker.controller.postMessage({type:'show',title:t,body:b,tag:tag});return true;}}catch(e){}return false;}
function dot(on){try{var d=D.getElementById('notifDot');if(d)d.classList.toggle('on',!!on);}catch(e){}}

/* ===== إشعار منزلق احترافي داخل الموقع ===== */
var META={notif:{ic:'📢',c:'#0F766E',bg:'#ecfdf5'},chat:{ic:'💬',c:'#0d9488',bg:'#f0fdfa'},order:{ic:'🛍️',c:'#d97706',bg:'#fffbeb'},balance:{ic:'💰',c:'#0891b2',bg:'#ecfeff'}};
function ensureWrap(){var w=D.getElementById('saNWrap');if(w)return w;w=D.createElement('div');w.id='saNWrap';w.style.cssText='position:fixed;top:14px;left:0;right:0;z-index:99998;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;padding:0 12px';D.body.appendChild(w);return w;}
function injectCSS(){if(D.getElementById('saNCSS'))return;var s=D.createElement('style');s.id='saNCSS';s.textContent='@keyframes saNIn{0%{opacity:0;transform:translateY(-26px) scale(.92)}60%{opacity:1;transform:translateY(4px) scale(1.01)}100%{transform:translateY(0) scale(1)}}@keyframes saNOut{to{opacity:0;transform:translateY(-20px) scale(.94)}}@keyframes saNBar{from{width:100%}to{width:0%}}.saN{pointer-events:auto;position:relative;width:100%;max-width:380px;background:#fff;border-radius:18px;box-shadow:0 12px 40px -10px rgba(15,23,42,.32),0 2px 6px rgba(15,23,42,.08);overflow:hidden;display:flex;align-items:stretch;animation:saNIn .5s cubic-bezier(.18,.9,.3,1.2) both;border:1px solid rgba(15,23,42,.05)}.saN.out{animation:saNOut .3s ease forwards}.saN .saN-ac{width:6px;flex-shrink:0}.saN .saN-ic{width:50px;display:grid;place-items:center;font-size:1.45rem;flex-shrink:0}.saN .saN-bd{flex:1;min-width:0;padding:13px 14px 13px 0}.saN .saN-t{font:900 .92rem/1.25 Cairo,sans-serif;color:#0f172a;margin-bottom:2px}.saN .saN-m{font:600 .8rem/1.4 Cairo,sans-serif;color:#475569;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.saN .saN-x{align-self:flex-start;background:none;border:none;color:#94a3b8;font-size:1.1rem;cursor:pointer;padding:10px 12px 0 0;flex-shrink:0}.saN .saN-pb{position:absolute;bottom:0;left:0;right:0;height:3px}.saN .saN-pb i{display:block;height:100%;animation:saNBar 5s linear forwards}';D.head.appendChild(s);}
function toast(title,msg,kind){try{injectCSS();var w=ensureWrap();var m=META[kind]||META.notif;var el=D.createElement('div');el.className='saN';el.innerHTML='<div class="saN-ac" style="background:'+m.c+'"></div><div class="saN-ic" style="background:'+m.bg+'">'+m.ic+'</div><div class="saN-bd"><div class="saN-t">'+title+'</div><div class="saN-m">'+(msg||'')+'</div></div><button class="saN-x">×</button><div class="saN-pb"><i style="background:'+m.c+'"></i></div>';function dismiss(){el.classList.add('out');setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},300);}el.querySelector('.saN-x').onclick=dismiss;w.appendChild(el);var k=w.children;while(k.length>3)w.removeChild(k[0]);setTimeout(dismiss,5000);}catch(e){}}

function fire(title,msg,kind,tag){snd(kind);vib(kind==='chat'?[0,55,55,55]:[0,40,40,40,40]);toast(title,msg,kind);if(!sysN(title,msg,tag))swN(title,msg,tag);dot(true);}

/* ===== معالجة التحديث (dedup واحد لـ SSE + polling) ===== */
function handle(u){if(!u)return;
 if(!seeded()){sn(ST.n,u.lastNotifId||0);sn(ST.c,u.lastAdminId||0);sn(ST.o,u.orderCount||0);if(u.balance!=null)sn(ST.b,Number(u.balance));localStorage.setItem('sa_seeded','1');dot((u.notifCount||0)>0);return;}
 var nn=u.newNotifs||u.allNotifs||[];var fired=false;var ln=gn(ST.n);
 for(var i=0;i<nn.length;i++){var id=Number(nn[i].id);if(id>ln&&!saw('n'+id)){mark('n'+id);fire('📢 '+(nn[i].title||'إشعار جديد'),nn[i].body||'','notif','n-'+id);fired=true;}}
 if(nn.length){var mx=nn.reduce(function(a,b){return Math.max(a,Number(b.id)||0);},ln);if(mx>ln)sn(ST.n,mx);}
 var lai=Number(u.lastAdminId||0);if(lai>gn(ST.c)&&!saw('c'+lai)){mark('c'+lai);fire('💬 ردّ من الدعم',u.lastAdminText||'عندك رسالة جديدة','chat','c-'+lai);sn(ST.c,lai);fired=true;}
 var oc=Number(u.orderCount||0);if(oc>gn(ST.o)){fire('🛍️ تحديث في طلباتك','إجمالي الطلبات: '+oc,'order','o-'+oc);sn(ST.o,oc);fired=true;}
 if(u.balance!=null){var bv=Number(u.balance);if(gn(ST.b)!==0&&bv!==gn(ST.b))fire('💰 رصيدك اتحدّث',bv.toLocaleString('ar-EG')+' ج.م','balance','b');sn(ST.b,bv);}
 if(!fired)dot(false);
}

/* ===== Web Push: اشتراك حقيقي ===== */
function u8(b){var s=atob(b.replace(/-/g,'+').replace(/_/g,'/'));var a=new Uint8Array(s.length);for(var i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a;}
function subPush(){try{if(!('PushManager'in W)||!navigator.serviceWorker)return;
 fetch('/api/push/vapid').then(function(r){return r.json();}).then(function(j){if(!j||!j.publicKey||!j.ok)return;
  return navigator.serviceWorker.ready.then(function(reg){return reg.pushManager.getSubscription().then(function(sub){if(sub)return sub;return reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(j.publicKey)});});
  }).then(function(sub){if(!sub)return;return fetch('/api/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sub)}).then(function(r){return r.json();}).then(function(x){console.log('[push] subscribed, total='+(x&&x.count));});});
 }).catch(function(e){console.log('[push] sub err',e&&e.message);});}catch(e){}}

/* ===== SSE لحظي + polling احتياطي ===== */
var es=null,esOk=false;
function startSSE(){try{if(!W.EventSource)return;es=new EventSource('/api/stream');es.onopen=function(){esOk=true;};es.onmessage=function(e){try{handle(JSON.parse(e.data));}catch(_){}};es.onerror=function(){esOk=false;};}catch(e){}}
function poll(){fetch('/api/updates?since='+gn(ST.n)).then(function(r){return r.ok?r.json():null;}).then(function(u){if(u)handle(u);}).catch(function(){});}

function boot(){if('serviceWorker'in navigator){try{navigator.serviceWorker.register('/sw.js').catch(function(){});}catch(e){}}
 var once=function(){unlock();if(perm())subPush();D.removeEventListener('click',once);D.removeEventListener('touchstart',once);};
 D.addEventListener('click',once);D.addEventListener('touchstart',once);
 injectCSS();ensureWrap();startSSE();setTimeout(poll,1500);setInterval(poll,4000);setInterval(function(){if(!esOk)startSSE();},8000);
}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot);else boot();
})();

}catch(_notifyErr){console.warn("[notify] isolated:",_notifyErr&&_notifyErr.message);}
