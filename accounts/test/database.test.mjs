import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('PostgreSQL enforces private workspaces and protects concurrent saves',async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create schema auth;
      create role anon; create role authenticated;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated;
      insert into auth.users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');`);
    await db.exec(await readFile(new URL('../../supabase/migrations/202611230001_workspace.sql',import.meta.url),'utf8'));
    const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002';
    const doc=JSON.stringify({version:1,tasks:[]});
    const save=async(id,rev,data=doc)=>(await db.query('select public.quod_save_workspace($1,$2,$3) as rev',[id,rev,data])).rows[0].rev;
    await db.exec('set role anon');
    await assert.rejects(save(a,0));
    await assert.rejects(db.query('select * from public.quod_workspaces'));
    await db.exec('reset role; set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
    assert.equal(await save(a,0),1);
    assert.equal(await save(a,0),null);
    assert.equal(await save(a,1),2);
    assert.equal(await save(a,1),null);
    await assert.rejects(save(a,2,'{}'));
    await assert.rejects(save(b,0));
    await assert.rejects(db.query('delete from public.quod_workspaces'));
    await assert.rejects(db.query("update public.quod_workspaces set document='{}'"));
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[b]);
    assert.deepEqual((await db.query('select * from public.quod_workspaces')).rows,[]);
    assert.equal(await save(b,0),1);
    assert.equal((await db.query('select owner_id from public.quod_workspaces')).rows[0].owner_id,b);
  }finally{await db.close();}
});
