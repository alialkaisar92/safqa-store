(function(){
function apply(doc,theme,set){set=set||{};
var c=Object.assign({},theme.colors,(set.colors)||{});
var L=Object.assign({},theme.layout,(set.layout)||{});
var F=Object.assign({},theme.fonts,(set.fonts)||{});
var d=doc.documentElement;
d.style.setProperty('--p',c.primary);d.style.setProperty('--p2',c.secondary);
d.style.setProperty('--bg',c.background);d.style.setProperty('--tx',c.text);
d.style.setProperty('--card',c.card);d.style.setProperty('--rad',L.radius||'16px');
d.style.setProperty('--font',F.family||'Cairo');d.style.setProperty('--hsize',F.heading||'1.35rem');
var b=doc.body;
b.setAttribute('data-header',L.header||'classic');b.setAttribute('data-hero',L.hero||'large');
b.setAttribute('data-card',L.card||'rounded');b.setAttribute('data-footer',L.footer||'modern');
b.setAttribute('data-btn',L.button||'pill');}
window.ThemeEngine={apply:apply};
})();
