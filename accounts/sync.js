async function digest(raw) {
  if(raw===null) return null;
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(bytes),value=>value.toString(16).padStart(2,'0')).join('');
}

export class WorkspaceSync {
  constructor(store,key,remote,status) {
    this.store=store;
    this.key=key;
    this.remote=remote;
    this.status=status;
    this.metaKey=key+'.sync';
    this.base=JSON.parse(store.getItem(this.metaKey)||'{"revision":0,"hash":null}');
    this.conflict=false;
    this.busy=null;
    this.closed=false;
  }
  get local(){return this.store.getItem(this.key);}
  async hasLocalEdits(){return this.local!==null && await digest(this.local)!==this.base.hash;}
  async acknowledge(row){
    const checkpoint={revision:row.revision,hash:await digest(row.document)};
    this.store.setItem(this.metaKey,JSON.stringify(checkpoint));
    this.base=checkpoint;
  }
  async adopt(row){
    if(!row) throw Error('The cloud copy is unavailable. Your device copy has been kept.');
    this.store.setItem(this.key,row.document);
    await this.acknowledge(row);
    this.conflict=false;
  }
  sync(opening=false){
    if(this.closed) return Promise.resolve(false);
    if(!this.busy) this.busy=this.run(opening).finally(()=>{this.busy=null;});
    return this.busy;
  }
  async run(opening){
    this.status('Checking cloud…');
    try{
      const row=await this.remote.read();
      if(this.closed) return false;
      const local=this.local;
      const hash=await digest(local);
      if(local!==this.local) return this.run(false);
      if(row?.document===local){
        await this.acknowledge(row);
      }else if((row?.revision||0)!==this.base.revision || (row && local===null)){
        if(row && opening && (local===null || hash===this.base.hash)){
          await this.adopt(row);
        }else{
          this.conflict=hash===this.base.hash?'updated':'conflict';
          this.status(this.conflict==='updated'?'A newer cloud version is ready. Open Account to load it.':'Another device changed this workspace. Open Account to review.');
          return false;
        }
      }else if(local!==null && hash!==this.base.hash){
        // The app validates a surviving device copy before it can be uploaded.
        if(opening){this.status('Checking your device copy…');return false;}
        const revision=await this.remote.write(this.base.revision,local);
        if(this.closed) return false;
        if(revision===null) return this.run(false);
        await this.acknowledge({revision,document:local});
      }
      if(this.closed) return false;
      if(this.local!==local && !opening) return this.run(false);
      this.conflict=false;
      this.status(this.local===null?'Ready for your first cloud save':'Saved to your account');
      return true;
    }catch(error){
      this.status(navigator.onLine?'Cloud save unavailable. Your device copy is kept.':'Offline · work stays on this device until it syncs.');
      if(opening && this.local===null) throw error;
      return false;
    }
  }
}
