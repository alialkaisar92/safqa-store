
const PM={orders:{t:'الطلبات',d:'تغيير حالة الطلبات',ic:'📦'},withdrawals:{t:'السحوبات',d:'اعتماد طلبات السحب',ic:'💰'},tickets:{t:'الدعم',d:'الرد على التذاكر',ic:'💬'}};
let AUTH=JSON.parse(localStorage.getItem('sq_ops')||'null');
let DATA=null,STATS=null,USERS=[],ordF='all';
const $=s=>document.querySelector(s);
const esc=s=>(s==null?'':String(s)).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hasPerm(p){if(!AUTH)return false;if(AUTH.user.role==='admin')return true;const pp=AUTH.user.permissions||[];return pp.includes('all')||pp.includes(p);}
function cred(){return {'x-admin-cred':btoa(unescape(encodeURIComponent(AUTH.cred))),'Content-Type':'application/json'};}
async function api(path,body){const o={headers:Object.assign({'Content-Type':'application/json'},cred())};if(body!==undefined){o.method='POST';o.body=JSON.stringify(body);}const r=await fetch(path,o);if(r.status===401){window.__AUTH401=1;console.warn('[auth401]',path);var _e=new Error('انتهت الجلسة');_e.silent=1;throw _e;}const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'خطأ في الطلب');return j;}
function toast(msg,type='ok'){const ic={ok:'✓',err:'✕',warn:'!'}[type]||'•';const el=document.createElement('div');el.className='toast '+type;el.innerHTML='<span class="ti">'+ic+'</span><span>'+esc(msg)+'</span>';$('#tw').appendChild(el);setTimeout(()=>{el.style.opacity='0';el.style.transform='translateX(-22px)';el.style.transition='.3s';setTimeout(()=>el.remove(),300);},2900);}
function animateNum(el,to,suf){suf=suf||'';const dur=750,t0=performance.now();const step=now=>{const p=Math.min(1,(now-t0)/dur);const e=1-Math.pow(1-p,3);el.textContent=Math.round(to*e).toLocaleString('en')+(suf?' '+suf:'');if(p<1)requestAnimationFrame(step);};requestAnimationFrame(step);}

function doLogin(){const u=$('#lu_user').value.trim(),pw=$('#lu_pass').value;$('#loginErr').textContent='';if(!u||!pw){$('#loginErr').textContent='من فضلك اكمل البيانات';return;}fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:pw})}).then(r=>r.json().then(j=>({ok:r.ok,j}))).then(({ok,j})=>{if(!ok){$('#loginErr').textContent=j.error||'بيانات الدخول غير صحيحة';return;}AUTH={cred:u+':'+pw,user:j.user};localStorage.setItem('sq_ops',JSON.stringify(AUTH));window.__AUTH401=0;enter();}).catch(()=>{$('#loginErr').textContent='تعذّر الاتصال بالخادم';});}
function doLogout(){localStorage.removeItem('sq_ops');AUTH=null;location.reload();}
function enter(){$('#loginScreen').classList.add('hidden');$('#app').classList.remove('hidden');$('#uNm').textContent=AUTH.user.username;$('#uAv').textContent=AUTH.user.username.charAt(0).toUpperCase();const rp=$('#uRp');if(AUTH.user.role==='admin'){rp.textContent='مدير';rp.className='rp';}else{rp.textContent='مشرف';rp.className='rp mod';}buildNav();go('dashboard');refresh();startClock();}

function buildNav(){const items=[{id:'dashboard',ic:'📊',t:'لوحة القيادة',grp:'نظرة عامة',show:true}];if(hasPerm('orders'))items.push({id:'orders',ic:'📦',t:'الطلبات',bd:'pendingOrders',grp:'العمليات',show:true});if(hasPerm('withdrawals'))items.push({id:'withdrawals',ic:'💰',t:'السحوبات',bd:'pendingWithdrawals',show:true});if(hasPerm('tickets'))items.push({id:'chat',ic:'💬',t:'الدعم الفني',bd:'newTickets',show:true});if(AUTH.user.role==='admin')items.push({id:'team',ic:'👥',t:'الفريق',grp:'الإدارة',show:true});
  if(AUTH.user.role==='admin')items.push({id:'banners',ic:'🖼️',t:'البانرات',grp:'الإدارة',show:true});
  if(AUTH.user.role==='admin')items.push({id:'notifications',ic:'🔔',t:'الإشعارات',grp:'الإدارة',show:true});
  if(AUTH.user.role==='admin')items.push({id:'products',ic:'📦',t:'المنتجات',grp:'الإدارة',show:true});
  if(AUTH.user.role==='admin')items.push({id:'settings',ic:'⚙️',t:'الإعدادات',grp:'الإدارة',show:true});
  if(AUTH.user.role==='admin')items.push({id:'users',ic:'👥',t:'إدارة المستخدمين',grp:'الإدارة',show:true});
  if(AUTH.user.role==='admin')items.push({id:'chat',ic:'💬',t:'محادثات الدعم',grp:'الإدارة',show:true});
  if(AUTH.user.role==='admin')items.push({id:'tickets',ic:'🎫',t:'التذاكر',grp:'العمليات',show:true});let html='',lg='';items.filter(i=>i.show).forEach(i=>{if(i.grp&&i.grp!==lg){lg=i.grp;html+='<div class="grp">'+lg+'</div>';}html+='<button class="ni" data-v="'+i.id+'" onclick="go(\''+i.id+'\')"><span class="ic">'+i.ic+'</span>'+i.t+(i.bd?'<span class="ct" data-c="'+i.bd+'">0</span>':'')+'</button>';});$('#nav').innerHTML=html;}
const META={dashboard:['لوحة القيادة','نظرة شاملة على أداء المتجر'],orders:['إدارة الطلبات','متابعة الطلبات وتغيير حالاتها'],withdrawals:['طلبات السحب','اعتماد أو رفض طلبات سحب الأرباح'],tickets:['الدعم الفني','قراءة رسائل العملاء والرد عليها'],team:['الفريق والصلاحيات','إدارة المشرفين وصلاحياتهم'],banners:['إدارة البانرات','إضافة وحذف وترتيب بانرات المتجر'],notifications:['الإشعارات','إرسال وحذف إشعارات للمستخدمين'],users:['إدارة المستخدمين','عرض والتحكم في كل الحسابات'],chat:['محادثات الدعم','الرد على رسائل العملاء']};
function go(v){document.querySelectorAll('.view').forEach(s=>s.classList.add('hidden'));const el=$('#v-'+v);el.classList.remove('hidden');el.style.animation='none';void el.offsetWidth;el.style.animation='rise .4s both';document.querySelectorAll('.ni').forEach(b=>b.classList.toggle('on',b.dataset.v===v));$('#pTtl').textContent=META[v][0];$('#pSub').textContent=META[v][1];if(window.innerWidth<=980)toggleSide(false);if(v==='team')loadUsers();if(v==='banners')loadBanners();if(v==='notifications')loadNotifications();var _t=0,_iv=setInterval(function(){_injectClr();if(++_t>10)clearInterval(_iv);},300);if(v==='chat'){loadAdminChatList();if(v==='settings')loadSettings();if(AC_UID)loadAdminChatFor(AC_UID);}}
function toggleSide(force){const sb=$('#sidebar'),sc=$('#scrim');const open=force===undefined?!sb.classList.contains('open'):force;sb.classList.toggle('open',open);sc.classList.toggle('hidden',!open);}

async function refresh(){try{STATS=await api('/api/admin/stats');DATA=await api('/api/admin/full-data');const ao=$('#artOrd'),ac=$('#artCom');if(ao)ao.textContent=(STATS.totalOrders||0).toLocaleString('en');if(ac)ac.textContent=(STATS.totalCommission||0).toLocaleString('en');renderStats();renderSpark();renderOrders();renderWithdrawals();renderTickets();document.querySelectorAll('[data-c]').forEach(el=>{el.textContent=STATS[el.dataset.c]||0;});}catch(e){toast(e.message,'err');}}

function renderStats(){const s=STATS;const cards=[['s1','💎','الرصيد المتاح',s.balance||0,'ج.م'],['s2','📦','إجمالي الطلبات',s.totalOrders||0,''],['s3','⏳','قيد التأكيد',s.pendingOrders||0,''],['s4','💸','إجمالي العمولات',s.totalCommission||0,'ج.م'],['s5','💰','سحوبات معلّقة',s.pendingWithdrawals||0,'']];$('#statGrid').innerHTML=cards.map((c,i)=>'<div class="st '+c[0]+'" style="animation-delay:'+(i*55)+'ms"><div class="row"><div class="ic">'+c[1]+'</div></div><div class="lbl">'+c[2]+'</div><div class="val num" data-to="'+c[3]+'" data-suf="'+c[4]+'">0</div></div>').join('');document.querySelectorAll('#statGrid .val').forEach(el=>animateNum(el,Number(el.dataset.to),el.dataset.suf));}

function renderSpark(){const vals=(DATA.orders||[]).slice(0,8).reverse().map(o=>Number(o.commission)||0);if(!vals.length){$('#spark').innerHTML='<div class="empty" style="width:100%"><div class="ei">📉</div><p>لا توجد عمولات بعد</p></div>';return;}const max=Math.max(1,...vals);$('#spark').innerHTML=vals.map((v,i)=>'<div class="bar"><div class="v num">'+v+'</div><div class="col" style="height:0%" data-h="'+Math.max(8,(v/max)*100)+'"></div></div>').join('');requestAnimationFrame(()=>{document.querySelectorAll('#spark .col').forEach((c,i)=>setTimeout(()=>{c.style.height=c.dataset.h+'%';},i*60));});}

const SC={'قيد التأكيد':'p-pend','تم الشحن':'p-ship','تم التسليم':'p-done','ملغي':'p-cancel'};
function renderOrders(){const q=($('#ordQ')?.value||'').trim().toLowerCase();let list=DATA.orders||[];const chips=[['all','الكل'],['قيد التأكيد','قيد التأكيد'],['تم الشحن','تم الشحن'],['تم التسليم','تم التسليم'],['ملغي','ملغي']];$('#ordChips').innerHTML=chips.map(c=>'<button class="chip '+(ordF===c[0]?'on':'')+'" onclick="ordF=\''+c[0]+'\';renderOrders()">'+c[1]+'</button>').join('');if(ordF!=='all')list=list.filter(o=>o.status===ordF);if(q)list=list.filter(o=>((o.customer||'')+(o.serial||'')+(o.id||'')+(o.phone||'')).toLowerCase().includes(q));const can=hasPerm('orders');$('#ordBody').innerHTML=list.length?list.map(o=>{const pr=o.products?o.products.join('، '):(o.product||'—');const act=can?'<select class="tsel" onchange="updOrder(\''+esc(o.id)+'\',this.value)">'+['قيد التأكيد','تم الشحن','تم التسليم','ملغي'].map(st=>'<option '+(o.status===st?'selected':'')+'>'+st+'</option>').join('')+'</select>':'<span class="pill '+(SC[o.status]||'p-pend')+'">'+esc(o.status)+'</span>';return '<tr><td class="num mut">'+esc(o.serial||o.id)+'</td><td><div class="bld">'+esc(o.customer||'—')+'</div><div class="mut num" style="font-size:.74rem">'+esc(o.phone||'')+'</div></td><td style="max-width:230px"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+esc(pr)+'">'+esc(pr)+'</div></td><td class="num bld">'+esc(o.total||o.price||0)+'</td><td class="num" style="color:var(--em);font-weight:800">'+esc(o.commission||0)+'</td><td class="num mut">'+esc(o.date||'')+'</td><td><span class="pill '+(SC[o.status]||'p-pend')+'">'+esc(o.status)+'</span></td><td>'+act+'</td></tr>';}).join(''):'<tr><td colspan="8"><div class="empty"><div class="ei">📭</div><p>لا توجد طلبات مطابقة</p></div></td></tr>';}
async function updOrder(id,status){try{await api('/api/admin/update-order',{orderId:id,status});toast('تم تحديث حالة الطلب');refresh();}catch(e){toast(e.message,'err');}}


const WC={'pending':'p-pend','تم التحويل':'p-done','مرفوض':'p-rej'};
const WL={'pending':'معلّق','تم التحويل':'تم التحويل','مرفوض':'مرفوض'};
function renderWithdrawals(){const can=hasPerm('withdrawals');const list=DATA.withdrawals||[];$('#wBody').innerHTML=list.length?list.map(w=>{let act='<span class="pill '+(WC[w.status]||'p-pend')+'">'+(WL[w.status]||esc(w.status))+'</span>';if(can&&w.status==='pending')act='<button class="btn btn-green btn-sm" onclick="wAct('+w.id+',\'approved\')">✓ اعتماد</button> <button class="btn btn-rose btn-sm" onclick="wAct('+w.id+',\'rejected\')">✕ رفض</button>';return '<tr><td class="num mut">'+esc(w.id)+'</td><td class="num bld">'+esc(w.amount)+' <span class="mut" style="font-weight:600">ج.م</span></td><td><span class="bld">'+esc(w.method||'—')+'</span> <span class="mut">'+esc(w.details||w.walletNumber||'')+'</span></td><td class="num mut">'+esc(w.date||'')+'</td><td><span class="pill '+(WC[w.status]||'p-pend')+'">'+(WL[w.status]||esc(w.status))+'</span></td><td>'+act+'</td></tr>';}).join(''):'<tr><td colspan="6"><div class="empty"><div class="ei">💸</div><p>لا توجد طلبات سحب</p></div></td></tr>';}
async function wAct(id,action){if(!confirm(action==='approved'?'اعتماد طلب السحب ده؟':'رفض السحب وإرجاع المبلغ للرصيد؟'))return;try{await api('/api/admin/withdraw-action',{wId:id,action});toast(action==='approved'?'تم اعتماد السحب':'تم رفض السحب وإرجاع الرصيد');refresh();}catch(e){toast(e.message,'err');}}

function renderTickets(){const can=hasPerm('tickets');const list=DATA.tickets||[];$('#tkList').innerHTML=list.length?list.map((t,i)=>{const isNew=t.status==='جديد';return '<div class="tk" style="animation:rise .4s '+(i*40)+'ms both"><div class="hd"><span class="bld">تذكرة #'+esc(t.id)+'</span><span class="pill '+(isNew?'p-new':'p-rep')+'">'+esc(t.status)+'</span></div><div class="msg">'+esc(t.message)+'</div>'+(t.reply?'<div class="rep"><b>ردّك:</b> '+esc(t.reply)+'</div>':'')+'<div class="dt">'+esc(t.date||'')+'</div>'+((!t.reply&&can)?'<div class="ra"><input class="srch" id="rep-'+t.id+'" placeholder="اكتب ردّك للعميل…" style="flex:1"><button class="btn btn-primary btn-sm" onclick="sendReply('+t.id+')">إرسال الرد</button></div>':'')+'</div>';}).join(''):'<div class="empty"><div class="ei">📨</div><p>لا توجد تذاكر دعم</p></div>';}
async function sendReply(id){const v=$('#rep-'+id).value.trim();if(!v){toast('اكتب ردّ قبل الإرسال','warn');return;}try{await api('/api/admin/reply-ticket',{ticketId:id,reply:v});toast('تم إرسال الرد للعميل');refresh();}catch(e){toast(e.message,'err');}}

async function loadUsers(){var tb=document.getElementById('umBody'),em=document.getElementById('umEmpty');try{var j=await saFetch('/api/admin/users');var list=Array.isArray(j)?j:(j&&Array.isArray(j.users)?j.users:[]);UM_DATA=list;
 if(!list.length){if(tb)tb.innerHTML='';if(em){em.style.display='block';em.innerHTML='<div style="padding:40px 20px;text-align:center"><div style="font-size:2.6rem;margin-bottom:10px;opacity:.5">👥</div><div style="font:800 1rem Cairo;color:#475569;margin-bottom:6px">لا يوجد مستخدمون بعد</div><div style="font:600 .82rem Cairo;color:#94a3b8;margin-bottom:14px">الحالة: '+((j&&j.__status)||'?')+' — لو 401 سجّل دخول بالأدمن أولاً</div><button onclick="loadUsers()" style="background:#0F766E;color:#fff;border:none;padding:9px 18px;border-radius:11px;font:700 .85rem Cairo;cursor:pointer">🔄 إعادة المحاولة</button></div>';}}
 else{if(em)em.style.display='none';renderUsers();}}catch(e){if(em){em.style.display='block';em.innerHTML='<div style="padding:40px 20px;text-align:center;color:#dc2626;font:700 .9rem Cairo">تعذّر الاتصال: '+e.message+'</div>';}}}
async function umDoAdd() {
  const u = document.getElementById('umNewUser').value.trim();
  const p = document.getElementById('umNewPass').value;
  const n = document.getElementById('umNewName').value.trim();
  const ph = document.getElementById('umNewPhone').value.trim();
  const em = document.getElementById('umNewEmail').value.trim();
  const r = document.getElementById('umNewRole').value;
  if(!u || !p) { alert('اسم المستخدم وكلمة السر مطلوبين'); return; }
  try {
    const res = await api('/api/admin/users/create', {username:u, password:p, display_name:n||u, phone:ph, email:em, role:r});
    if(res.ok) { alert('تم إضافة المستخدم ✓'); document.getElementById('umAddOv').remove(); loadUsers(); }
    else alert('فشل: ' + (res.error||''));
  } catch(e) { alert('تعذّر الاتصال'); }
}


async function eoConnectAdmin() {
  const key = document.getElementById('eoKeyInput').value.trim();
  const msg = document.getElementById('eoAdminMsg');
  if(!key) { msg.textContent = '⚠️ API Key مطلوب'; msg.style.color = '#dc2626'; return; }
  msg.textContent = '⏳ جارٍ الربط…'; msg.style.color = '#64748b';
  try {
    const r = await api('/api/easyorders/connect', {apiKey: key});
    if(r.ok) {
      msg.textContent = '✅ تم الربط بنجاح'; msg.style.color = '#16a34a';
      document.getElementById('eoStatus').style.display = 'block';
      document.getElementById('eoKeyInput').value = '';
      // حدّث حالة الاتصال في المتجر
      if(window.eoCheckStatus) eoCheckStatus();
    } else {
      msg.textContent = '❌ ' + (r.error||'فشل الربط'); msg.style.color = '#dc2626';
    }
  } catch(e) { msg.textContent = '❌ تعذّر الاتصال'; msg.style.color = '#dc2626'; }
}
async function eoCheckAdminStatus() {
  try {
    const r = await api('/api/easyorders/status');
    if(r.connected) document.getElementById('eoStatus').style.display = 'block';
  } catch(e) {}
}
setTimeout(eoCheckAdminStatus, 500);


var AC_UID=null;
async function loadAdminChatList(){try{var list=await api('/api/admin/chat/list');if(!Array.isArray(list))list=[];var el=document.getElementById('acList');if(!el)return;if(!list.length){el.innerHTML='<div class="ac-list-empty">لا توجد محادثات بعد</div>';return;}el.innerHTML=list.map(function(x){var nm=x.name||x.uid;return '<div class="ac-li'+(x.uid===AC_UID?' active':'')+'" onclick="acOpenChat(\''+x.uid+'\')"><div class="ac-li-av">'+acEsc(String(nm).charAt(0).toUpperCase())+'</div><div class="ac-li-meta"><b>'+acEsc(nm)+'</b><small>'+acEsc(x.lastText||'—')+'</small></div><span class="ac-li-cnt">'+x.count+'</span></div>';}).join('');}catch(e){}}
async function acOpenChat(uid){AC_UID=uid;loadAdminChatList();await loadAdminChatFor(uid);}
async function loadAdminChatFor(uid){try{var m=await api('/api/admin/chat/messages?userId='+encodeURIComponent(uid));if(!Array.isArray(m))m=[];acRender(m);}catch(e){var b=document.getElementById('acBody');if(b)b.innerHTML='<div class="ac-empty">تعذّر التحميل</div>';}}

function clearAllNotifs(){if(!confirm('مسح كل الإشعارات نهائياً؟'))return;api('/api/admin/notifications/clear',{}).then(function(){toast('تم مسح كل الإشعارات ✓','ok');if(typeof loadNotifications==='function')loadNotifications();}).catch(function(e){toast('فشل: '+e.message,'err');});}
function _injectClr(){try{var v=document.getElementById('v-notifications');if(!v)return;if(document.getElementById('clrAllBtn'))return;var pan=v.querySelector('.panel')||v;var b=document.createElement('button');b.id='clrAllBtn';b.type='button';b.textContent='🗑 مسح كل الإشعارات';b.style.cssText='margin:14px 22px 0;padding:10px 16px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:11px;font:800 .85rem Cairo,sans-serif;cursor:pointer';b.onclick=clearAllNotifs;var h=pan.querySelector('h2,.panel-head,.um-head');if(h)h.parentNode.insertBefore(b,h.nextSibling);else pan.insertBefore(b,pan.firstChild);}catch(e){}}

function _saTokens(){var s=new Set();try{['sq_user_token','admin_token','sq_t','admin_session'].forEach(function(k){var v=localStorage.getItem(k);if(v)s.add(v);});}catch(e){}try{if(window.AUTH&&AUTH.token)s.add(AUTH.token);if(window.AUTH&&AUTH.user&&AUTH.user.token)s.add(AUTH.user.token);}catch(e){}try{var c=document.cookie||'';var ms=c.match(/(?:^|;\s*)(sq_t|admin_token|admin_session|sq_user_token)=([^;]+)/g);if(ms)ms.forEach(function(p){s.add(decodeURIComponent(p.split('=')[1]));});}catch(e){}return Array.from(s);}
async function saFetch(path,body){var hs={'Content-Type':'application/json'};_saTokens().forEach(function(tk){hs['x-sq-token']=tk;hs['x-admin-token']=tk;hs['x-marketer-token']=tk;hs['Authorization']='Bearer '+tk;});var opt={method:body?'POST':'GET',headers:hs,credentials:'include'};if(body!==undefined)opt.body=JSON.stringify(body);var r=await fetch(path,opt);var j=await r.json().catch(function(){return{};});j.__status=r.status;return j;}

var SETTINGS_KEYS = ['site_name','site_logo','primary_color','secondary_color','accent_color','support_phone','support_email','commission_rate','currency','free_shipping_threshold','meta_title','meta_description','meta_keywords'];
async function loadSettings(){
  try{
    var s = await api('/api/v2/settings');
    SETTINGS_KEYS.forEach(function(k){
      var el = document.getElementById('set_'+k);
      if(el && s[k] !== undefined) el.value = s[k];
    });
  }catch(e){ toast('فشل تحميل الإعدادات: '+e.message,'err'); }
}
async function saveSettings(){
  var obj = {};
  SETTINGS_KEYS.forEach(function(k){
    var el = document.getElementById('set_'+k);
    if(el) obj[k] = el.value;
  });
  var msg = document.getElementById('setMsg');
  msg.textContent = '⏳ جارٍ الحفظ…'; msg.style.color = '#64748b';
  try{
    var r = await api('/api/v2/settings', obj, 'PUT');
    if(r.ok){
      msg.textContent = '✅ تم حفظ الإعدادات بنجاح'; msg.style.color = '#16a34a';
      toast('تم حفظ الإعدادات ✓','ok');
      applySettings(obj);
    }else{
      msg.textContent = '❌ فشل الحفظ'; msg.style.color = '#dc2626';
    }
  }catch(e){
    msg.textContent = '❌ خطأ: '+e.message; msg.style.color = '#dc2626';
  }
}
function applySettings(s){
  document.documentElement.style.setProperty('--primary', s.primary_color||'#0F766E');
  document.documentElement.style.setProperty('--secondary', s.secondary_color||'#14b8a6');
  document.documentElement.style.setProperty('--accent', s.accent_color||'#f59e0b');
  if(s.site_name){
    document.title = s.site_name;
    var logo = document.querySelector('.logo-text, .site-name, .hdr-logo');
    if(logo) logo.textContent = s.site_name;
  }
  if(s.site_logo){
    var img = document.querySelector('.logo-img, .site-logo');
    if(img) img.src = s.site_logo;
  }
}

var _PROD=[], _PROD_EDIT=null, _PROD_LOADING=false;
function prodReq(path, method, body){
  var h = {'Content-Type':'application/json'};
  try{ var c = (typeof cred==='function')?cred():{}; for(var k in c) h[k]=c[k]; }catch(e){}
  var ctl = window.AbortController ? new AbortController() : null;
  var timer = ctl ? setTimeout(function(){ctl.abort();}, 25000) : null;
  var o = {method: method||'GET', headers: h, credentials:'include'};
  if(ctl) o.signal = ctl.signal;
  if(body!==undefined) o.body = JSON.stringify(body);
  return fetch(path, o).then(function(r){
    if(r.status===401 && typeof doLogout==='function'){ try{toast('انتهت الجلسة — سجّل دخول تاني','err');}catch(_){}; }
    return r.json().then(function(j){ if(!r.ok) throw new Error(j.error||('خطأ '+r.status)); return j; });
  }).catch(function(e){if(e&&e.name==='AbortError')throw new Error('استغرق الاتصال أكثر من 25 ثانية — تحقق من مفتاح Safka أو حاول مرة أخرى');throw e;}).finally(function(){if(timer)clearTimeout(timer);});
}
function loadProducts(){
  if(_PROD_LOADING) return; _PROD_LOADING = true;
  prodReq('/api/admin/products','GET').then(function(list){
    _PROD = Array.isArray(list)?list:[]; prodRender(_PROD);
  }).catch(function(e){ try{toast('فشل تحميل المنتجات: '+e.message,'err');}catch(_){} })
  .finally(function(){ _PROD_LOADING=false; });
}
function prodRender(list){
  var tb=document.getElementById('prodBody'), em=document.getElementById('prodEmpty');
  if(!tb) return;
  if(!list.length){ tb.innerHTML=''; if(em)em.style.display='block'; return; }
  if(em)em.style.display='none';
  tb.innerHTML = list.map(function(p){
    var img = p.image ? '<img src="'+p.image+'" style="width:38px;height:38px;object-fit:cover;border-radius:8px;vertical-align:middle;margin-left:8px">' : '';
    var st = p.active ? '<span style="color:#16a34a;font-weight:800">● متاح</span>' : '<span style="color:#94a3b8;font-weight:800">● مخفي</span>';
    return '<tr style="border-top:1px solid #f1f5f4">'+
      '<td style="padding:10px;text-align:right">'+img+'<span style="font-weight:700">'+(p.name||'—').replace(/</g,'&lt;').slice(0,40)+'</span></td>'+
      '<td style="padding:10px;text-align:center">'+(Number(p.price)||0).toLocaleString('ar-EG')+'</td>'+
      '<td style="padding:10px;text-align:center">'+(p.stock||0)+'</td>'+
      '<td style="padding:10px;text-align:center">'+st+'</td>'+
      '<td style="padding:10px;text-align:center;white-space:nowrap">'+
        '<button onclick="prodOpen('+p.id+')" style="padding:6px 10px;background:#eef2f1;border:none;border-radius:8px;cursor:pointer;margin:0 2px">✏️</button>'+
        '<button onclick="prodDel('+p.id+')" style="padding:6px 10px;background:#fef2f2;border:none;border-radius:8px;cursor:pointer;margin:0 2px">🗑</button>'+
      '</td></tr>';
  }).join('');
}
function prodFilter(){
  var q=(document.getElementById('prodSearch').value||'').trim().toLowerCase();
  if(!q){ prodRender(_PROD); return; }
  prodRender(_PROD.filter(function(p){ return (p.name||'').toLowerCase().indexOf(q)>=0; }));
}
function prodNew(){ _PROD_EDIT=null; document.getElementById('prodModalTitle').textContent='➕ منتج جديد';
  ['name','desc','image','price','base_price','commission','stock'].forEach(function(k){ document.getElementById('pf_'+k).value=''; });
  document.getElementById('pf_active').checked=true; document.getElementById('prodModal').style.display='flex'; }
function prodOpen(id){ var p=_PROD.find(function(x){return x.id===id;}); if(!p)return; _PROD_EDIT=id;
  document.getElementById('prodModalTitle').textContent='✏️ تعديل المنتج';
  document.getElementById('pf_name').value=p.name||''; document.getElementById('pf_desc').value=p.description||'';
  document.getElementById('pf_image').value=p.image||''; document.getElementById('pf_price').value=p.price||'';
  document.getElementById('pf_base_price').value=p.base_price||''; document.getElementById('pf_commission').value=p.commission||'';
  document.getElementById('pf_stock').value=p.stock||''; document.getElementById('pf_active').checked=!!p.active;
  document.getElementById('prodModal').style.display='flex'; }
function prodClose(){ document.getElementById('prodModal').style.display='none'; }
function prodSave(){
  var obj={ name:document.getElementById('pf_name').value.trim(), description:document.getElementById('pf_desc').value,
    image:document.getElementById('pf_image').value.trim(), price:Number(document.getElementById('pf_price').value)||0,
    base_price:Number(document.getElementById('pf_base_price').value)||0, commission:Number(document.getElementById('pf_commission').value)||0,
    stock:Number(document.getElementById('pf_stock').value)||0, active:document.getElementById('pf_active').checked?1:0 };
  if(!obj.name){ try{toast('اسم المنتج مطلوب','err');}catch(e){} return; }
  if(_PROD_EDIT) obj.id=_PROD_EDIT;
  var pr = prodReq('/api/admin/product','POST',obj);
  pr.then(function(){ prodClose(); try{toast('تم الحفظ ✓','ok');}catch(e){} loadProducts(); })
    .catch(function(e){ try{toast('فشل الحفظ: '+e.message,'err');}catch(_){} });
}
function prodDel(id){ if(!confirm('حذف المنتج نهائياً؟'))return;
  prodReq('/api/admin/product-delete','POST',{id:id}).then(function(){ try{toast('تم الحذف ✓','ok');}catch(e){} loadProducts(); })
    .catch(function(e){ try{toast('فشل الحذف: '+e.message,'err');}catch(_){} });
}
async function importProductsFromSafka(){
  var btn=document.getElementById('importSafkaBtn'); if(btn){btn.disabled=true;btn.textContent='⏳ جارٍ الاستيراد…';}
  try{var r=await prodReq('/api/admin/products/import','POST',{});toast('تمت المزامنة: أضيف '+(r.added||0)+' وتحدّث '+(r.updated||0)+' منتج','ok');loadProducts();}
  catch(e){toast(e.message||'تعذر استيراد المنتجات','err');}
  finally{if(btn){btn.disabled=false;btn.textContent='↻ استيراد من Safka';}}
}
function injectProductTools(){
  var v=document.getElementById('v-products'); if(!v||document.getElementById('importSafkaBtn'))return;
  var b=document.createElement('button'); b.id='importSafkaBtn'; b.type='button'; b.textContent='↻ استيراد من Safka';
  b.style.cssText='margin:0 8px 14px 0;padding:10px 16px;background:#ecfdf5;border:1px solid #a7f3d0;color:#047857;border-radius:11px;font:800 .85rem Cairo,sans-serif;cursor:pointer'; b.onclick=importProductsFromSafka;
  var anchor=v.querySelector('#prodSearch')||v.querySelector('.panel-head')||v.firstElementChild; if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(b,anchor.nextSibling); else v.insertBefore(b,v.firstChild);
}
(function(){ if(typeof window.go==='function'){ var _og=window.go; window.go=function(v){ var r=_og.apply(this,arguments); if(v==='products'){loadProducts();setTimeout(injectProductTools,0);} return r; }; } })();


(function(){
  if(window._PROD_OBS) return; window._PROD_OBS=1;
  var done=false;
  setInterval(function(){
    var el=document.getElementById('v-products');
    if(!el) return;
    if(!el.classList.contains('hidden')){
      if(!done){ done=true; if(typeof loadProducts==='function') loadProducts(); }
    } else { done=false; }
  }, 400);
})();

function acEsc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function acRender(m){var b=document.getElementById('acBody');if(!b)return;if(!Array.isArray(m)||!m.length){b.innerHTML='<div class="ac-empty"><div class="ac-empty-ic">💬</div><p>لا توجد رسائل بعد</p></div>';return;}b.innerHTML=m.map(function(x){var cls=(x.from==='admin'?'admin':'user');var c='';if(x.type==='image'&&x.media)c='<img src="'+x.media+'" alt="">';else if(x.media&&x.type!=='text')c+='<div style="font-size:.72rem;opacity:.8">['+x.type+']</div>';if(x.text)c+='<div>'+acEsc(x.text)+'</div>';var tm='';try{tm=new Date(x.time).toLocaleString('ar-EG',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'});}catch(e){}return '<div class="ac-msg '+cls+'">'+c+'<span class="ac-t">'+tm+(x.from==='admin'?' • الدعم':'')+'</span></div>';}).join('');b.scrollTop=b.scrollHeight;}
function acSend(){var inp=document.getElementById('acInput');if(!inp)return;var v=inp.value.trim();if(!v){return;}if(!AC_UID){try{toast('اختر محادثة من القائمة أولاً','err');}catch(e){}return;}inp.value='';api('/api/admin/chat/send',{userId:AC_UID,type:'text',text:v}).then(function(){if(typeof loadAdminChatFor==='function')loadAdminChatFor(AC_UID);if(typeof loadAdminChatList==='function')loadAdminChatList();}).catch(function(e){try{toast('فشل الإرسال: '+e.message,'err');}catch(_){}});}


;

(function(){try{
  function show(m){try{var d=document.getElementById('__errOv');if(!d){d=document.createElement('div');d.id='__errOv';d.style.cssText='position:fixed;left:8px;right:8px;bottom:8px;z-index:999999;background:#1c1917;color:#fca5a5;border:2px solid #ef4444;border-radius:14px;padding:14px 16px;font:600 13px/1.5 monospace;max-height:42vh;overflow:auto;white-space:pre-wrap;box-shadow:0 10px 30px rgba(0,0,0,.4)';var x=document.createElement('div');x.textContent='✕ إخفاء';x.style.cssText='float:left;cursor:pointer;color:#f87171;font-weight:800;margin-left:10px';x.onclick=function(){d.style.display='none'};d.appendChild(x);var c=document.createElement('div');d.appendChild(c);d._c=c;(document.body||document.documentElement).appendChild(d);}d.style.display='block';d._c.textContent=(d._c.textContent?d._c.textContent+'\n':'')+m;}catch(e){}}
  window.addEventListener('error',function(e){show('⚠️ ERROR: '+(e.message||e)+'\n   @ '+(e.filename||'').split('/').pop()+':'+(e.lineno||''));});
  window.addEventListener('unhandledrejection',function(e){show('⚠️ PROMISE: '+((e.reason&&(e.reason.stack||e.reason.message))||e.reason||''));});
  window.__showErr=show;
}catch(e){}})();

;

/* === doLogin معرّفة من جديد (إصلاح جراحي معزول) === */
(function(){
  function _g(id){return document.getElementById(id);}
  function _val(){
    var u = _g('lu_user');
    if(!u){ var ins=document.querySelectorAll('input'); for(var i=0;i<ins.length;i++){ if((ins[i].type||'').toLowerCase()!=='password' && (ins[i].type||'').toLowerCase()!=='hidden'){ u=ins[i]; break; } } }
    var p = _g('lu_pass');
    if(!p){ p=document.querySelector('input[type="password"]'); }
    return {u:(u?u.value:'').trim(), p:(p?p.value:'')};
  }
  window.doLogin = function(){
    try{ window.__showErr && window.__showErr(''); }catch(e){}
    var v=_val();
    var err=_g('loginErr');
    if(err) err.textContent='';
    if(!v.u || !v.p){ if(err) err.textContent='من فضلك اكمل البيانات'; else alert('من فضلك اكمل البيانات'); return; }
    var btn=document.activeElement; try{ if(btn&&btn.disabled===false){btn.disabled=true; btn.dataset._t=btn.textContent; btn.textContent='⏳ جارٍ الدخول…';} }catch(e){}
    fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:v.u,password:v.p})})
      .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
      .then(function(x){
        if(!x.ok){ var m=(x.j&&x.j.error)||'بيانات الدخول غير صحيحة'; if(err) err.textContent=m; else alert(m); return; }
        try{ window.AUTH={cred:v.u+':'+v.p, user:x.j.user}; }catch(e){ window.AUTH={user:x.j.user}; }
        try{ localStorage.setItem('sq_ops', JSON.stringify(window.AUTH)); }catch(e){}
        try{ window.__AUTH401=0; }catch(e){}
        if(typeof enter==='function'){ enter(); } else { location.reload(); }
      })
      .catch(function(e){ var m='تعذّر الاتصال: '+(e&&e.message?e.message:e); if(err) err.textContent=m; else alert(m); })
      .finally(function(){ try{ if(btn&&btn.dataset._t){btn.disabled=false; btn.textContent=btn.dataset._t; delete btn.dataset._t;} }catch(e){} });
  };
  /* ربط احتياطي: لو الزرار مفيهوش onclick، نربطه هنا */
  document.addEventListener('click', function(e){
    var b=e.target&&e.target.closest?e.target.closest('button'):null;
    if(!b) return;
    var txt=(b.textContent||'').replace(/\s+/g,'');
    if(txt.indexOf('دخولللمركز')>=0 || txt.indexOf('دخول')===0 && /مركز|login/i.test(b.getAttribute('onclick')||'')){
      if(!(b.getAttribute('onclick')||'').match(/doLogin/)){ e.preventDefault(); window.doLogin(); }
    }
  }, true);
})();

;

/* === تعبئة تلقائية حقيقية للاسم + كلمة السر (تتجاوز التلميح الرمادي) === */
(function(){
  var U="admin", P="Admin@2026";
  function set(el,val){ if(!el)return; el.value=val; try{el.removeAttribute("placeholder");}catch(e){} try{el.style.color="#0f2420";}catch(e){} try{el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));}catch(e){} }
  function fill(){
    var u=document.getElementById("lu_user");
    if(!u){var ins=document.querySelectorAll("input");for(var i=0;i<ins.length;i++){var tp=(ins[i].type||"").toLowerCase();if(tp!=="password"&&tp!=="hidden"&&tp!=="checkbox"&&tp!=="submit"){u=ins[i];break;}}}
    var p=document.getElementById("lu_pass")||document.querySelector('input[type="password"]');
    set(u,U); set(p,P);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fill);else fill();
  setTimeout(fill,200);setTimeout(fill,700);setTimeout(fill,1500);
})();

;

/* === تعبئة تلقائية حقيقية للاسم + كلمة السر (تتجاوز التلميح الرمادي) === */
(function(){
  var U="admin", P="Admin@2026";
  function set(el,val){ if(!el)return; el.value=val; try{el.removeAttribute("placeholder");}catch(e){} try{el.style.color="#0f2420";}catch(e){} try{el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));}catch(e){} }
  function fill(){
    var u=document.getElementById("lu_user");
    if(!u){var ins=document.querySelectorAll("input");for(var i=0;i<ins.length;i++){var tp=(ins[i].type||"").toLowerCase();if(tp!=="password"&&tp!=="hidden"&&tp!=="checkbox"&&tp!=="submit"){u=ins[i];break;}}}
    var p=document.getElementById("lu_pass")||document.querySelector('input[type="password"]');
    set(u,U); set(p,P);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fill);else fill();
  setTimeout(fill,200);setTimeout(fill,700);setTimeout(fill,1500);
})();
