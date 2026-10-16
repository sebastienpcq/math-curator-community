'use strict';
const {normalizeVideo}=require('./metadata.cjs');
const ID=/^[A-Za-z0-9_-]{11}$/;
const RETRYABLE=new Set([429,500,502,503]);
function apiError(code,status=null){const error=new Error('YouTube API request failed: '+code);error.code=code;error.status=status;return error;}
function createYouTubeClient({apiKey,fetchImpl=globalThis.fetch,maxRetries=2,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),timeoutMs=10000}={}){
 if(!apiKey||typeof apiKey!=='string')throw new TypeError('Server-side API key required');
 if(typeof fetchImpl!=='function')throw new TypeError('fetch required');
 if(!Number.isInteger(maxRetries)||maxRetries<0||maxRetries>5)throw new TypeError('Invalid retry limit');
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new TypeError('Invalid timeout');
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
   const timer=setTimeout(()=>controller.abort(),timeoutMs);
   let response;
   try{response=await fetchImpl(url.toString(),{signal:controller.signal,redirect:'error',headers:{'X-Goog-Api-Key':apiKey}});}
   catch(e){
    const code=signal?.aborted?'ABORTED':controller.signal.aborted?'TIMEOUT':'NETWORK_ERROR';
    if(code==='NETWORK_ERROR'&&attempt<maxRetries){await sleep(200*Math.pow(2,attempt));continue;}
    throw apiError(code);
   }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
   if(!response||typeof response.ok!=='boolean')throw apiError('INVALID_RESPONSE');
   if(!response.ok){
    let reason='';
    try{const body=await response.json();reason=String(body?.error?.errors?.[0]?.reason||body?.error?.status||'');}catch{}
    const quota=['quotaExceeded','dailyLimitExceeded','QUOTA_EXCEEDED'].includes(reason);
    const rate=['rateLimitExceeded','userRateLimitExceeded','RATE_LIMIT_EXCEEDED'].includes(reason)||response.status===429;
    const code=quota?'QUOTA_EXCEEDED':rate?'RATE_LIMITED':response.status===401||response.status===403?'ACCESS_DENIED':'HTTP_ERROR';
    if(!quota&&(rate||RETRYABLE.has(response.status))&&attempt<maxRetries){
     const header=response.headers?.get?.('retry-after');
     const seconds=header&&/^\d+$/.test(header)?Number(header):NaN;
     const delay=Number.isFinite(seconds)?Math.min(seconds*1000,30000):200*Math.pow(2,attempt);
     await sleep(delay);continue;
    }
    throw apiError(code,response.status);
   }
   let data;try{data=await response.json();}catch{throw apiError('INVALID_JSON');}
   if(!data||typeof data!=='object'||!Array.isArray(data.items))throw apiError('INVALID_PAYLOAD');
   const found=new Map();
   for(const item of data.items){
    if(!item||!unique.includes(item.id)||!item.snippet?.title)continue;
    try{found.set(item.id,normalizeVideo({id:item.id,title:item.snippet.title,channelTitle:item.snippet.channelTitle,description:item.snippet.description}));}
    catch{continue;}
   }
   return {videos:unique.filter(id=>found.has(id)).map(id=>found.get(id)),missingIds:unique.filter(id=>!found.has(id))};
  }
 }};
}
module.exports={createYouTubeClient};
