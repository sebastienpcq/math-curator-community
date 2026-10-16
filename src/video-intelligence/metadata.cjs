(function(root){
'use strict';
// Public metadata normalization, independent of vidIQ and external AI services.
// Never fetch captions or private content. Consumers supply authorized metadata.
const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;
function normalizeVideo(input){
 if(!input||typeof input!=='object')throw new TypeError('Video metadata must be an object');
 const id=String(input.id||input.videoId||'').trim();
 if(!VIDEO_ID.test(id))throw new TypeError('Invalid YouTube video ID');
 const title=String(input.title||'').trim().slice(0,300);
 if(!title)throw new TypeError('Video title is required');
 return Object.freeze({
  id,title,channel:String(input.channel||input.channelTitle||'').trim().slice(0,120),
  context:String(input.context||input.description||'').trim().slice(0,3000),
  url:'https://www.youtube.com/watch?v='+id
 });
}
function classify(video,scoring,settings){
 if(!scoring||typeof scoring.evaluate!=='function'||typeof scoring.decide!=='function')
  throw new TypeError('Scoring engine required');
 const normalized=normalizeVideo(video);
 const evaluation=scoring.evaluate(normalized,settings);
 const decision=scoring.decide(evaluation,normalized,settings);
 return {video:normalized,evaluation,decision,
  provenance:'public metadata only; mathematical correctness not verified'};
}
const api={normalizeVideo,classify};
root.MathVideoIntelligence=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
