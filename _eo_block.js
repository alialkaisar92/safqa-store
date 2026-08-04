
// ===== EasyOrders Integration (status + connect + export) =====
var _eoApiKey = (data && data.eoApiKey) || null;
app.get('/api/easyorders/status', function(req,res){ res.json({connected: !!_eoApiKey}); });
app.post('/api/easyorders/connect', checkAdmin, function(req,res){
  var key = (req.body||{}).apiKey;
  if(!key) return res.status(400).json({ok:false,error:'API Key مطلوب'});
  fetch('https://api.easy-orders.net/api/v1/external-apps/products',{headers:{'Api-Key':key}})
    .then(function(r){ if(r.ok){ _eoApiKey=key; data.eoApiKey=key; try{saveData();}catch(e){} res.json({ok:true}); } else res.status(401).json({ok:false,error:'API Key غلط أو مش صالح'}); })
    .catch(function(e){ res.status(500).json({ok:false,error:'تعذّر الاتصال بـ EasyOrders'}); });
});
app.post('/api/easyorders/export', checkAdmin, function(req,res){
  if(!_eoApiKey) return res.status(400).json({ok:false,error:'اربط EasyOrders الأول من لوحة الأدمن'});
  var p = req.body||{};
  var product = { name:p.name||'منتج', price:Number(p.price)||0, sale_price:Number(p.sale_price)||Number(p.price)||0, description:p.description||'', slug:String(p.name||'product').replace(/[^a-zA-Z0-9]/g,'-').toLowerCase()+'-'+Date.now(), sku:String(p.id||('sq-'+Date.now())), thumb:p.image||'', images:p.image?[p.image]:[], quantity:Number(p.stock)||100, track_stock:true };
  fetch('https://api.easy-orders.net/api/v1/external-apps/products',{method:'POST',headers:{'Api-Key':_eoApiKey,'Content-Type':'application/json'},body:JSON.stringify(product)})
    .then(function(r){ return r.json().then(function(j){ return {ok:r.ok, j:j, st:r.status}; }).catch(function(){ return {ok:r.ok, j:{}, st:r.status}; }); })
    .then(function(res2){ if(res2.ok) res.json({ok:true,data:res2.j}); else res.status(res2.st||400).json({ok:false,error:(res2.j&&res2.j.message)||'فشل التصدير'}); })
    .catch(function(e){ res.status(500).json({ok:false,error:'تعذّر الاتصال بـ EasyOrders'}); });
});
