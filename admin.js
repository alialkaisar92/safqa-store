module.exports=function(app){
const fs=require('fs'),path=require('path');
function readJSON(f,def){try{return JSON.parse(fs.readFileSync(path.join(__dirname,f),'utf8'))}catch(e){return def}}
function data(){return readJSON('affiliate-data.json',{orders:[],withdrawals:[],products:[]})}
function users(){return readJSON('store-users.json',{users:[]})}
function chats(){return readJSON('chat.json',{})}
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'admin.html')));
app.get('/api/admin/stats',(req,res)=>{
 const d=data(),u=users(),c=chats();
 const orders=d.orders||[];
 const commission=orders.reduce((s,o)=>s+(+o.commission||0),0);
 const sales=orders.filter(o=>o.status==='تم التسليم').length;
 const byStatus={};orders.forEach(o=>{byStatus[o.status]=(byStatus[o.status]||0)+1});
 res.json({orders:orders.length,commission,sales,users:u.users.length,products:(d.products||[]).length,
  withdrawals:(d.withdrawals||[]).filter(w=>w.status==='pending').length,
  chats:Object.keys(c).length,byStatus,recent:orders.slice(0,8)});
});

function writeData(d){fs.writeFileSync(path.join(__dirname,'affiliate-data.json'),JSON.stringify(d,null,2))}
app.get('/api/admin/orders',(req,res)=>res.json(data().orders||[]));
app.post('/api/admin/order-status',(req,res)=>{const b=req.body||{};const d=data();const o=(d.orders||[]).find(x=>String(x.id)===String(b.id));if(!o)return res.json({error:'مش موجود'});o.status=b.status;writeData(d);if(global.sendPush)global.sendPush({headings:'📦 تحديث حالة طلب',contents:'حالة طلبك الآن: '+b.status,url:'/'});res.json({ok:true})});


app.get('/api/admin/products',(req,res)=>res.json(data().products||[]));
app.post('/api/admin/product',(req,res)=>{const b=req.body||{};const d=data();d.products=d.products||[];
if(b.id){const p=d.products.find(x=>String(x.id)===String(b.id));if(p)Object.assign(p,b);}else{b.id=Date.now();d.products.push(b);if(global.sendPush)global.sendPush({headings:'🛍️ منتج جديد',contents:b.name,url:'/'});}
writeData(d);res.json({ok:true})});
app.post('/api/admin/product-delete',(req,res)=>{const d=data();d.products=(d.products||[]).filter(x=>String(x.id)!==String(req.body.id));writeData(d);res.json({ok:true})});


app.get('/api/admin/price',(req,res)=>{const d=data();res.json({up:d.priceUp||0})});
app.post('/api/admin/price-up',(req,res)=>{const d=data();let v=+(req.body&&req.body.up)||0;v=Math.max(0,Math.min(200,v));d.priceUp=v;writeData(d);res.json({ok:true,up:v})});


function writeUsers(u){fs.writeFileSync(path.join(__dirname,'store-users.json'),JSON.stringify(u,null,2))}
app.get('/api/admin/users',(req,res)=>{const db=users();const now=Date.now();res.json((db.users||[]).map(function(u){return {id:u.id,name:u.name,contact:u.contact,balance:u.balance||0,created:u.created,lastSeen:u.lastSeen||0,banned:!!u.banned,lastAction:u.lastAction||'',activity:(u.activity||[]).slice(0,50),online:!!(u.lastSeen&&now-u.lastSeen<120000)}}))});
app.post('/api/admin/user-ban',(req,res)=>{const db=users();const u=(db.users||[]).find(x=>String(x.id)===String(req.body.id));if(!u)return res.json({error:'مش موجود'});u.banned=!!req.body.banned;if(u.banned){db.tokens=Object.keys(db.tokens||{}).reduce(function(a,k){if(db.tokens[k]!==u.id)a[k]=db.tokens[k];return a},{})}writeUsers(db);res.json({ok:true})});


app.get('/api/admin/withdrawals',(req,res)=>res.json(data().withdrawals||[]));
app.post('/api/admin/withdrawal-status',(req,res)=>{const d=data();const w=(d.withdrawals||[]).find(x=>String(x.id)===String(req.body.id));if(!w)return res.json({error:'مش موجود'});w.status=req.body.status;writeData(d);res.json({ok:true})});


app.get('/api/admin/chats',(req,res)=>res.json(chats()));
app.post('/api/admin/chat-reply',(req,res)=>{const b=req.body||{};const all=chats();all[b.key]=all[b.key]||[];all[b.key].push({id:Date.now(),from:'support',type:'text',text:b.text||'',time:new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})});fs.writeFileSync(path.join(__dirname,'chat.json'),JSON.stringify(all,null,2));if(global.notifyChat)global.notifyChat();if(global.notifyUser&&b.key&&b.key[0]==='u')global.notifyUser(b.key.slice(1),'💬 رد من الدعم',b.text,'/');res.json({ok:true})});


let sse=[];global.notifyChat=function(){sse.forEach(function(f){try{f()}catch(e){}})};
app.get('/api/admin/chat-stream',(req,res)=>{res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.flushHeaders();res.write('data: ok\n\n');const push=function(){res.write('data: '+Date.now()+'\n\n')};sse.push(push);req.on('close',function(){sse=sse.filter(x=>x!==push)});});


app.get('/api/admin/settings',(req,res)=>{const d=data();res.json(d.settings||{name:'Rab7na',currency:'ج.م',whatsapp:'',commission:30,announcement:''})});
app.post('/api/admin/settings',(req,res)=>{const d=data();d.settings=Object.assign(d.settings||{},req.body||{});writeData(d);res.json({ok:true})});

};
