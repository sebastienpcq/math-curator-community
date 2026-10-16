'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {run}=require('../../src/video-intelligence/verify-live.cjs');
const id='PFDu9oVAE-g';
test('missing key prevents any network request',async()=>{
 const output=[];let calls=0;
 const code=await run({env:{},fetchImpl:async()=>{calls++;throw Error('unexpected');},write:s=>output.push(JSON.parse(s))});
 assert.equal(code,2);assert.equal(calls,0);assert.equal(output[0].status,'blocked');
});
test('success emits only approved metadata without secrets',async()=>{
 const output=[];let calls=0;
 const code=await run({env:{YOUTUBE_API_KEY:'fixture-secret'},fetchImpl:async url=>{
  calls++;assert.equal(new URL(url).searchParams.get('id'),id);
  return {ok:true,status:200,json:async()=>({items:[{id,snippet:{title:'Eigenvectors',channelTitle:'3Blue1Brown',description:'private fixture text'}}]})};
 },write:s=>output.push(s)});
 assert.equal(code,0);assert.equal(calls,1);
 assert.equal(JSON.parse(output[0]).video.id,id);
 assert.ok(!output[0].includes('fixture-secret'));
 assert.ok(!output[0].includes('private fixture text'));
});
test('quota failure is sanitized',async()=>{
 const output=[];
 const code=await run({env:{YOUTUBE_API_KEY:'fixture-secret'},fetchImpl:async()=>({
  ok:false,status:403,json:async()=>({error:{errors:[{reason:'quotaExceeded'}]}})
 }),write:s=>output.push(s)});
 assert.equal(code,1);assert.equal(JSON.parse(output[0]).code,'QUOTA_EXCEEDED');
 assert.ok(!output[0].includes('fixture-secret'));
});
test('missing video is not mislabeled as deleted',async()=>{
 const output=[];
 const code=await run({env:{YOUTUBE_API_KEY:'fixture-secret'},fetchImpl:async()=>({
  ok:true,status:200,json:async()=>({items:[]})
 }),write:s=>output.push(JSON.parse(s))});
 assert.equal(code,3);assert.equal(output[0].status,'not_found');
});
