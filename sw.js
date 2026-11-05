// Приложение открывается без интернета. Сначала пробуем сеть, чтобы обновления
// приходили сразу; кэш — если сети нет или она не ответила за 3 секунды.
const CACHE='habits-shell-v1';
const FILES=['./','manifest.json','icon-180.png','icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});

async function handle(req){
  const cache=await caches.open(CACHE);
  const key=req.mode==='navigate'?'./':req;
  // no-cache: сверяемся с сервером, а не берём старую копию из HTTP-кэша браузера
  const net=fetch(req.url,{cache:'no-cache'}).then(r=>{
    if(r.ok)cache.put(key,r.clone());
    return r;
  });
  net.catch(()=>{});
  try{
    return await Promise.race([net,new Promise((_,rej)=>setTimeout(rej,3000))]);
  }catch(e){
    const hit=await cache.match(key,{ignoreSearch:true});
    return hit||net;
  }
}

self.addEventListener('fetch',e=>{
  // запросы к скрипту Google не трогаем: они идут напрямую
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(handle(e.request));
});
