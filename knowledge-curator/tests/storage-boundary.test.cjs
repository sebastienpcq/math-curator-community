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

test('recovery owner can write validated progress with pending journal',()=>{
 const storage=store();
 storage.setItem(boundary.JOURNAL,'{}');
 const value={arithmetic:{status:'in_progress'}};
 boundary.writeDuringRecovery(storage,value,valid);
 assert.deepEqual(JSON.parse(storage.getItem(boundary.PROGRESS)),value);
 assert.throws(()=>boundary.writeProgress(storage,{algebra:{}},valid),/recovery pending/);
});
test('recovery-specific write requires a journal',()=>{
 const storage=store();
 assert.throws(()=>boundary.writeDuringRecovery(storage,{arithmetic:{}},valid),/journal required/);
});

test('transaction commits progress and attempts together',()=>{
 const storage=store();
 const attempts={
  KEY:'attempts',
  read:s=>JSON.parse(s.getItem('attempts')||'[]'),
  replace:(s,items)=>s.setItem('attempts',JSON.stringify(items)),
  validateHistory:items=>Array.isArray(items)
 };
 const result=boundary.transaction(storage,attempts,valid,()=>({
  progress:{arithmetic:{status:'in_progress'}},
  attempts:[{correct:false}],legacyArchive:null
 }));
 assert.equal(result.attempts.length,1);
 assert.equal(storage.getItem(boundary.JOURNAL),null);
 assert.deepEqual(JSON.parse(storage.getItem('attempts')),[{correct:false}]);
});
test('transaction rolls back failed progress write',()=>{
 const values=new Map([['attempts','[{"correct":true}]'],
  [boundary.PROGRESS,'{"arithmetic":{}}']]);
 let fail=true;
 const storage={
  getItem:k=>values.has(k)?values.get(k):null,
  setItem:(k,v)=>{
   if(k===boundary.PROGRESS&&fail){fail=false;throw Error('write failure');}
   values.set(k,v);
  },
  removeItem:k=>values.delete(k)
 };
 const attempts={
  KEY:'attempts',
  read:s=>JSON.parse(s.getItem('attempts')||'[]'),
  replace:(s,items)=>s.setItem('attempts',JSON.stringify(items)),
  validateHistory:Array.isArray
 };
 const before=Object.fromEntries(values);
 assert.throws(()=>boundary.transaction(storage,attempts,valid,()=>({
  progress:{algebra:{}},attempts:[],legacyArchive:null
 })),/write failure/);
 assert.deepEqual(Object.fromEntries(values),before);
});

test('transaction refuses malformed previous attempts before journal creation',()=>{
 const storage=store();
 storage.setItem('attempts','{bad');
 const attempts={
  KEY:'attempts',
  read:s=>JSON.parse(s.getItem('attempts')),
  replace:(s,items)=>s.setItem('attempts',JSON.stringify(items)),
  validateHistory:Array.isArray
 };
 assert.throws(()=>boundary.transaction(storage,attempts,valid,old=>old),SyntaxError);
 assert.equal(storage.getItem(boundary.JOURNAL),null);
 assert.equal(storage.getItem('attempts'),'{bad');
});
test('rollback failure retains journal and reports recoverability failure',()=>{
 const values=new Map([[boundary.PROGRESS,'{}'],['attempts','[]']]);
 let failProgress=true;
 const storage={
  getItem:k=>values.has(k)?values.get(k):null,
  setItem:(k,v)=>{
   if(k===boundary.PROGRESS&&failProgress){failProgress=false;throw Error('progress failure');}
   if(k==='attempts'&&v==='[]'&&values.has(boundary.JOURNAL))
    throw Error('rollback failure');
   values.set(k,v);
  },
  removeItem:k=>values.delete(k)
 };
 const attempts={
  KEY:'attempts',
  read:s=>JSON.parse(s.getItem('attempts')||'[]'),
  replace:(s,items)=>s.setItem('attempts',JSON.stringify(items)),
  validateHistory:Array.isArray
 };
 assert.throws(()=>boundary.transaction(storage,attempts,valid,()=>({
  progress:{arithmetic:{}},attempts:[{correct:false}],legacyArchive:null
 })),/Rollback failed/);
 assert.notEqual(storage.getItem(boundary.JOURNAL),null);
});

test('invalid existing legacy archive blocks transaction before journal',()=>{
 const storage=store();
 storage.setItem('knowledge-curator-legacy-v1-archive','{"version":1,"progress":{}}');
 const attempts={
  KEY:'attempts',
  read:s=>JSON.parse(s.getItem('attempts')||'[]'),
  replace:(s,items)=>s.setItem('attempts',JSON.stringify(items)),
  validateHistory:Array.isArray
 };
 assert.throws(()=>boundary.transaction(storage,attempts,valid,old=>old),/Invalid existing archive/);
 assert.equal(storage.getItem(boundary.JOURNAL),null);
 assert.equal(storage.getItem('knowledge-curator-legacy-v1-archive'),'{"version":1,"progress":{}}');
});
test('invalid new archive is rejected before any transaction write',()=>{
 const storage=store();
 const attempts={
  KEY:'attempts',
  read:s=>JSON.parse(s.getItem('attempts')||'[]'),
  replace:(s,items)=>s.setItem('attempts',JSON.stringify(items)),
  validateHistory:Array.isArray
 };
 assert.throws(()=>boundary.transaction(storage,attempts,valid,old=>({
  ...old,legacyArchive:'not json'
 })),/Invalid transaction state/);
 assert.equal(storage.getItem(boundary.JOURNAL),null);
});
