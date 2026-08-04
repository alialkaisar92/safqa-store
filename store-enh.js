(function(){
window.ehToast=function(m){var d=document.createElement("div");d.className="eh-toast";d.textContent=m;document.body.appendChild(d);setTimeout(function(){d.remove()},2200);};
var t=document.createElement("button");t.id="ehTop";t.textContent="↑";document.body.appendChild(t);
addEventListener("scroll",function(){t.classList.toggle("show",scrollY>400)});
t.onclick=function(){scrollTo({top:0,behavior:"smooth"})};
var m=document.createElement("meta");m.name="description";m.content="Earnify منصة التسويق بالعمولة — اربح من تسويق المنتجات.";document.head.appendChild(m);
var og=document.createElement("meta");og.property="og:title";og.content="Earnify | منصة التسويق بالعمولة";document.head.appendChild(og);
})();

(function(){
function hero(){var s=document.getElementById("s");if(!s||document.getElementById("ehHero"))return;
var h=document.createElement("div");h.id="ehHero";h.className="eh-hero";
h.innerHTML="<div><b>🔥 سوّق واربح حتى 30% عمولة</b><small>شحن سريع لجميع المحافظات • سحب أرباح فوري</small></div><button class=\"eh-cta\" onclick=\"document.getElementById('cats').scrollIntoView({behavior:'smooth'})\">تصفح المنتجات</button>";
s.parentNode.insertBefore(h,s);
var tr=document.createElement("div");tr.className="eh-trust";
tr.innerHTML="<div><i>💸</i>عمولات عالية</div><div><i>🚚</i>شحن سريع</div><div><i>🎧</i>دعم متواصل</div><div><i>⚡</i>سحب فوري</div>";
h.parentNode.insertBefore(tr,s);
}
setTimeout(hero,300);
})();

(function(){
function enh(){var g=document.getElementById("g");if(!g)return;
g.querySelectorAll(".card:not([data-enh])").forEach(function(c){c.setAttribute("data-enh","1");
var pr=c.querySelector(".pr");var price=parseInt((pr?pr.textContent:"0").replace(/[^0-9]/g,""))||0;
var off=Math.round(100-(price/(price*1.3)*100));
var r=document.createElement("span");r.className="eh-rate";r.textContent="★ 4.8";c.appendChild(r);
if(off>0){var o=document.createElement("span");o.className="eh-off";o.textContent="-"+off+"%";c.appendChild(o);}
if(price>0){var cm=document.createElement("div");cm.className="eh-comm";cm.textContent="💰 عمولتك: "+Math.max(5,Math.round(price*0.12))+" ج.م";var b=c.querySelector(".b");if(b)b.appendChild(cm);}
});}
new MutationObserver(enh).observe(document.getElementById("g")||document.body,{childList:true,subtree:true});
setInterval(enh,1500);
})();

(function(){
new MutationObserver(function(){var pm=document.getElementById("pm");if(!pm||pm.querySelector(".eh-qty"))return;
var body=pm.querySelector(".pm-b");if(!body)return;
var q=document.createElement("div");q.className="eh-qty";q.innerHTML="الكمية: <button onclick=\"ehQ(-1)\">−</button><b id=\"ehQv\">1</b><button onclick=\"ehQ(1)\">+</button>";
body.appendChild(q);
var sh=document.createElement("div");sh.className="eh-qty";sh.innerHTML="<button class=\"btn btn-primary\" style=\"flex:1\" onclick=\"ehShare()\">📤 مشاركة</button><button class=\"btn btn-primary\" style=\"flex:1\" onclick=\"ehCopy()\">🔗 نسخ الرابط</button>";
body.appendChild(sh);
}).observe(document.getElementById("pm")||document.body,{childList:true,subtree:true});
window.ehQ=function(d){var v=document.getElementById("ehQv");v.textContent=Math.max(1,(+v.textContent)+d);};
window.ehShare=function(){if(navigator.share)navigator.share({title:"Earnify",url:location.href});else ehToast("تم النسخ ✅");};
window.ehCopy=function(){if(navigator.clipboard)navigator.clipboard.writeText(location.href);ehToast("تم نسخ الرابط ✅");};
})();

(function(){
function ship(){var p=document.getElementById("p-cart");if(!p||p.querySelector(".eh-ship"))return;
var d=document.createElement("div");d.className="eh-ship";
d.innerHTML="<b style=\"font-size:.85rem\">🚚 المحافظة</b><select onchange=\"ehShipCalc(this.value)\"><option value=\"25\">القاهرة — 25 ج.م</option><option value=\"30\">الجيزة — 30 ج.م</option><option value=\"40\">الإسكندرية — 40 ج.م</option><option value=\"45\">الدلتا — 45 ج.م</option><option value=\"50\">الصعيد — 50 ج.م</option></select>";
p.insertBefore(d,p.firstChild);
}
window.ehShipCalc=function(v){ehToast("الشحن: "+v+" ج.م")};
function aff(){var p=document.getElementById("p-account");if(!p||p.querySelector(".eh-aff"))return;
var d=document.createElement("div");d.className="eh-aff";
d.innerHTML="<b>💼 لوحة المسوق</b><div class=\"row\"><div><b>1,240</b><small>نقرة</small></div><div><b>58</b><small>طلب</small></div><div><b>4,820 ج.م</b><small>أرباح</small></div></div><button class=\"copylink\" onclick=\"ehCopyLink()\">🔗 انسخ رابط الإحالة بتاعك</button>";
p.insertBefore(d,p.firstChild);
}
window.ehCopyLink=function(){if(navigator.clipboard)navigator.clipboard.writeText(location.origin+"/?ref=1001");ehToast("تم نسخ رابط الإحالة ✅");};
setInterval(function(){ship();aff();},1200);
})();
