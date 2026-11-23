import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'dist');
const endpoint=new URL(process.env.SUPABASE_URL || 'about:blank');
const key=process.env.SUPABASE_PUBLISHABLE_KEY || '';
const localTest=endpoint.protocol==='http:' && ['localhost','127.0.0.1'].includes(endpoint.hostname);
if ((!localTest && endpoint.protocol!=='https:') || endpoint.username || endpoint.password || endpoint.origin!==endpoint.href.replace(/\/$/,'') || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
  throw Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to the project URL and its public sb_publishable_ key.');
}
const files=new Map();
const read=name=>fs.readFile(path.join(root,name),'utf8');
for(const name of ['app.html','app.js','app.css','quod.js','planning.js','workflows.js','recovery.js','research.html','research.css','feedback.html','pilot-feedback.js','welcome.css','index.html','welcome.html','forest.jpg','icon.png','icon-512.png','manifest.webmanifest']) {
  files.set(name,await fs.readFile(path.join(root,name)));
}
const templates=await read('accounts/shell.html');
const app=await read('app.html');
const scripts=[...app.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(match=>match[1].split('?')[0]);
if(scripts.length!==5) throw Error('Review the workspace script list before building.');
files.set('app.html',app.replace(/<script src="[^"]+" defer><\/script>/g,'')
  .replace('</head>','<link rel="stylesheet" href="./account.css"><meta name="referrer" content="no-referrer"></head>')
  .replace('<div id="workspace"></div>',templates+'<div id="workspace"></div>')
  .replace('</body>','<script src="./vendor/supabase.js"></script><script src="./account-config.js"></script><script type="module" src="./account.js"></script></body>'));
for(const name of ['account.js','account.css','sync.js']) files.set(name,await read('accounts/'+name));
for(const name of await fs.readdir(path.join(root,'node_modules/@supabase/supabase-js/dist/umd'))) {
  if(name.endsWith('.js')) files.set('vendor/'+name,await fs.readFile(path.join(root,'node_modules/@supabase/supabase-js/dist/umd',name)));
}
files.set('account-config.js','window.quodConfig='+JSON.stringify({url:endpoint.origin,key,scripts})+';');
for(const name of ['index.html','welcome.html']){
  files.set(name,files.get(name).toString().replace('>Open Quod<','>Sign in<')
    .replace('Quod saves your plan, notes, and research log in your browser.', 'Sign in to save your projects, notes, and research log to your private account and open them on another device.')
    .replace('Workspace data stays in your browser','Private account with cloud saving'));
}
const hash=createHash('sha256');
for(const data of files.values()) hash.update(data);
const release=hash.digest('hex').slice(0,16);
const cacheKey='quod-account-shell-'+release;
const precache=['./',...Array.from(files.keys(),name=>'./'+name)];
// Public application assets only. Never cache authentication or database responses.
files.set('sw.js',`const cacheKey=${JSON.stringify(cacheKey)};
const paths=${JSON.stringify(precache)};
self.addEventListener('install',e=>e.waitUntil(caches.open(cacheKey).then(c=>c.addAll(paths.map(p=>new Request(p,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('quod-account-shell-')&&k!==cacheKey).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==location.origin) return;
  // Pages serves HTML on extensionless URLs after redirecting the .html route.
  const pagePath=e.request.mode==='navigate' && /\\/(app|welcome|feedback|research)$/.test(url.pathname)?url.pathname+'.html':url.pathname;
  const clean=new URL(pagePath,url.origin).href;
  if(!paths.some(p=>new URL(p,self.registration.scope).href===clean)) return;
  e.respondWith(caches.open(cacheKey).then(async c=>{
    const cached=await c.match(clean);
    if(!cached) return fetch(e.request);
    return cached.redirected?new Response(cached.body,{status:cached.status,headers:cached.headers}):cached;
  }));
});`);
files.set('_headers','/*\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Cache-Control: no-cache\n');
for(const [name,data] of files){
  const target=path.join(out,name);
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,data);
}
console.log('Built account website in dist.');
