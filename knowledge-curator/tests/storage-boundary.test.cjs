'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const boundary=require('../storage-boundary.cjs');
function store(){
 const values=new Map();
 return {getItem:k=>values.has(k)?values.get(k):null,
  setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
}
const valid=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
test('legacy boundary round trips progression',()=>{
 const storage=store();
 boundary.writeProgress(storage,{arithmetic:{status:'in_progress'}},valid);
 assert.deepEqual(boundary.readProgress(storage,valid),{arithmetic:{status:'in_progress'}});
});
test('pending recovery blocks writes without mutating progress',()=>{
 const storage=store();
 boundary.writeProgress(storage,{arithmetic:{}},valid);
 const before=storage.getItem(boundary.PROGRESS);
 storage.setItem(boundary.JOURNAL,'{}');
 assert.throws(()=>boundary.writeProgress(storage,{algebra:{}},valid),/recovery pending/);
 assert.equal(storage.getItem(boundary.PROGRESS),before);
});
test('invalid progress is rejected before writing',()=>{
 const storage=store();
 assert.throws(()=>boundary.writeProgress(storage,[],valid),/Invalid progress/);
 assert.equal(storage.getItem(boundary.PROGRESS),null);
});

test('attempt append is delegated through boundary',()=>{
 const storage=store();
 const attempts={append:(target,event)=>{
  target.setItem('attempts',JSON.stringify([event]));
  return true;
 }};
 const event={skillId:'arithmetic',correct:false};
 boundary.appendAttempt(storage,attempts,event);
 assert.deepEqual(JSON.parse(storage.getItem('attempts')),[event]);
});
test('attempt append is rejected while recovery is pending',()=>{
 const storage=store();
 storage.setItem(boundary.JOURNAL,'{}');
 let called=false;
 const attempts={append:()=>{called=true;}};
 assert.throws(()=>boundary.appendAttempt(storage,attempts,{correct:false}),/recovery pending/);
 assert.equal(called,false);
});
