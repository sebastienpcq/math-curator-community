'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const r=require('../review.cjs');
const s={id:'arithmetic',exerciseIds:['a','b','c']};
const e=(id,correct,time)=>({skillId:'arithmetic',exerciseId:id,correct,timestamp:time});
test('no history means no review scheduled',()=>assert.deepEqual(r.reviewState(s,[]).nextAt,null));
test('correct answer schedules future review, never immediate durability',()=>{const x=r.reviewState(s,[e('a',true,'2026-10-14T00:00:00Z')],Date.parse('2026-10-14T12:00:00Z'));assert.equal(x.due,false);assert.equal(x.nextAt,'2026-10-15T00:00:00.000Z');});
test('review becomes due after delay',()=>assert.equal(r.reviewState(s,[e('a',true,'2026-10-14T00:00:00Z')],Date.parse('2026-10-16T00:00:00Z')).due,true));
test('errors are counted and included in weak-skills selection',()=>{const p={steps:[s]};const h=[e('a',false,'2026-10-14T00:00:00Z'),e('a',true,'2026-10-14T01:00:00Z')];assert.equal(r.reviewState(s,h).errors,1);assert.equal(r.weakSkills(p,h).length,1);});
