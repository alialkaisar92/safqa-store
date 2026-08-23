/* sw.js — يتعامل مع الـ push الحقيقي ويعرض إشعار نظام احترافي */
self.addEventListener('push',function(e){
  var d={title:'Rab7na',body:'عندك تحديث جديد',tag:'rab7na',icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',vibrate:[0,60,40,60],requireInteraction:false,data:{url:'/store'}};
  try{if(e.data){var j=e.data.json();if(j.title)d.title=j.title;if(j.body)d.body=j.body;else if(j.contents)d.body=typeof j.contents==='string'?j.contents:(j.contents.ar||j.contents.en||d.body);if(j.tag)d.tag=j.tag;if(j.url)d.data={url:j.url};}}catch(_){}
  e.waitUntil(self.registration.showNotification(d.title,d));
});
self.addEventListener('notificationclick',function(e){
  e.notification.close();
  var url=(e.notification.data&&e.notification.data.url)||'/';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(cs){
    for(var i=0;i<cs.length;i++){if(cs[i].url&&cs[i].url.indexOf(self.location.origin)===0){return cs[i].focus();}}
    return clients.openWindow(url);
  }));
});
self.addEventListener('message',function(e){var d=e.data||{};if(d.type==='show'){self.registration.showNotification(d.title||'Rab7na',{body:d.body||'',tag:d.tag||'rab7na',icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',vibrate:[0,60,40,60]});}});
