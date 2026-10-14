'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const a=require('../attempts.cjs');
function storage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v)};}
const e=(id,correct,time)=>({skillId:'fractions',exerciseId:id,correct,timestamp:time});
test('append preserves every previous failure',()=>{
 const s=storage();
 a.append(s,e('ex-fractions',false,'2026-10-14T12:00:00.000Z'));
 a.append(s,e('ex-fractions',false,'2026-10-14T12:01:00.000Z'));
 a.append(s,e('ex-fractions',true,'2026-10-14T12:02:00.000Z'));
 assert.deepEqual(a.read(s).map(x=>x.correct),[false,false,true]);
 assert.equal(a.read(s).length,3);
});
test('survives reload from the same storage',()=>{
 const s=storage();a.append(s,e('ex-fractions',true,'2026-10-14T12:02:00.000Z'));
 assert.deepEqual(a.read(s),[e('ex-fractions',true,'2026-10-14T12:02:00.000Z')]);
});
test('rejects invalid persisted data without overwriting',()=>{
 const s=storage();s.setItem(a.KEY,'{"broken":1}');
 assert.throws(()=>a.append(s,e('ex-fractions',true,'2026-10-14T12:02:00.000Z')));
 assert.equal(s.getItem(a.KEY),'{"broken":1}');
});
test('storage failure cannot imply success or erase original record',()=>{
 const m=new Map([[a.KEY,JSON.stringify([e('ex-fractions',false,'2026-10-14T12:00:00.000Z')])]]);
 const s={getItem:k=>m.get(k),setItem:()=>{throw Error('quota');}};
 assert.throws(()=>a.append(s,e('ex-fractions',true,'2026-10-14T12:02:00.000Z')),/quota/);
 assert.equal(JSON.parse(m.get(a.KEY)).length,1);
});
test('reject malformed events and imported history',()=>{
 const s=storage();assert.throws(()=>a.append(s,{skillId:'fractions',correct:true}));
 assert.throws(()=>a.replace(s,[{bad:true}]));
 assert.deepEqual(a.read(s),[]);
});
