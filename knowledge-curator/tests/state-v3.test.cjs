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
