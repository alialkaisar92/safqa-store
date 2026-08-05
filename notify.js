module.exports=function(app){
const fs=require('fs'),path=require('path');
const API='https://onesignal.com/api/v1';
function readJSON(f,def){try{return JSON.parse(fs.readFileSync(path.join(__dirname,f),'utf8'))}catch(e){return def}}
function writeJSON(f,v){fs.writeFileSync(path.join(__dirname,f),JSON.stringify(v,null,2))}
function cfg(){return readJSON('affiliate-data.json',{}).onesignal||{}}
function saveCfg(c){const d=readJSON('affiliate-data.json',{});d.onesignal=c;writeJSON('affiliate-data.json',d)}
function users(){return readJSON('store-users.json',{users:[],tokens:{}})}
function saveUsers(u){writeJSON('store-users.json',u)}
function log(n){const d=readJSON('affiliate-data.json',{});d.notifLog=d.notifLog||[];d.notifLog.unshift(Object.assign({id:Date.now(),date:new Date().toISOString().slice(0,16).replace('T',' ')},n));d.notifLog=d.notifLog.slice(0,100);writeJSON('affiliate-data.json',d)}
async function sendPush(o){const c=cfg();log(o);
 if(!c.appId||!c.restKey)return{ok:false,reason:'OneSignal غير مهيأ — ضيف App ID وREST Key من لوحة الإشعارات'};
 const body={app_id:c.appId,headings:{en:o.headings||'',ar:o.headings||''},contents:{en:o.contents||'',ar:o.contents||''},data:{url:o.url||'/'}};
 if(o.icon)body.chrome_web_icon=o.icon;if(o.image)body.big_picture=o.image;
 if(o.ids&&o.ids.length)body.include_player_ids=o.ids;else if(o.segments&&o.segments.length)body.included_segments=o.segments;else body.included_segments=['All'];
 if(o.schedule)body.send_after=o.schedule;
 try{const r=await fetch(API+'/notifications',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Basic '+c.restKey},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));return{ok:true,res:j}}catch(e){return{ok:false,error:String(e)}}}
function notifyUser(userId,h,c2,url){const u=(users().users||[]).find(x=>String(x.id)===String(userId));if(u&&u.playerId)return sendPush({ids:[u.playerId],headings:h,contents:c2,url});return{ok:false,reason:'المستخدم مش مفعّل الإشعارات'}}
global.sendPush=sendPush;global.notifyUser=notifyUser;
app.get('/api/onesignal/config',(req,res)=>res.json({appId:cfg().appId||''}));
app.post('/api/onesignal/config',(req,res)=>{saveCfg({appId:req.body.appId||'',restKey:req.body.restKey||''});res.json({ok:true})});
app.post('/api/notifications/register',(req,res)=>{const t=req.headers['x-auth-token'];const db=users();if(!t||!db.tokens[t])return res.json({error:'login'});const u=(db.users||[]).find(x=>x.id===db.tokens[t]);if(!u)return res.json({error:'user'});if(req.body.playerId)u.playerId=req.body.playerId;saveUsers(db);res.json({ok:true})});
app.post('/api/notifications/unlink',(req,res)=>{const t=req.headers['x-auth-token'];const db=users();if(t&&db.tokens[t]){const u=(db.users||[]).find(x=>x.id===db.tokens[t]);if(u){delete u.playerId;saveUsers(db)}}res.json({ok:true})});
app.post('/api/notify',(req,res)=>{const b=req.body||{};
 if(b.to==='one')return res.json(notifyUser(b.userId,b.headings,b.contents,b.url));
 if(b.to==='group'){const ids=(users().users||[]).filter(u=>(b.userIds||[]).includes(String(u.id))||((b.field&&b.filter)&&String(u[b.field])===String(b.filter))).map(u=>u.playerId).filter(Boolean);return res.json(sendPush({ids,headings:b.headings,contents:b.contents,url:b.url,image:b.image,schedule:b.schedule}));}
 res.json(sendPush({headings:b.headings,contents:b.contents,url:b.url,image:b.image,schedule:b.schedule}));});
app.get('/api/admin/notiflog',(req,res)=>res.json(readJSON('affiliate-data.json',{}).notifLog||[]));
app.post('/api/admin/credit',(req,res)=>{const b=req.body||{};const db=users();const u=(db.users||[]).find(x=>String(x.id)===String(b.userId));if(!u)return res.json({error:'user'});u.balance=(u.balance||0)+(+b.amount||0);u.salesCount=(u.salesCount||0)+1;u.sales=u.sales||[];u.sales.unshift({name:b.reason||'عمولة',commission:+b.amount||0});saveUsers(db);notifyUser(u.id,'💰 رصيد جديد','تمت إضافة '+(+b.amount||0)+' ج.م لرصيدك','/');res.json({ok:true})});
};
