'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/background.js'),'utf8');
const config=fs.readFileSync(path.join(__dirname,'../src/config.js'),'utf8');
function harness(){
 let state={settings:{enabled:false,saved:{}}},failWrites=0,failReads=0,listener;
 const chrome={
  storage:{local:{
   async get(){if(failReads-->0)throw Error('private storage detail');return structuredClone(state);},
   async set(update){if(failWrites-->0)throw Error('private storage detail');state=structuredClone({...state,...update});}
  }},
  runtime:{onMessage:{addListener(fn){listener=fn;}}}
 };
 const context=vm.createContext({chrome,console,Date,Promise,Object,Error,String,RegExp,Math,Set,Array});
 context.globalThis=context;
 context.importScripts=(name)=>{if(name!=='config.js')throw Error('Unexpected import');vm.runInContext(config,context);};
 vm.runInContext(source,context);
 const send=msg=>new Promise(resolve=>listener(msg,{},resolve));
 return {send,get state(){return structuredClone(state);},failWrite(){failWrites++;},failRead(){failReads++;}};
}
test('failed write reports error and next write succeeds',async()=>{
 const h=harness();h.failWrite();
 const first=await h.send({type:'PATCH_SETTINGS',patch:{enabled:true}});
 assert.equal(first.ok,false);assert.equal(h.state.settings.enabled,false);
 assert.equal((await h.send({type:'PATCH_SETTINGS',patch:{enabled:true}})).ok,true);
 assert.equal(h.state.settings.enabled,true);
});
test('failed read does not poison serialized queue',async()=>{
 const h=harness();h.failRead();
 assert.equal((await h.send({type:'PATCH_SETTINGS',patch:{enabled:true}})).ok,false);
 assert.equal((await h.send({type:'PATCH_SETTINGS',patch:{enabled:true}})).ok,true);
 assert.equal(h.state.settings.enabled,true);
});
test('concurrent failed and successful patches preserve committed fields',async()=>{
 const h=harness();h.failWrite();
 const [a,b]=await Promise.all([
  h.send({type:'PATCH_SETTINGS',patch:{enabled:true}}),
  h.send({type:'PATCH_SETTINGS',patch:{hideShorts:false}})
 ]);
 assert.equal(a.ok,false);assert.equal(b.ok,true);
 assert.equal(h.state.settings.enabled,false);
 assert.equal(h.state.settings.hideShorts,false);
});
test('failed favorite save is not acknowledged and removal can proceed',async()=>{
 const h=harness();h.failWrite();
 assert.equal((await h.send({type:'SAVE_VIDEO',video:{id:'abcdefghijk',title:'Fixture'}})).ok,false);
 assert.equal((await h.send({type:'REMOVE_FAVORITE',id:'abcdefghijk'})).ok,true);
 assert.deepEqual(Object.keys(h.state.settings.saved),[]);
});

test('channel pair update must not partially commit when one expected list is stale',async()=>{
 const h=harness();
 assert.equal((await h.send({type:'ADD_LIST_ITEM',key:'allowChannels',value:'Original'})).ok,true);
 assert.equal((await h.send({type:'ADD_LIST_ITEM',key:'blockChannels',value:'Blocked'})).ok,true);
 const result=await h.send({type:'REPLACE_CHANNEL_RULES',expected:{allowChannels:['Original'],blockChannels:[]},desired:{allowChannels:['Updated'],blockChannels:['Other']}});
 assert.equal(result.ok,false);
 assert.equal(result.error,'CONFLICT');
 assert.deepEqual(h.state.settings.allowChannels,['Original']);
 assert.deepEqual(h.state.settings.blockChannels,['Blocked']);
});
test('settings patch rejects mutable collection replacement',async()=>{
 const h=harness();
 const result=await h.send({type:'PATCH_SETTINGS',patch:{allowChannels:['Unreviewed']}});
 assert.equal(result.ok,false);
 assert.deepEqual(h.state.settings.saved,{});
});
