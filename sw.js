'use strict';
const cacheName='quod-phd-pilot-shell-v6';
const files=["./","./index.html","./welcome.html","./app.html","./research.html","./manifest.webmanifest","./app.css?v=6","./app.js?v=6","./quod.js?v=6","./workflows.js?v=6","./welcome.css","./research.css","./pilot-feedback.js","./forest.jpg","./icon.png","./icon-512.png","./feedback.html"];
self.addEventListener('install',event=>event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(files.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('quod-phd-pilot-shell-')&&key!==cacheName).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==location.origin) return;
  if(request.mode==='navigate'){
    const name=new URL(request.url).pathname.split('/').at(-1);
    const page=['app.html','feedback.html','research.html','welcome.html'].includes(name)?'./'+name:'./index.html';
    event.respondWith(fetch(request).catch(()=>caches.match(page)));
    return;
  }
  event.respondWith(caches.match(request).then(resource=>resource||fetch(request)));
});
