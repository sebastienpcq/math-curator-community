'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const attempts=require('../attempts.cjs'),review=require('../review.cjs'),mastery=require('../mastery.cjs');
const step={id:'arithmetic',exerciseIds:['ex-arithmetic','ex-arithmetic-v2','ex-arithmetic-v3']};
const at=(id,correct,stamp)=>({skillId:'arithmetic',exerciseId:id,correct,timestamp:stamp});
function memory(){const map=new Map();return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v)};}
test('wrong arithmetic answer appears among weak skills',()=>{
 const store=memory();attempts.append(store,at('ex-arithmetic',false,'2026-10-15T00:00:00.000Z'));
 const history=attempts.read(store);
 assert.equal(review.weakSkills({steps:[step]},history)[0].step.id,'arithmetic');
 assert.equal(review.weakSkills({steps:[step]},history)[0].review.errors,1);
});
test('history survives simulated refresh without loss',()=>{
 const store=memory();
 attempts.append(store,at('ex-arithmetic',false,'2026-10-15T00:00:00.000Z'));
 attempts.append(store,at('ex-arithmetic-v2',false,'2026-10-15T00:01:00.000Z'));
 attempts.append(store,at('ex-arithmetic-v3',true,'2026-10-15T00:02:00.000Z'));
 const newSession=attempts.read(store);
 assert.deepEqual(newSession.map(e=>e.correct),[false,false,true]);
 assert.equal(newSession.length,3);
});
test('review is scheduled in future, then becomes due',()=>{
 const events=[at('ex-arithmetic',true,'2026-10-15T00:00:00.000Z')];
 const before=review.reviewState(step,events,Date.parse('2026-10-15T00:01:00.000Z'));
 const after=review.reviewState(step,events,Date.parse('2026-10-16T00:00:00.000Z'));
 assert.equal(before.due,false);assert.equal(after.due,true);
 assert.equal(before.nextAt,'2026-10-16T00:00:00.000Z');
});
test('single correct answer never proves mastery',()=>assert.equal(mastery.achieved(step,[at('ex-arithmetic',true,'2026-10-15T00:00:00.000Z')]),false));
