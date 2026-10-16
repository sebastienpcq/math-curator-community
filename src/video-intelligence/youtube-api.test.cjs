'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createYouTubeClient}=require('./youtube-api.cjs');
const id='PFDu9oVAE-g', secret='FAKE_SECRET_DO_NOT_LEAK';
const ok=(items=[])=>({ok:true,status:200,json:async()=>({items})});
const fail=(status,reason='',headers={})=>({ok:false,status,headers:{get:k=>headers[k]},json:async()=>({error:{errors:[{reason}]}})});
const client=(fetchImpl,extra={})=>createYouTubeClient({apiKey:secret,fetchImpl,sleep:async()=>{},...extra});
async function errorCode(fetchImpl,expected,extra={}){
 await assert.rejects(client(fetchImpl,extra).getVideos([id]),e=>{
  assert.equal(e.code,expected);assert.ok(!JSON.stringify({message:e.message,stack:e.stack}).includes(secret));return true;
 });
}
test('success, deduplication, and missing IDs',async()=>{
 let calls=0;let request;
 const c=client(async(url,opts)=>{calls++;request={url,opts};return ok([{id,snippet:{title:'Math',channelTitle:'Channel'}}]);});
 const out=await c.getVideos([id,id,'aaaaaaaaaaa']);
 assert.equal(calls,1);assert.equal(out.videos.length,1);assert.deepEqual(out.missingIds,['aaaaaaaaaaa']);
 assert.equal(new URL(request.url).searchParams.get('id'),id+',aaaaaaaaaaa');
 assert.ok(!request.url.includes(secret));
});
test('rejects invalid identifiers and >50 IDs without fetch',async()=>{
 let calls=0;const c=client(async()=>{calls++;return ok();});
 await assert.rejects(c.getVideos(['bad']),TypeError);
 await assert.rejects(c.getVideos(Array.from({length:51},(_,i)=>String(i).padStart(11,'0'))),TypeError);
 assert.equal(calls,0);
});
test('quota and access errors never retry',async()=>{
 for(const [status,reason,code] of [[403,'quotaExceeded','QUOTA_EXCEEDED'],[403,'dailyLimitExceeded','QUOTA_EXCEEDED'],[403,'forbidden','ACCESS_DENIED'],[401,'','ACCESS_DENIED'],[400,'','HTTP_ERROR'],[404,'','HTTP_ERROR']]){
  let calls=0;await errorCode(async()=>{calls++;return fail(status,reason);},code);assert.equal(calls,1);
 }
});
test('rate limit retries are bounded and respect Retry-After',async()=>{
 let calls=0;const delays=[];
 await assert.rejects(client(async()=>{calls++;return fail(429,'',{'retry-after':'2'});},{sleep:async ms=>delays.push(ms)}).getVideos([id]),{code:'RATE_LIMITED'});
 assert.equal(calls,3);assert.deepEqual(delays,[2000,2000]);
});
test('server failures retry with bounded attempts',async()=>{
 for(const status of [500,502,503]){let calls=0;await errorCode(async()=>{calls++;return fail(status);},'HTTP_ERROR');assert.equal(calls,3);}
});
test('invalid JSON and malformed payload',async()=>{
 await errorCode(async()=>({ok:true,json:async()=>{throw Error(secret);}}),'INVALID_JSON');
 await errorCode(async()=>({ok:true,json:async()=>({unexpected:true})}),'INVALID_PAYLOAD');
});
test('unavailable videos are reported without crashing',async()=>{
 const result=await client(async()=>ok()).getVideos([id]);
 assert.deepEqual(result.missingIds,[id]);
});
test('network errors redact secret and retries are bounded',async()=>{
 let calls=0;await errorCode(async()=>{calls++;throw Error(secret);},'NETWORK_ERROR');assert.equal(calls,3);
});
test('caller cancellation is not retried',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 await assert.rejects(client(async()=>{calls++;return ok();}).getVideos([id],{signal:controller.signal}),{code:'ABORTED'});
 assert.equal(calls,0);
});
test('timeout produces a sanitized error',async()=>{
 await errorCode((_url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error(secret)),{once:true})),'TIMEOUT',{timeoutMs:5,maxRetries:0});
});

test('response body timeout is enforced',async()=>{
 await errorCode(async()=>({ok:true,status:200,json:()=>new Promise(()=>{})}),'TIMEOUT',{timeoutMs:8,maxRetries:0});
});
test('retry wait can be interrupted by caller',async()=>{
 const controller=new AbortController();
 let calls=0;
 const c=client(async()=>{calls++;return fail(429);},{sleep:()=>new Promise(()=>{})});
 const pending=c.getVideos([id],{signal:controller.signal});
 setImmediate(()=>controller.abort());
 await assert.rejects(pending,{code:'ABORTED'});
 assert.equal(calls,1);
});
test('HTTP fetch that ignores AbortSignal still times out',async()=>{
 await errorCode(()=>new Promise(()=>{}),'TIMEOUT',{timeoutMs:8,maxRetries:0});
});
