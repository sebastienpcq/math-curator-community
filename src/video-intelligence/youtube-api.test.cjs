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

test('untrusted transport error codes never expose a secret',async()=>{
 const poisoned=Object.assign(new Error('transport failed'),{code:secret});
 await errorCode(async()=>{throw poisoned;},'NETWORK_ERROR',{maxRetries:0});
});

test('malformed HTTP error body preserves status-based retry policy',async()=>{
 let calls=0;
 const malformed=status=>({ok:false,status,json:async()=>{throw Error(secret);}});
 await assert.rejects(client(async()=>{calls++;return malformed(503);}).getVideos([id]),{code:'HTTP_ERROR',status:503});
 assert.equal(calls,3);
 calls=0;
 await assert.rejects(client(async()=>{calls++;return malformed(403);}).getVideos([id]),{code:'ACCESS_DENIED',status:403});
 assert.equal(calls,1);
});

test('HTTP 403 rate limiting retries, ordinary forbidden does not',async()=>{
 let calls=0;
 await assert.rejects(client(async()=>{calls++;return fail(403,'rateLimitExceeded');}).getVideos([id]),{code:'RATE_LIMITED',status:403});
 assert.equal(calls,3);
 calls=0;
 await assert.rejects(client(async()=>{calls++;return fail(403,'forbidden');}).getVideos([id]),{code:'ACCESS_DENIED',status:403});
 assert.equal(calls,1);
});

test('Retry-After values are bounded and invalid values use backoff',async()=>{
 for(const [header,expected] of [['999999999999999999999',30000],['invalid',200],['-1',200]]){
  let calls=0;const delays=[];
  await assert.rejects(client(async()=>{calls++;return fail(429,'',{'retry-after':header});},{maxRetries:1,sleep:async ms=>delays.push(ms)}).getVideos([id]),{code:'RATE_LIMITED'});
  assert.equal(calls,2);
  assert.deepEqual(delays,[expected]);
 }
});

test('quota and retry bounds remain observable under mutation',async()=>{
 let calls=0;
 await assert.rejects(client(async()=>{calls++;return fail(429,'quotaExceeded');}).getVideos([id]),{code:'QUOTA_EXCEEDED'});
 assert.equal(calls,1);
 calls=0;
 await assert.rejects(client(async()=>{calls++;return fail(503);},{maxRetries:1}).getVideos([id]),{code:'HTTP_ERROR'});
 assert.equal(calls,2);
});
test('timeout has a bounded wall-clock deadline',async()=>{
 const c=client(()=>new Promise(()=>{}),{timeoutMs:8,maxRetries:0});
 const watchdog=new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout watchdog exceeded')),150));
 await assert.rejects(Promise.race([c.getVideos([id]),watchdog]),{code:'TIMEOUT'});
});

test('adversarial: concurrent cancellation is isolated from another call',async()=>{
 const stop=new AbortController();
 const c=client((_url,{signal})=>new Promise((resolve,reject)=>{
  signal.addEventListener('abort',()=>reject(new Error(secret)),{once:true});
  if(!stop.signal.aborted) setImmediate(()=>resolve(ok([{id,snippet:{title:'Math',channelTitle:'Channel'}}])));
 }),{maxRetries:0,timeoutMs:1000});
 stop.abort();
 const [cancelled,other]=await Promise.allSettled([c.getVideos([id],{signal:stop.signal}),c.getVideos([id])]);
 assert.equal(cancelled.status,'rejected');
 assert.equal(cancelled.reason.code,'ABORTED');
 assert.equal(other.status,'fulfilled');
 assert.equal(other.value.videos.length,1);
});
test('adversarial: malformed transport responses do not expose credentials',async()=>{
 const fixtures=[null,{}, {ok:'yes'}, {ok:true,status:200,json:async()=>{throw new Error(secret);}}];
 for(const fixture of fixtures){
  await assert.rejects(client(async()=>fixture,{maxRetries:0}).getVideos([id]),e=>{
   assert.ok(['INVALID_RESPONSE','INVALID_JSON'].includes(e.code));
   assert.ok(!JSON.stringify({message:e.message,code:e.code,status:e.status}).includes(secret));
   return true;
  });
 }
});
test('adversarial: poisoned HTTP reason does not propagate into public errors',async()=>{
 const poison={error:{errors:[{reason:secret}],message:secret}};
 const response={ok:false,status:403,headers:{get:()=>null},json:async()=>poison};
 await assert.rejects(client(async()=>response,{maxRetries:0}).getVideos([id]),e=>{
  assert.equal(e.code,'ACCESS_DENIED');
  assert.equal(e.status,403);
  assert.ok(!e.message.includes(secret));
  return true;
 });
});
test('adversarial: sequential retry attempts use independent bounded deadlines',async()=>{
 let attempts=0;
 const c=client(()=>{attempts++;return new Promise(()=>{});},{maxRetries:2,timeoutMs:6});
 const started=Date.now();
 const result=await Promise.race([
  c.getVideos([id]).then(()=>({type:'resolved'}),e=>({type:'rejected',code:e.code})),
  new Promise(resolve=>setTimeout(()=>resolve({type:'watchdog'}),500))
 ]);
 assert.deepEqual(result,{type:'rejected',code:'TIMEOUT'});
 assert.equal(attempts,1);
 assert.ok(Date.now()-started<500);
});
test('adversarial: independent calls do not share retry counters',async()=>{
 let calls=0;
 const c=client(async()=>{calls++;return fail(503);},{maxRetries:1});
 const settled=await Promise.allSettled([c.getVideos([id]),c.getVideos([id])]);
 assert.equal(calls,4);
 for(const result of settled){assert.equal(result.status,'rejected');assert.equal(result.reason.code,'HTTP_ERROR');}
});
