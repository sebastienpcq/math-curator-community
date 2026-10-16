'use strict';
const {createYouTubeClient}=require('./youtube-api.cjs');
const DEFAULT_ID='PFDu9oVAE-g';
async function run({env=process.env,fetchImpl=globalThis.fetch,write=console.log}={}){
 const key=env.YOUTUBE_API_KEY;
 if(!key){write(JSON.stringify({status:'blocked',reason:'YOUTUBE_API_KEY is not configured; no network request made'}));return 2;}
 const id=env.YOUTUBE_VIDEO_ID||DEFAULT_ID;
 try{
  const client=createYouTubeClient({apiKey:key,fetchImpl,maxRetries:0});
  const result=await client.getVideos([id]);
  const v=result.videos[0];
  write(JSON.stringify({status:v?'success':'not_found',source:'YouTube Data API v3',
   video:v?{id:v.id,title:v.title,channel:v.channel}:null,
   missingIds:result.missingIds}));
  return v?0:3;
 }catch(error){
  write(JSON.stringify({status:'error',code:error.code||'REQUEST_FAILED',
   httpStatus:error.status||null}));
  return 1;
 }
}
if(require.main===module)run().then(code=>{process.exitCode=code;});
module.exports={run};
