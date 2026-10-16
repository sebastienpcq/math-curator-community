'use strict';
const fs=require('node:fs');
require('../../src/config.js');
const scoring=require('../../src/scoring.js');
const corpus=require('./pedagogical-corpus-v0.2.json');
const settings=mode=>({...globalThis.MathConfig.DEFAULTS,enabled:true,mode,level:'all',domains:[]});
const rows=corpus.videos.map(v=>{
 const make=context=>{
  const video={id:v.id,title:v.title,channel:v.channel,context};
  const ev=scoring.evaluate(video);
  return {score:ev.score,domains:ev.domains,confidence:ev.confidence,
   balanced:scoring.decide(ev,video,settings('balanced')),
   strict:scoring.decide(ev,video,settings('strict'))};
 };
 return {id:v.id,domainExpected:v.domainExpected,descriptionAvailable:typeof v.descriptionExcerpt==='string',
  titleOnly:make(''),titleAndExcerpt:typeof v.descriptionExcerpt==='string'?make(v.descriptionExcerpt):null};
});
const output={note:'Partial verified excerpts only, not full descriptions. No independent negative video labels.',rows};
console.log('MATH_CURATOR_PAIRED='+JSON.stringify(output));
if(process.env.BASELINE_OUTPUT)fs.writeFileSync(process.env.BASELINE_OUTPUT,JSON.stringify(output,null,2)+'\n');
