'use strict';
const {normalizeVideo}=require('./metadata.cjs');
const ID=/^[A-Za-z0-9_-]{11}$/;
const RETRYABLE=new Set([429,500,502,503]);
function apiError(code,status=null){const e=new Error('YouTube API request failed: '+code);e.code=code;e.status=status;return e;}
function createYouTubeClient({apiKey,fetchImpl=globalThis.fetch,maxRetries=2,sleep=ms=>new Promise(r=>setTimeout(r,ms)),timeoutMs=10000}={}){
 if(!apiKey||typeof apiKey!=='string')throw new TypeError('Server-side API key required');
 if(typeof fetchImpl!=='function')throw new TypeError('fetch required');
 if(!Number.isInteger(maxRetries)||maxRetries<0||maxRetries>5)throw new TypeError('Invalid retry limit');
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new TypeError('Invalid timeout');
 async function wait(ms,signal){
  if(signal?.aborted)throw apiError('ABORTED');
  let listener;
  const cancelled=new Promise((_,reject)=>{
   listener=()=>reject(apiError('ABORTED'));
   signal?.addEventListener('abort',listener,{once:true});
  });
  try{await (signal?Promise.race([sleep(ms),cancelled]):sleep(ms));}
  finally{signal?.removeEventListener('abort',listener);}
 }
 return {async getVideos(ids,{signal}={}){
  if(!Array.isArray(ids)||ids.length<1||ids.length>50||ids.some(id=>typeof id!=='string'||!ID.test(id)))throw new TypeError('Invalid video IDs');
  const unique=[...new Set(ids)];
  const url=new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part','snippet,contentDetails');url.searchParams.set('id',unique.join(','));
  for(let attempt=0;attempt<=maxRetries;attempt++){
   if(signal?.aborted)throw apiError('ABORTED');
   const controller=new AbortController();
   const abort=()=>controller.abort();
   signal?.addEventListener('abort',abort,{once:true});
   const timer=setTimeout(abort,timeoutMs);
   let response,body;
   try{
    response=await Promise.race([
     fetchImpl(url.toString(),{signal:controller.signal,redirect:'error',headers:{'X-Goog-Api-Key':apiKey}}),
     new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(apiError(signal?.aborted?'ABORTED':'TIMEOUT')),{once:true}))
    ]);
    if(!response||typeof response.ok!=='boolean')throw apiError('INVALID_RESPONSE');
    try{
     body=await Promise.race([
      response.json(),
      new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(apiError(signal?.aborted?'ABORTED':'TIMEOUT')),{once:true}))
     ]);
    }catch(e){if(e?.code==='TIMEOUT'||e?.code==='ABORTED')throw e;throw apiError(response.ok?'INVALID_JSON':'HTTP_ERROR',response.status);}
   }catch(e){
    const code=signal?.aborted?'ABORTED':controller.signal.aborted?'TIMEOUT':e?.code||'NETWORK_ERROR';
    if(code==='NETWORK_ERROR'&&attempt<maxRetries){await wait(200*2**attempt,signal);continue;}
    throw apiError(code,e?.status||null);
   }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
   if(!response.ok){
    const reason=String(body?.error?.errors?.[0]?.reason||body?.error?.status||'');
    const quota=['quotaExceeded','dailyLimitExceeded','QUOTA_EXCEEDED'].includes(reason);
    const rate=['rateLimitExceeded','userRateLimitExceeded','RATE_LIMIT_EXCEEDED'].includes(reason)||response.status===429;
    const code=quota?'QUOTA_EXCEEDED':rate?'RATE_LIMITED':response.status===401||response.status===403?'ACCESS_DENIED':'HTTP_ERROR';
    if(!quota&&(rate||RETRYABLE.has(response.status))&&attempt<maxRetries){
     const header=response.headers?.get?.('retry-after');
     const seconds=header&&/^\d+$/.test(header)?Number(header):NaN;
     await wait(Number.isFinite(seconds)?Math.min(seconds*1000,30000):200*2**attempt,signal);
     continue;
    }
    throw apiError(code,response.status);
   }
   if(!body||typeof body!=='object'||!Array.isArray(body.items))throw apiError('INVALID_PAYLOAD');
   const found=new Map();
   for(const item of body.items){
    if(!item||!unique.includes(item.id)||!item.snippet?.title)continue;
    try{found.set(item.id,normalizeVideo({id:item.id,title:item.snippet.title,channelTitle:item.snippet.channelTitle,description:item.snippet.description}));}catch{}
   }
   return {videos:unique.filter(id=>found.has(id)).map(id=>found.get(id)),missingIds:unique.filter(id=>!found.has(id))};
  }
 }};
}
module.exports={createYouTubeClient};
