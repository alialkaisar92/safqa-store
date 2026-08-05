module.exports=function(app){
const crypto=require('crypto');const fs=require('fs');const path=require('path');
const SECRET=process.env.JWT_SECRET||'earnify_jwt_secret_2026';
const USERS_FILE=path.join(__dirname,'store-users.json');
function loadUsers(){try{return JSON.parse(fs.readFileSync(USERS_FILE,'utf8'))}catch(e){return{users:[],refresh:{}}}}
function saveUsers(u){fs.writeFileSync(USERS_FILE,JSON.stringify(u,null,2))}
function hashPw(p){return crypto.createHash('sha256').update('earnify:'+String(p)).digest('hex')}
function b64u(o){return Buffer.from(JSON.stringify(o)).toString('base64url')}
function sign(uid,expSec){const h=b64u({alg:'HS256',typ:'JWT'});const p=b64u({uid:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+expSec});const s=crypto.createHmac('sha256',SECRET).update(h+'.'+p).digest('base64url');return h+'.'+p+'.'+s}
function verify(t){if(!t)return null;try{const a=String(t).split('.');if(a.length!==3)return null;const s=crypto.createHmac('sha256',SECRET).update(a[0]+'.'+a[1]).digest('base64url');if(s!==a[2])return null;const pl=JSON.parse(Buffer.from(a[1],'base64url').toString());if(pl.exp*1000<Date.now())return null;return pl}catch(e){return null}}
global.verifyJWT=verify;
global.requireAuth=function(req,res,next){const t=req.headers['x-auth-token']||String(req.headers.authorization||'').replace('Bearer ','');const pl=verify(t);if(!pl)return res.status(401).json({error:'login'});req.userId=pl.uid;next()};
function pub(u){return{id:u.id,name:u.name,contact:u.contact,balance:u.balance||0}}
function issue(db,u){const access=sign(u.id,7200);const refresh=crypto.randomBytes(24).toString('hex');db.refresh=db.refresh||{};db.refresh[refresh]={uid:u.id,exp:Date.now()+7*864e5};saveUsers(db);return{access,refresh}}
app.post('/api/auth/register',(req,res)=>{const b=req.body||{};if(!b.name||!b.password||!b.contact)return res.json({error:'املأ كل الحقول'});if(String(b.password).length<6)return res.json({error:'كلمة السر 6 أحرف على الأقل'});const db=loadUsers();const cid=String(b.contact).trim();if(db.users.some(u=>u.contact===cid))return res.json({error:'الحساب موجود، سجّل دخول'});const u={id:Date.now(),name:String(b.name).trim(),contact:cid,pass:hashPw(b.password),balance:0,created:new Date().toISOString()};db.users.push(u);const t=issue(db,u);res.json({ok:true,token:t.access,refresh:t.refresh,user:pub(u)})});
app.post('/api/auth/login',(req,res)=>{const b=req.body||{};const db=loadUsers();const u=db.users.find(x=>x.contact===String(b.contact||'').trim());if(!u||u.pass!==hashPw(b.password||''))return res.json({error:'بيانات الدخول غلط'});if(u.banned)return res.json({error:'الحساب محظور'});u.lastSeen=Date.now();const t=issue(db,u);res.json({ok:true,token:t.access,refresh:t.refresh,user:pub(u)})});
app.post('/api/auth/refresh',(req,res)=>{const r=req.body&&req.body.refresh;const db=loadUsers();const rec=db.refresh&&db.refresh[r];if(!rec||rec.exp<Date.now())return res.status(401).json({error:'login'});const u=db.users.find(x=>x.id===rec.uid);if(!u||u.banned)return res.status(401).json({error:'login'});delete db.refresh[r];const t=issue(db,u);res.json({ok:true,access:t.access,refresh:t.refresh,user:pub(u)})});
app.post('/api/auth/logout',(req,res)=>{const r=req.body&&req.body.refresh;const db=loadUsers();if(r&&db.refresh&&db.refresh[r]){delete db.refresh[r];saveUsers(db)}res.json({ok:true})});
app.get('/api/auth/me',(req,res)=>{const pl=verify(req.headers['x-auth-token']);if(!pl)return res.status(401).json({logged:false});const db=loadUsers();const u=db.users.find(x=>x.id===pl.uid);if(!u)return res.status(401).json({logged:false});if(u.banned)return res.json({logged:false,banned:true});u.lastSeen=Date.now();saveUsers(db);res.json({logged:true,user:pub(u)})});
app.post('/api/auth/ping',(req,res)=>{const pl=verify(req.headers['x-auth-token']);if(!pl)return res.json({ok:false});const db=loadUsers();const u=db.users.find(x=>x.id===pl.uid);if(u&&!u.banned){u.lastSeen=Date.now();if(req.body&&req.body.action){u.lastAction=req.body.action;u.activity=u.activity||[];u.activity.unshift({a:req.body.action,t:Date.now()});u.activity=u.activity.slice(0,100)}saveUsers(db);return res.json({ok:true})}res.json({ok:false})});
/* بيانات معزولة لكل مستخدم */
app.get('/api/my/orders',global.requireAuth,(req,res)=>{const db=loadUsers();const u=db.users.find(x=>x.id===req.userId);let d=[];try{d=JSON.parse(fs.readFileSync(path.join(__dirname,'affiliate-data.json'),'utf8')).orders||[]}catch(e){}
res.json(d.filter(o=>o.userId===req.userId||(u&&o.client_phone1===u.contact)))});
app.get('/api/my/profile',global.requireAuth,(req,res)=>{const db=loadUsers();const u=db.users.find(x=>x.id===req.userId);res.json(u?{name:u.name,phone:u.contact,balance:u.balance||0}:{})});
app.post('/api/my/profile',global.requireAuth,(req,res)=>{const db=loadUsers();const u=db.users.find(x=>x.id===req.userId);if(u){if(req.body.name)u.name=String(req.body.name);if(req.body.phone)u.contact=String(req.body.phone);saveUsers(db)}res.json({ok:true})});
app.get('/login',(req,res)=>res.sendFile(path.join(__dirname,'login.html')));
app.get('/register',(req,res)=>res.sendFile(path.join(__dirname,'login.html')));
};