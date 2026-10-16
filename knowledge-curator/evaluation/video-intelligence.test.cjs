'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const intelligence=require('../../src/video-intelligence/metadata.cjs');
const scoring=require('../../src/scoring.js');
const corpus=require('./pedagogical-corpus-v0.2.json');
const negatives=require('./real-negative-corpus-v0.1.json');
test('normalizes public metadata without external services',()=>{
 const v=intelligence.normalizeVideo({videoId:'PFDu9oVAE-g',title:'  Linear algebra  ',channelTitle:'3Blue1Brown',description:'Vectors'});
 assert.equal(v.title,'Linear algebra');
 assert.equal(v.context,'Vectors');
 assert.equal(v.url,'https://www.youtube.com/watch?v=PFDu9oVAE-g');
 assert.ok(Object.isFrozen(v));
});
test('rejects malformed IDs and missing titles',()=>{
 assert.throws(()=>intelligence.normalizeVideo({id:'bad',title:'test'}),/Invalid/);
 assert.throws(()=>intelligence.normalizeVideo({id:'PFDu9oVAE-g'}),/title/);
});
test('classifies pilot videos with the real scoring engine',()=>{
 for(const v of corpus.videos){
  const result=intelligence.classify(v,scoring,{enabled:true,mode:'balanced',threshold:42,level:'all'});
  assert.equal(result.video.id,v.id);
  assert.equal(result.evaluation.relevant,true,v.id);
  assert.ok(['show','hide','unknown'].includes(result.decision));
 }
});
test('retains difficult real negative controls for future semantic validation',()=>{
 for(const v of negatives.videos){
  const result=intelligence.classify(v,scoring,{enabled:true,mode:'balanced',threshold:42,level:'all'});
  assert.equal(result.video.id,v.id);
  assert.equal(v.label,'negative');
  assert.ok(result.evaluation);
 }
});
