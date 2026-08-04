const db=require("./services/db").getDb();
const a=require("./services/auth.service");
const PW="Admin@2026";
let cols=[]; try{cols=db.prepare("PRAGMA table_info(marketers)").all();}catch(e){console.log("pragma err:",e.message);}
let adm=null;
try{adm=db.prepare("SELECT id,username,role,active FROM marketers WHERE username=?").get("admin");}catch(e){}
console.log("admin قبل الإصلاح:", adm?JSON.stringify(adm):"❌ مش موجود (ده كان العطل)");
if(!adm){
  const need={};
  cols.forEach(c=>{ if(c.notnull && c.dflt_value===null && c.pk===0){ const T=(c.type||'').toUpperCase(); need[c.name]=(T.includes('INT')||T.includes('REAL')||T.includes('BOOL'))?0:''; } });
  need.username='admin'; need.role='admin'; need.active=1; need.password_hash='placeholder';
  cols.forEach(c=>{ if(c.notnull && !(c.name in need)){ const T=(c.type||'').toUpperCase(); need[c.name]=(T.includes('INT')||T.includes('REAL'))?0:'x'; } });
  const keys=Object.keys(need), ph=keys.map(()=>'?').join(',');
  try{ const r=db.prepare(`INSERT INTO marketers (${keys.join(',')}) VALUES (${ph})`).run(...keys.map(k=>need[k])); adm={id:Number(r.lastInsertRowid)}; console.log("✅ أنشأت admin id=",adm.id); }
  catch(e){ console.log("❌ INSERT فشل:",e.message); }
}else{ console.log("✅ admin موجود id=",adm.id); }
if(adm){
  try{a.pubSetRole(adm.id,"admin");}catch(e){}
  try{a.pubResetPw(adm.id,PW);console.log("✅ كلمة السر اتعيّنت (scrypt)");}catch(e){console.log("❌ reset:",e.message);}
  const chk=db.prepare("SELECT username,role,active FROM marketers WHERE id=?").get(adm.id);
  console.log("   تأكيد من DB:", JSON.stringify(chk));
  try{ const r=a.pubLogin("admin",PW); console.log(">>> CLI pubLogin:", r&&r.token?"نجاح ✅":"فشل ❌"); }
  catch(e){ console.log(">>> CLI pubLogin فشل:",e.message); }
}
