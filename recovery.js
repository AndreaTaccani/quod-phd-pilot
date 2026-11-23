'use strict';

let recoveryDb, lastRecoveryRaw, recoveryOptions=[], recoveryAvailable=false;
let sampleIds;
function workspaceHasWork(value) {
  if(value.support.pilot||value.support.captures.length||value.rest.length||value.workHours.target||value.settings.name) return true;
  if(!value.sample) return collections.some(key=>value[key].length);
  if(!sampleIds){
    const sample=makeSample();
    sampleIds=new Map(collections.map(key=>[key,new Set(sample[key].map(item=>item.id))]));
  }
  return collections.some(key=>value[key].some(item=>!sampleIds.get(key).has(item.id)||item.updated));
}
function openRecoveryDb() {
  return recoveryDb??=new Promise((resolve,reject)=>{
    const request=indexedDB.open(STORE+'.recovery',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('copies',{keyPath:'key'});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(Error('Recovery storage is busy.'));
  });
}
async function recoveryStore(mode,operation) {
  const db=await openRecoveryDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('copies',mode);
    const request=operation(tx.objectStore('copies'));
    tx.oncomplete=()=>resolve(request.result);
    tx.onabort=()=>reject(tx.error||Error('Recovery storage is unavailable.'));
  });
}
function saveRecoveryCopy(key,raw) {
  return recoveryStore('readwrite',store=>store.put({key,raw,date:Date.now()}));
}
function rememberWorkspace(raw) {
  if(!staticPilotHost||exampleWorkspace||raw===lastRecoveryRaw||!workspaceHasWork(state)) return;
  lastRecoveryRaw=raw;
  saveRecoveryCopy('latest',raw).catch(()=>{if(lastRecoveryRaw===raw) lastRecoveryRaw=null;});
}
function repairForRecovery(raw) {
  const original=JSON.parse(raw);
  const data={...original};
  let repaired=false;
  for(const key of collections){
    if(!Array.isArray(data[key])) continue;
    data[key]=data[key].map(item=>{
      if(!item||typeof item!=='object') return item;
      const bad=invalidScheduleFields(item);
      if(!bad.length) return item;
      repaired=true;
      const originalSchedule={...item.originalSchedule};
      for(const field of bad) originalSchedule[field]=item[field];
      return {...item,...Object.fromEntries(bad.map(field=>[field,''])),originalSchedule};
    });
  }
  return {workspace:validated(data),repaired};
}
async function getRecoveryOptions() {
  const found=[];
  if(loadError&&storageRaw!==null) found.push({key:'original',label:'Original saved data',raw:storageRaw});
  if(staticPilotHost&&!exampleWorkspace){
    const copies=await recoveryStore('readonly',store=>store.getAll()).catch(()=>[]);
    for(const [key,label] of [['latest','Last saved copy'],['before-replace','Copy before the last reset or restore'],['unreadable','Original data before repair']]){
      const copy=copies.find(entry=>entry.key===key);
      if(copy?.raw) found.push({...copy,label});
    }
    try{
      for(const key of Object.keys(localStorage)){
        if(!/^fieldnote\.phd\.v1(?:\.pilot\.\d{4}-\d{2}-\d{2})?$/.test(key)) continue;
        const raw=localStorage.getItem(key);
        if(raw) found.push({key,label:key.includes('.pilot.')?'Earlier pilot '+key.slice(-10):'Earlier Quod workspace on this site',raw});
      }
    }catch{}
  }
  const seen=new Set();
  return found.flatMap(copy=>{
    if(seen.has(copy.raw)||copy.raw===storageRaw&&!loadError) return [];
    seen.add(copy.raw);
    try{return [{...copy,...repairForRecovery(copy.raw)}];}
    catch{return [copy];}
  });
}
function openRecovery() {
  dialog('Recover workspace',txt('Checking this browser for saved copies…','muted')+cancel());
  const session=dialogSession;
  getRecoveryOptions().then(copies=>{
    if(session!==dialogSession||!modal.open) return;
    recoveryOptions=copies;
    const items=copies.map((copy,index)=>{
      const info=copy.workspace?workspaceCounts(copy.workspace)+(copy.repaired?' · Invalid dates or times can be repaired.':''):'Download this copy for recovery.';
      const when=copy.date?' · '+new Date(copy.date).toLocaleString():'';
      return listRow(copy.label+when,txt(info,'meta'),(copy.workspace?button('Preview restore','recover-copy',String(index),'secondary'):'')+
        button('Download original','recover-download',String(index),'ghost','download'));
    }).join('');
    dialog('Recover workspace',(items||empty('No other saved copy was found in this browser. Open Quod in the browser and profile you used before, or restore a JSON backup.'))+
      '<div class="form-actions">'+button('Restore JSON backup','restore','','secondary')+cancel()+'</div>');
  }).catch(()=>notify('Could not check for saved copies.'));
}
function workspaceCounts(value) {
  return value.tasks.length+' tasks, '+value.projects.length+' projects, '+value.reading.length+' references, '+value.notes.length+' notes, and '+value.logs.length+' log entries';
}
function previewRestore(next,repair=false) {
  const message='This copy has '+workspaceCounts(next)+'. Restoring it will replace the open workspace.'+
    (repair?' Invalid dates or times will be cleared. The original values stay with their records.':'');
  confirm('Replace this workspace?',message,'restore-confirm','','Restore workspace');
  pendingImport=next;
}
async function replaceWorkspace(next,message) {
  if(!next||zoteroBusy) return notify('Finish the current operation before replacing the workspace.');
  const session=dialogSession;
  try{
    const expected=localStorage.getItem(STORE);
    if(expected!==storageRaw) return notify('This workspace changed in another tab. Download a backup before reopening Quod.');
    if(staticPilotHost&&!exampleWorkspace){
      let previous=loadError?storageRaw:workspaceHasWork(state)?JSON.stringify(state):null;
      if(previous===null&&recoveryAvailable){
        const latest=await recoveryStore('readonly',store=>store.get('latest'));
        if(latest?.raw!==JSON.stringify(next)) previous=latest?.raw??null;
      }
      if(previous!==null) await saveRecoveryCopy(loadError?'unreadable':'before-replace',previous);
    }
    if(session!==dialogSession) return;
    if(localStorage.getItem(STORE)!==expected) return notify('This workspace changed in another tab. Download a backup before reopening Quod.');
    leaveRoom(false);zoom='day';
    state=next;researchLock=state.support.researchLock;
    recoveryAvailable=false;
    closeDialog();commit(message,true);
  }catch{notify('Quod couldn’t save a safety copy. Download your existing workspace before trying again.');}
}
