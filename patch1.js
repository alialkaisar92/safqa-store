const fs = require('fs');
let s = fs.readFileSync('landing.html','utf8');
const oldCss = `.theme-toggle{display:flex;align-items:center;gap:6px;border:1.5px solid var(--line);border-radius:50px;padding:9px 14px;font-size:.75rem;font-weight:800;color:var(--forest-d);background:var(--paper)}
html[data-theme="pharaoh"] .theme-toggle{box-shadow:0 0 0 1px var(--forest) inset}`;
const newCss = `.theme-toggle{display:flex;align-items:center;justify-content:center;gap:6px;border:1.5px solid var(--line);border-radius:50px;padding:9px 12px;font-size:.75rem;font-weight:800;color:var(--forest-d);background:var(--paper);flex-shrink:0}
html[data-theme="pharaoh"] .theme-toggle{box-shadow:0 0 0 1px var(--forest) inset}
@media(max-width:480px){
  .theme-toggle{width:40px;height:40px;padding:0;border-radius:50%}
  .theme-toggle .tt-txt{display:none}
  .navright{gap:8px}
  .navbar .wrap{padding:12px 14px}
  .logo{font-size:1.3rem}
}`;
if(s.includes(oldCss)){ s = s.replace(oldCss, newCss); fs.writeFileSync('landing.html', s); console.log('تم التعديل ✅'); }
else { console.log('لم يتم العثور على النص - الملف مختلف عن المتوقع'); }
