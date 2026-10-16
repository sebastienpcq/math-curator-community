'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const scoring=require('../../src/scoring.js');
const corpus=require('./pedagogical-corpus-v0.2.json');
const examples=[
 ['géométrie','geometry'],['GÉOMÉTRIE','geometry'],['théorème de Pythagore','geometry'],
 ['équation du second degré','elementary'],['probabilités conditionnelles','probability'],
 ['topologie','advanced'],['dérivée','calculus'],['algèbre linéaire','linear'],
 ['linear algebra','linear'],['modular arithmetic','number']
];
for(const [title,domain] of examples)test('recognizes '+title,()=>{
 assert.ok(scoring.evaluate({title}).domains.includes(domain));
});
for(const title of ['gaming highlights','geometrician fantasy game','topical hairstyle','unrelated music'])test('does not falsely recognize '+title,()=>{
 assert.equal(scoring.evaluate({title}).relevant,false);
});
test('pilot positive titles retain mathematical relevance',()=>{
 for(const v of corpus.videos)assert.equal(scoring.evaluate({title:v.title}).relevant,true,v.id);
});

test('generic video series is not mistaken for calculus',()=>{
 const ev=scoring.evaluate({title:'Vectors | Essence of linear algebra',context:'Beginning the linear algebra series with the basics.'});
 assert.ok(ev.domains.includes('linear'));
 assert.ok(!ev.domains.includes('calculus'));
});
test('explicit infinite series still indicates calculus',()=>{
 assert.ok(scoring.evaluate({title:'Infinite series convergence lecture'}).domains.includes('calculus'));
});
