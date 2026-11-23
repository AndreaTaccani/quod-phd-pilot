import {WorkspaceSync} from './sync.js';

const el=id=>document.getElementById(id);
const gate=el('account-gate'), form=el('email-form'), bar=el('account-bar'), menu=el('account-dialog');
const config=window.quodConfig;
const client=window.supabase.createClient(config.url,config.key,{auth:{flowType:'pkce'}});
const demo=new URLSearchParams(location.search).get('demo')==='1';
if(!demo && new URLSearchParams(location.search).get('pilot')==='1') sessionStorage.setItem('quod.joinPilot','1');
let owner, sync, timer, signingOut=false;

function showGate(title,message,showForm=false,retry=false){
  gate.hidden=false;
  el('gate-heading').textContent=title;
  el('gate-message').textContent=message;
  form.hidden=!showForm;
  el('retry-open').hidden=!retry;
}
function status(message){
  if(window.quodDeviceSaved?.()===false) message='Changes need a backup. Download your workspace from Account.';
  el('sync-status').textContent=message;
  el('account-detail').textContent=message;
  el('conflict-actions').hidden=!sync?.conflict;
  const updated=sync?.conflict==='updated';
  el('version-message').textContent=updated?'There is a newer saved version in your account.':'Both devices have edits. Download the work from this device before opening the cloud version.';
  el('open-cloud').textContent=updated?'Open updated workspace':'Download this copy and open cloud version';
}
async function loadWorkspace(){
  for(const src of config.scripts){
    const script=document.createElement('script');
    script.src=src;
    await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject;document.head.append(script);});
  }
  gate.hidden=true;
  bar.hidden=demo;
}
function apiFor(userId){
  return {
    async read(){
      const {data,error}=await client.from('quod_workspaces').select('revision,document').eq('owner_id',userId).maybeSingle();
      if(error) throw error;
      return data;
    },
    async write(revision,document){
      if(!window.quodDeviceSaved?.()) throw Error('Device copy needs recovery.');
      const {data,error}=await client.rpc('quod_save_workspace',{account_id:userId,expected_revision:revision,contents:document});
      if(error) throw error;
      return data;
    }
  };
}
function schedule(){
  if(!sync||sync.closed) return;
  status(navigator.onLine?'Changes waiting to sync':'Offline · changes saved on this device');
  clearTimeout(timer);
  timer=setTimeout(()=>sync.sync(),650);
}
function invalidate(){
  if(sync) sync.closed=true;
  if(menu.open) menu.close();
  el('workspace').replaceChildren();
  bar.hidden=true;
  location.reload();
}
async function enter(session){
  owner=session.user.id;
  el('account-email').textContent=session.user.email;
  const key='quod.account.v1.'+owner;
  // One editor per account on this browser. Different devices use database revisions.
  if(!navigator.locks) throw Error('Open Quod in a browser with Web Locks support.');
  await navigator.locks.request(key,{ifAvailable:true},async lock=>{
    if(!lock){showGate('Quod is open in another tab','Continue there, or close that tab and try again.',false,true);return;}
    sync=new WorkspaceSync(localStorage,key,apiFor(owner),status);
    await sync.sync(true);
    if(sessionStorage.getItem('quod.joinPilot')){
      const url=new URL(location.href);
      url.searchParams.set('pilot','1');
      history.replaceState(null,'',url);
      sessionStorage.removeItem('quod.joinPilot');
    }
    window.quodAccount={key,onSave:schedule,onSaveFailure:()=>status('Changes need a backup. Download your workspace from Account.')};
    await loadWorkspace();
    if(!sync.local && !new URLSearchParams(location.search).has('pilot') && !document.querySelector('#modal[open]')) menu.showModal();
    if(sync.local && !sync.conflict && window.quodDeviceSaved()) sync.sync();
    let lastCheck=Date.now();
    setInterval(()=>{
      if(!sync.closed && !document.hidden && Date.now()-lastCheck>=30000){
        lastCheck=Date.now();sync.sync();
      }
    },5000);
    window.addEventListener('online',()=>sync.sync());
    window.addEventListener('offline',()=>status('Offline · work stays on this device until it syncs.'));
    window.addEventListener('focus',()=>{if(!signingOut)sync.sync();});
    await new Promise(()=>{});
  });
}
async function start(){
  if(demo) return loadWorkspace();
  const {data,error}=await client.auth.getSession();
  // The SDK exchanges the emailed PKCE code before resolving session initialization.
  if(error || !data.session){
    showGate('Sign in to Quod',error?'Your link could not be opened. Request a fresh link in this browser.':'Enter your email to open your private workspace on this device.',true);
    return;
  }
  await enter(data.session);
}
client.auth.onAuthStateChange((event,session)=>{
  if(demo||signingOut) return;
  if(owner && (!session || session.user.id!==owner)) invalidate();
  else if(!owner && !form.hidden && session && event==='SIGNED_IN') location.reload();
});
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const submit=form.querySelector('button');
  submit.disabled=true;
  try{
    const {error}=await client.auth.signInWithOtp({email:form.elements.email.value.trim(),options:{emailRedirectTo:location.origin+location.pathname}});
    if(error) throw error;
    el('gate-message').textContent='Check your inbox and open the sign-in link in this browser. You can request a fresh link if it expires.';
  }catch{el('gate-message').textContent='Quod could not send the link. Check your connection and email address, then try again in a minute.';}
  finally{submit.disabled=false;}
});
el('retry-open').onclick=()=>location.reload();
el('account-menu').onclick=()=>menu.showModal();
el('account-close').onclick=()=>menu.close();
el('sync-now').onclick=()=>sync.sync();
el('account-export').onclick=()=>window.quodExportCurrent();
el('import-backup').onclick=()=>{menu.close();window.quodImportBackup();};
el('open-cloud').onclick=async event=>{
  if(!sync.conflict) return;
  const btn=event.currentTarget;
  btn.disabled=true;
  try{
    if(sync.busy) await sync.busy;
    const row=await sync.remote.read();
    if(!row) throw Error();
    // Validate before downloading or replacing either copy.
    window.quodValidateWorkspace(row.document);
    if(!window.quodDeviceSaved() || await sync.hasLocalEdits()) window.quodExportCurrent();
    sync.closed=true;
    await sync.adopt(row);
    location.reload();
  }catch{sync.closed=false;status('Could not open the cloud version. Your device copy has been kept.');}
  finally{btn.disabled=false;}
};
el('sign-out').onclick=async event=>{
  const btn=event.currentTarget;
  btn.disabled=true;
  try{
    if(!window.quodDeviceSaved() || !await sync.sync()){status('Sign out after syncing or resolving the other version. You can download your current workspace here.');return;}
    const savedBeforeSignout=sync.local;
    signingOut=true;sync.closed=true;
    const {error}=await client.auth.signOut({scope:'local'});
    if(error) throw error;
    if(sync.local===savedBeforeSignout){
      localStorage.removeItem(sync.key);
      localStorage.removeItem(sync.metaKey);
      window.quodCloseRecovery?.();
      indexedDB.deleteDatabase(sync.key+'.recovery');
    }
    invalidate();
  }catch{signingOut=false;sync.closed=false;status('Could not sign out. Try again when connected.');}
  finally{btn.disabled=false;}
};
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
window.addEventListener('pageshow',event=>{if(event.persisted&&!demo) location.reload();});
start().catch(()=>showGate('Couldn’t open your workspace','Connect to the internet and try again. Quod keeps saved work on this device.',false,true));
