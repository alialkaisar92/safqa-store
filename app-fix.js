/* app-fix.js — شبكة أمان + تشخيص مرئي على الشاشة */
(function(){
  function miss(n){return typeof window[n]!=='function';}
  var need=['go','openP','closeP','openChat','closeChat','chatSend','chatRender','chatOnFile','chatToggleVoice','eoTest','eoSave','eoReady','eoApi','eoDiag','openDrawer','closeDrawer','openNotif','closeNotif','addCart','renderCart','submitOrder','renderP'];
  var missing=need.filter(miss);
  // احتياطي: لو openChat مش معرّفة، نسخة بسيطة تفتح الشاشة
  if(miss('openChat')){window.openChat=function(){var s=document.getElementById('chatScreen');if(s){s.classList.add('open');document.body.style.overflow='hidden';if(typeof chatRender==='function')chatRender(true);}};}
  if(miss('closeChat')){window.closeChat=function(){var s=document.getElementById('chatScreen');if(s){s.classList.remove('open');document.body.style.overflow='';}};}
  // احتياطي: لو openP مش معرّفة، نسخة تقرأ من الـ grid
  if(miss('openP')){window.openP=function(i){try{var cards=document.querySelectorAll('#g .card');if(cards[i])cards[i].click();}catch(e){}};}
  // ربط احتياطي لزرار "افتح المحادثة" (event delegation)
  document.addEventListener('click',function(e){
    var b=e.target&&e.target.closest?e.target.closest('#p-support .btn-primary'):null;
    if(b&&typeof window.openChat==='function'){e.preventDefault();window.openChat();}
  },true);
  // تشخيص مرئي على الشاشة لو لسه فيه دالة ناقصة
  var still=need.filter(miss);
  if(still.length){
    var d=document.createElement('div');
    d.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999;background:#b91c1c;color:#fff;padding:10px 14px;font:700 13px Cairo,sans-serif;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.3)';
    d.textContent='⚠️ دوال ناقصة (ابعت الصورة دي): '+still.join(', ');
    document.addEventListener('DOMContentLoaded',function(){document.body.appendChild(d);});
  }
  console.log('[app-fix] loaded, missing after fix:', still);
})();
