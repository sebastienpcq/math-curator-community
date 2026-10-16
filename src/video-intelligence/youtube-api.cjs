'use strict';
const {normalizeVideo}=require('./metadata.cjs');
const ID=/^[A-Za-z0-9_-]{11}$/;
function createYouTubeClient({apiKey,fetchImpl=globalThis.fetch}={}){
 if(!apiKey||typeof apiKey!=='string')throw new TypeError('Server-side API key required');
 if(typeof fetchImpl!=='function')throw new TypeError('fetch required');
 return {async getVideos(ids,{signal}={}){
  if(!Array.isArray(ids)||ids.length<1||ids.length>50||ids.some(id=>!ID.test(id)))throw new TypeError('Invalid video IDs');
  const unique=[...new Set(ids)];
  const url=new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part','snippet,contentDetails');url.searchParams.set('id',unique.join(','));
  let response;try{response=await fetchImpl(url.toString(),{signal,redirect:'error',headers:{'X-Goog-Api-Key':apiKey}});}catch(e){throw new Error('Network failure');}
  if(!response.ok){let reason='';try{const body=await response.json();reason=String(body?.error?.errors?.[0]?.reason||'');}catch{}const code=['quotaExceeded','dailyLimitExceeded'].includes(reason)?'QUOTA_EXCEEDED':response.status===401||response.status===403?'ACCESS_DENIED':'HTTP_ERROR';const err=new Error('YouTube API request failed: '+code);err.status=response.status;err.code=code;throw err;}
  let data;try{data=await response.json();}catch{throw new Error('Invalid JSON');}
  if(!data||typeof data!=='object'||!Array.isArray(data.items))throw new Error('Invalid API payload');
  const found=new Map();for(const item of data.items){if(!unique.includes(item.id)||!item.snippet?.title)continue;found.set(item.id,normalizeVideo({id:item.id,title:item.snippet.title,channelTitle:item.snippet.channelTitle,description:item.snippet.description}));}
  return {videos:unique.filter(id=>found.has(id)).map(id=>found.get(id)),missingIds:unique.filter(id=>!found.has(id))};
 }};
}
module.exports={createYouTubeClient};
