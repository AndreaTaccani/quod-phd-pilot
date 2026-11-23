import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const owner=randomUUID(), other=randomUUID();
const identities=new Map(), codes=new Map(), rows=new Map();
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const parts=[];
    for await(const part of req) parts.push(part);
    const body=parts.length?JSON.parse(Buffer.concat(parts)):null;
    function json(data,code=200){res.writeHead(code,{'Content-Type':'application/json'}).end(JSON.stringify(data));}
    if(url.pathname==='/auth/v1/otp'){
      assert.ok(body.code_challenge);
      codes.set(body.email,{code:randomUUID(),challenge:body.code_challenge});return json({});
    }
    if(url.pathname==='/auth/v1/token'){
      const match=[...codes].find(([,v])=>v.code===body.auth_code);
      assert.ok(match && createHash('sha256').update(body.code_verifier).digest('base64url')===match[1].challenge);
      const [email]=match; codes.delete(email);
      const id=email==='second@example.test'?other:owner;
      const user={id,email,app_metadata:{},user_metadata:{},aud:'authenticated',created_at:new Date().toISOString()};
      const encode=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url');
      const token=[encode({alg:'HS256',typ:'JWT'}),encode({sub:id,exp:Math.floor(Date.now()/1000)+3600}),encode('local-test')].join('.');
      identities.set(token,user);
      return json({access_token:token,refresh_token:randomUUID(),token_type:'bearer',expires_in:3600,user});
    }
    if(url.pathname.startsWith('/auth/')||url.pathname.startsWith('/rest/')){
      const user=identities.get(req.headers.authorization?.replace(/^Bearer /,''));
      if(!user) return json({},401);
      if(url.pathname==='/auth/v1/user') return json(user);
      if(url.pathname==='/auth/v1/logout') return json({});
      const row=rows.get(user.id);
      if(req.method==='GET') return json(row?[row]:[]);
      if(body.account_id!==user.id) return json({},403);
      if((row?.revision||0)!==body.expected_revision) return json(null);
      const next={revision:body.expected_revision+1,document:body.contents};
      rows.set(user.id,next);return json(next.revision);
    }
    if(url.pathname==='/app.html'){
      res.writeHead(308,{Location:'/app'+url.search}).end();return;
    }
    const file=resolve('dist','.'+(url.pathname==='/'?'/index.html':url.pathname==='/app'?'/app.html':url.pathname));
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]||'text/plain'}).end(data);
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
  execFileSync(process.execPath,['accounts/build.mjs'],{env:{...process.env,SUPABASE_URL:origin,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_localtest'}});
  const executablePath=process.env.CHROME_PATH || (process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined);
  browser=await chromium.launch({executablePath});
  async function login(page,email){
    await page.goto(origin+'/app.html');
    await page.getByLabel('Email address').fill(email);
    await page.getByText('Send sign-in link',{exact:true}).click();
    await page.getByText(/Check your inbox/).waitFor();
    await page.goto(origin+'/app.html?code='+codes.get(email).code);
    await page.locator('#account-menu').waitFor();
    if(await page.locator('#account-dialog').isVisible()) await page.locator('#account-close').click();
  }
  const a=await browser.newContext(), b=await browser.newContext(), p=await a.newPage(), q=await b.newPage();
  const errors=[];
  for(const page of [p,q]) page.on('pageerror',e=>errors.push(e.message));
  await login(p,'first@example.test');
  const backup=await p.evaluate(()=>{const s=blank();s.projects.push({id:'paper',title:'Private paper'});return JSON.stringify(s);});
  await p.locator('#account-menu').click();
  await p.locator('#import-backup').click();
  await p.locator('#modal input[type=file]').setInputFiles({name:'pilot.json',mimeType:'application/json',buffer:Buffer.from(backup)});
  await p.locator('#modal button[type=submit]').click();
  await p.locator('[data-action=restore-confirm]').click();
  await p.waitForFunction(()=>document.querySelector('#sync-status').textContent==='Saved to your account');
  assert.equal(JSON.parse(rows.get(owner).document).projects[0].title,'Private paper');
  await login(q,'first@example.test');
  assert.equal(await q.evaluate(()=>state.projects[0].title),'Private paper');
  await p.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await a.setOffline(true);
  await p.reload();
  await p.locator('#account-menu').waitFor();
  await p.evaluate(()=>{state.projects[0].title='Offline research';commit();});
  await q.evaluate(()=>{state.projects[0].title='New cloud research';commit();});
  await q.waitForFunction(()=>document.querySelector('#sync-status').textContent==='Saved to your account');
  await a.setOffline(false);
  await p.waitForFunction(()=>document.querySelector('#sync-status').textContent.includes('Another device'));
  assert.equal(await p.evaluate(()=>state.projects[0].title),'Offline research');
  assert.equal(JSON.parse(rows.get(owner).document).projects[0].title,'New cloud research');
  await p.locator('#account-menu').click();
  const file=p.waitForEvent('download');
  await p.locator('#open-cloud').click();
  const downloaded=await file;
  assert.equal(JSON.parse(await readFile(await downloaded.path(),'utf8')).projects[0].title,'Offline research');
  await p.waitForFunction(()=>typeof state!=='undefined' && state.projects[0]?.title==='New cloud research');
  await a.setOffline(true);
  await p.evaluate(()=>{state.projects[0].title='Second offline draft';commit();});
  await p.reload();
  await p.locator('#account-menu').waitFor();
  assert.equal(await p.evaluate(()=>state.projects[0].title),'Second offline draft');
  await a.setOffline(false);
  await p.waitForFunction(()=>document.querySelector('#sync-status').textContent==='Saved to your account');
  assert.equal(JSON.parse(rows.get(owner).document).projects[0].title,'Second offline draft');
  await q.reload();
  await q.locator('#account-menu').waitFor();
  assert.equal(await q.evaluate(()=>state.projects[0].title),'Second offline draft');
  const duplicate=await a.newPage();
  await duplicate.goto(origin+'/app');
  await duplicate.getByText('Quod is open in another tab',{exact:true}).waitFor();
  await duplicate.close();
  await p.locator('#account-menu').click();
  await p.locator('#sign-out').click();
  await p.getByLabel('Email address').waitFor();
  await login(p,'second@example.test');
  assert.equal(await p.evaluate(()=>state.projects.length),0);
  assert.deepEqual(errors,[]);
  console.log('Email-link flow, pilot backup import, cross-device save, offline reload, conflict recovery, sign-out, and account isolation passed using a local service fixture.');
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
