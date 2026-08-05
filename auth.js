module.exports=function(app){
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const USERS_FILE=path.join(__dirname,'store-users.json');
function loadUsers(){try{return JSON.parse(fs.readFileSync(USERS_FILE,'utf8'))}catch(e){return{users:[],tokens:{}}}}
function saveUsers(u){fs.writeFileSync(USERS_FILE,JSON.stringify(u,null,2))}
function hashPw(p){return crypto.createHash('sha256').update('earnify:'+String(p)).digest('hex')}
function mkToken(){return crypto.randomBytes(24).toString('hex')}
function authUser(req){const t=req.headers['x-auth-token'];const db=loadUsers();if(!t||!db.tokens[t])return null;return db.users.find(u=>u.id===db.tokens[t])||null}
app.post('/api/auth/register',(req,res)=>{const b=req.body||{};
if(!b.name||!b.password||!b.contact)return res.json({error:'املأ كل الحقول'});
if(String(b.password).length<6)return res.json({error:'كلمة السر 6 أحرف على الأقل'});
const db=loadUsers();const cid=String(b.contact).trim();
if(db.users.some(u=>u.contact===cid))return res.json({error:'الحساب ده موجود بالفعل، سجّل دخول'});
const user={id:Date.now(),name:String(b.name).trim(),contact:cid,pass:hashPw(b.password),balance:0,created:new Date().toISOString()};
db.users.push(user);const tok=mkToken();db.tokens[tok]=user.id;saveUsers(db);
res.json({ok:true,token:tok,user:{id:user.id,name:user.name,contact:user.contact,balance:user.balance}})});
app.post('/api/auth/login',(req,res)=>{const b=req.body||{};const db=loadUsers();
const u=db.users.find(x=>x.contact===String(b.contact||'').trim());
if(!u||u.pass!==hashPw(b.password||''))return res.json({error:'بيانات الدخول غلط'});
if(u.banned)return res.json({error:'الحساب ده محظور'});
const tok=mkToken();db.tokens[tok]=u.id;saveUsers(db);
res.json({ok:true,token:tok,user:{id:u.id,name:u.name,contact:u.contact,balance:u.balance}})});
app.post('/api/auth/logout',(req,res)=>{const t=req.headers['x-auth-token'];const db=loadUsers();if(t&&db.tokens[t]){delete db.tokens[t];saveUsers(db)}res.json({ok:true})});
app.get('/api/auth/me',(req,res)=>{const t=req.headers['x-auth-token'];const db=loadUsers();if(!t||!db.tokens[t])return res.json({logged:false});const u=db.users.find(x=>x.id===db.tokens[t]);if(!u)return res.json({logged:false});if(u.banned){delete db.tokens[t];saveUsers(db);return res.json({logged:false,banned:true});}u.lastSeen=Date.now();saveUsers(db);res.json({logged:true,user:{id:u.id,name:u.name,contact:u.contact,balance:u.balance}})});
app.post('/api/auth/ping',(req,res)=>{const t=req.headers['x-auth-token'];const db=loadUsers();if(t&&db.tokens[t]){const u=db.users.find(x=>x.id===db.tokens[t]);if(u&&!u.banned){u.lastSeen=Date.now();if(req.body&&req.body.action){u.lastAction=req.body.action;u.activity=u.activity||[];u.activity.unshift({a:req.body.action,t:Date.now()});u.activity=u.activity.slice(0,100);}saveUsers(db);return res.json({ok:true});}}res.json({ok:false})});
};
