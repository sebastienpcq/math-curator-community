const test=require('node:test'),assert=require('node:assert/strict');
const data=require('../learning.json'),engine=require('../learning.cjs');
test('curriculum valid',()=>assert.deepEqual(engine.validate(data),[]));
test('cycle detected',()=>{const c=structuredClone(data);c.paths[0].steps[0].prerequisites=['logarithms'];assert.ok(engine.validate(c).some(x=>x.startsWith('Cycle')));});
test('numeric answer',()=>{assert.equal(engine.grade(data.exercises[0],'56'),true);assert.equal(engine.grade(data.exercises[1],'0,75'),true);assert.equal(engine.grade(data.exercises[0],'abc'),false);});
test('prerequisites',()=>{const p=data.paths[0];assert.deepEqual(engine.available(p,{}).map(s=>s.id),['arithmetic']);assert.ok(engine.available(p,{arithmetic:{status:'demonstrated'}}).some(s=>s.id==='fractions'));});
