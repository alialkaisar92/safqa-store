/* safe.js — شبكة أمان: لا صفحة بيضاء + الأخطاء الحميدة (classList/style على عنصر مش موجود) بتتفلتر بصمت */
window.W=window.W||window;window.D=window.D||document;
(function(){
var W=window,D=document,seen={};
function isBenign(m){m=String(m||'');if(!m)return false;return /Cannot read propert(y|ies) of (null|undefined)|null is not an object|undefined is not an object|ResizeObserver loop|Script error\.?|reading 'classList'|reading 'style'|reading 'textContent'|reading 'value'|reading 'innerHTML'/i.test(m);}
function showErr(msg,src){if(isBenign(msg)){try{console.warn('[safe-benign]',msg,src);}catch(_){}return;}var key=msg+'|'+src;if(seen[key]){seen[key]++;if(seen[key]>2)return;}seen[key]=1;try{var b=D.getElementById('saSafeBar');if(!b){b=D.createElement('div');b.id='saSafeBar';b.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#0f172a;color:#fca5a5;padding:12px 14px 14px;font:600 12px/1.55 Cairo,system-ui,sans-serif;box-shadow:0 -8px 26px rgba(0,0,0,.4);max-height:38vh;overflow:auto;border-top:2px solid #ef4444;border-radius:16px 16px 0 0';var mount=function(){(D.body||D.documentElement).appendChild(b);};if(D.body)mount();else D.addEventListener('DOMContentLoaded',mount);}var line=D.createElement('div');line.style.cssText='padding:4px 0;border-bottom:1px solid rgba(255,255,255,.07)';line.textContent='⚠️ '+msg+(src?'  ['+src+']':'');b.appendChild(line);if(!b.querySelector('.saSafeClose')){var c=D.createElement('button');c.className='saSafeClose';c.textContent='✕ إخفاء';c.style.cssText='display:block;margin-top:10px;background:#334155;color:#fff;border:none;padding:7px 14px;border-radius:9px;font:700 11px Cairo,sans-serif;cursor:pointer';c.onclick=function(){b.remove();seen={};};b.appendChild(c);}}catch(e){}}
W.addEventListener('error',function(e){showErr(e.message||'خطأ',(e.filename||'').split('/').pop()+':'+(e.lineno||''));});
W.addEventListener('unhandledrejection',function(e){var m=(e.reason&&(e.reason.message||e.reason))||'';showErr(m,'promise');try{e.preventDefault();}catch(_){}});
var STUBS=['go','openP','closeP','openChat','closeChat','chatSend','chatRender','chatOnFile','chatToggleVoice','addCart','openDrawer','closeDrawer','openNotif','closeNotif','fillDrawer','cartQty','rmCart','submitOrder','recalc','checkMin','chgQty','doWd','saveProf','sendSupport','onGov','eoTest','eoSave','eoDiag','eoSyncNow','eoSyncStatuses','eoSaveSecret','eoCopyUrl','eoDisconnect','eoToggle','goToSlide','renderGrouped','reloadProducts','stockLabel','updProfit','updateNotifDot','renderNotifs','pollNotifs','openAuth','closeAuth','auLogout','loadAdminChat','adminChatSend','adminChatOnFile','adminChatToggleVoice','loadNotifications','renderNotifications','sendNotification','deleteNotification','openBannerForm','closeBannerForm','saveBanner','deleteBanner','moveBanner','updateBnPreview','saveBanners','renderBanners','loadBanners'];
function applyStubs(){for(var i=0;i<STUBS.length;i++){(function(n){if(typeof W[n]!=='function'){W[n]=function(){try{console.warn('[safe-stub]',n);}catch(e){}};}})(STUBS[i]);}try{if(!D.getElementById('g2')&&D.getElementById('g')){var h=D.createElement('div');h.id='g2';D.getElementById('g').parentNode.insertBefore(h,D.getElementById('g').nextSibling);}}catch(e){}
 W.updateNotifDot=function(on){try{var d=D.getElementById('notifDot');if(d)d.classList.toggle('on',!!on);}catch(e){}};}
if(D.readyState==='complete')setTimeout(applyStubs,0);else W.addEventListener('load',function(){setTimeout(applyStubs,250);setTimeout(applyStubs,1500);});
W.__SAFE_OK=true;
})();

// ===== Settings Reflection (المرحلة 1) =====
(function(){
  try {
    fetch('/api/v2/settings').then(function(r){return r.json();}).then(function(s){
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
    }).catch(function(){});
  } catch(e) {}
})();
