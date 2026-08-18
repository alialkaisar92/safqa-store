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
