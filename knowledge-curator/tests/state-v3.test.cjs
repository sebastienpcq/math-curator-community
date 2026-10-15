'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const state=require('../state-v3.cjs');
function storage(initial={}){
 const data=new Map(Object.entries(initial));
 return {getItem:key=>data.has(key)?data.get(key):null,
  setItem:(key,value)=>data.set(key,value),dump:()=>Object.fromEntries(data)};
}
const sample={arithmetic:{status:'in_progress',updatedAt:'2026-10-15T00:00:00.000Z'}};
const attempt={skillId:'arithmetic',exerciseId:'ex-arithmetic',correct:false,timestamp:'2026-10-15T00:00:00.000Z'};
test('migration preserves legacy keys and values',()=>{
 const store=storage({'knowledge-curator-progress-v1':JSON.stringify(sample),
  'knowledge-curator-attempts-v1':JSON.stringify([attempt])});
 const before={...store.dump()};
 const migrated=state.migrate(store);
 assert.deepEqual(migrated.progress,sample);
 assert.deepEqual(migrated.attempts,[attempt]);
 for(const [key,value] of Object.entries(before))assert.equal(store.getItem(key),value);
});
test('migration is idempotent',()=>{
 const store=storage({'knowledge-curator-progress-v1':JSON.stringify(sample)});
 const first=state.migrate(store);
 assert.deepEqual(state.migrate(store),first);
});
test('invalid legacy data causes no canonical write',()=>{
 const store=storage({'knowledge-curator-progress-v1':'{broken'});
 assert.throws(()=>state.migrate(store));
 assert.equal(store.getItem(state.KEY),null);
});
test('failed canonical write preserves legacy keys',()=>{
 const legacy=JSON.stringify(sample);
 const store={getItem:key=>key==='knowledge-curator-progress-v1'?legacy:null,
  setItem:()=>{throw Error('storage unavailable');}};
 assert.throws(()=>state.migrate(store));
 assert.equal(store.getItem('knowledge-curator-progress-v1'),legacy);
});

test('invalid legacy archive does not create canonical state',()=>{
 const store=storage({
  'knowledge-curator-progress-v1':JSON.stringify(sample),
  'knowledge-curator-legacy-v1-archive':'{invalid'
 });
 assert.throws(()=>state.migrate(store));
 assert.equal(store.getItem(state.KEY),null);
});
test('existing canonical state remains unchanged on repeated migration',()=>{
 const store=storage({'knowledge-curator-progress-v1':JSON.stringify(sample)});
 const original=state.migrate(store);
 store.setItem('knowledge-curator-progress-v1','{invalid');
 assert.deepEqual(state.migrate(store),original);
});
test('invalid canonical state is not silently replaced',()=>{
 const store=storage({
  'knowledge-curator-progress-v1':JSON.stringify(sample),
  [state.KEY]:'{invalid'
 });
 assert.throws(()=>state.migrate(store));
 assert.equal(store.getItem(state.KEY),'{invalid');
});

test('quota error during migration preserves legacy and leaves no canonical record',()=>{
 const values=new Map([
  ['knowledge-curator-progress-v1',JSON.stringify(sample)],
  ['knowledge-curator-attempts-v1',JSON.stringify([attempt])]
 ]);
 const store={
  getItem:key=>values.has(key)?values.get(key):null,
  setItem:(key,value)=>{
   if(key===state.KEY)throw Error('QuotaExceededError');
   values.set(key,value);
  }
 };
 const before=Object.fromEntries(values);
 assert.throws(()=>state.migrate(store),/QuotaExceededError/);
 assert.deepEqual(Object.fromEntries(values),before);
});
test('repeated migration after transient write failure is safe',()=>{
 const values=new Map([['knowledge-curator-progress-v1',JSON.stringify(sample)]]);
 let fail=true;
 const store={
  getItem:key=>values.has(key)?values.get(key):null,
  setItem:(key,value)=>{
   if(key===state.KEY&&fail)throw Error('transient failure');
   values.set(key,value);
  }
 };
 assert.throws(()=>state.migrate(store));
 assert.equal(store.getItem(state.KEY),null);
 fail=false;
 const first=state.migrate(store);
 assert.deepEqual(state.migrate(store),first);
 assert.deepEqual(first.progress,sample);
});
test('canonical state survives legacy data removal',()=>{
 const store=storage({'knowledge-curator-progress-v1':JSON.stringify(sample)});
 const canonical=state.migrate(store);
 const existing=store.getItem(state.KEY);
 const values=storage({[state.KEY]:existing});
 assert.deepEqual(state.read(values),canonical);
});

test('two stale tab snapshots can overwrite each other with localStorage',()=>{
 const store=storage({'knowledge-curator-progress-v1':JSON.stringify(sample)});
 state.migrate(store);
 const tabA=state.read(store),tabB=state.read(store);
 tabA.attempts.push(attempt);
 tabB.progress.algebra={status:'in_progress',updatedAt:'2026-10-15T01:00:00.000Z'};
 store.setItem(state.KEY,JSON.stringify(tabA));
 store.setItem(state.KEY,JSON.stringify(tabB));
 const final=state.read(store);
 assert.equal(final.attempts.length,0);
 assert.equal(final.progress.algebra.status,'in_progress');
});
