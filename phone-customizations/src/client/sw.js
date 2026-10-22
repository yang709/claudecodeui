const SHELL_CACHE='cloudcli-shell-v4';
const STATIC_CACHE='cloudcli-static-v4';
const SHELL_KEY='/__cloudcli_shell__';
let preparing=null;
const staticPath=path=>path.startsWith('/assets/')||path==='/cloudcli-extensions.js'||path.startsWith('/icons/')||path==='/manifest.json';
function validStatic(response,url){
  if(!response?.ok)return false;
  const type=response.headers.get('content-type')||'';
  if(url.pathname.endsWith('.js'))return /(?:application|text)\/(?:javascript|x-javascript)/i.test(type);
  if(url.pathname.endsWith('.css'))return type.includes('text/css');
  return true;
}
async function cachedStatic(request,{fresh=false}={}){
  const cache=await caches.open(STATIC_CACHE);
  const url=new URL(typeof request==='string'?request:request.url,self.location.origin);
  if(!fresh){const cached=await caches.match(url.href);if(validStatic(cached,url)){await cache.put(url.href,cached.clone());return cached}else if(cached){fresh=true}}
  const response=await fetch(request,{cache:fresh?'reload':'default'});
  if(!validStatic(response,url))throw new Error('Static resource unavailable or invalid MIME type');
  await cache.put(url.href,response.clone());return response;
}
function prepareShell(){
  if(preparing)return preparing;
  preparing=(async()=>{
    const response=await fetch('/',{cache:'no-store'});
    if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw new Error('Shell unavailable');
    const html=await response.clone().text();
    const paths=[...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match=>new URL(match[1],self.location.origin)).filter(url=>url.origin===self.location.origin&&(url.pathname.startsWith('/assets/')||url.pathname==='/cloudcli-extensions.js'));
    const unique=[...new Set(paths.map(url=>url.href))];
    // Promote the HTML only after all its required scripts/styles are available.
    await Promise.all(unique.map(path=>cachedStatic(path,{fresh:new URL(path).pathname==='/cloudcli-extensions.js'})));
    await(await caches.open(SHELL_CACHE)).put(SHELL_KEY,response);
  })().finally(()=>{preparing=null});return preparing;
}
self.addEventListener('install',event=>{event.waitUntil(prepareShell().then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
  // Only remove this app's obsolete cache names; never delete unrelated caches.
  for(const name of await caches.keys())if((name.startsWith('claude-ui-')||name.startsWith('cloudcli-shell-')||name.startsWith('cloudcli-static-'))&&name!==SHELL_CACHE&&name!==STATIC_CACHE)await caches.delete(name);
  await self.clients.claim();
})())});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/ws')||url.pathname==='/sw.js')return;
  if(request.mode==='navigate'){
    event.waitUntil(prepareShell().catch(()=>{}));
    event.respondWith((async()=>{
      const cached=await(await caches.open(SHELL_CACHE)).match(SHELL_KEY);
      if(cached)return cached
      try{return await fetch(request)}catch{return new Response('<meta name="viewport" content="width=device-width"><h1>CloudCLI is offline</h1><p>Check your connection and try again.</p>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}})}
    })());return;
  }
  if(staticPath(url.pathname))event.respondWith(cachedStatic(request));
});

self.addEventListener('push', event => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'CloudCLI', body: event.data.text() };
  }

  const options = {
    body: payload.body || '',
    icon: '/logo-256.png',
    badge: '/logo-128.png',
    data: payload.data || {},
    tag: payload.data?.tag || `${payload.data?.sessionId || 'global'}:${payload.data?.code || 'default'}`,
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'CloudCLI', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const sessionId = event.notification.data?.sessionId;
  const provider = event.notification.data?.provider || null;
  const urlPath = sessionId ? `/session/${sessionId}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          await client.focus();
          client.postMessage({
            type: 'notification:navigate',
            sessionId: sessionId || null,
            provider,
            urlPath
          });
          return;
        }
      }
      return self.clients.openWindow(urlPath);
    })
  );
});
