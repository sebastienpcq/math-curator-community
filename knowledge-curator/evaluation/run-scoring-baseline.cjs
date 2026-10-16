'use strict';
const fs=require('node:fs');
const path=require('node:path');
require('../../src/config.js');
const scoring=require('../../src/scoring.js');
const corpus=require('./pedagogical-corpus-v0.2.json');
const results=corpus.videos.map(v=>{
 const video={id:v.id,title:v.title,channel:v.channel,context:''};
 const evidence=scoring.evaluate(video);
 const decisions={};
 for(const mode of ['balanced','strict']){
  const settings={...globalThis.MathConfig.DEFAULTS,enabled:true,mode,level:'all',domains:[]};
  decisions[mode]=scoring.decide(evidence,video,settings);
 }
 return {id:v.id,title:v.title,expectedDomain:v.domainExpected,
  expectedRelevant:v.referenceLabels.mathematicalRelevance,
  inputFields:['id','title','channel'],contextProvided:false,
  score:evidence.score,relevant:evidence.relevant,domains:evidence.domains,
  confidence:evidence.confidence,signals:evidence.signals,decisions};
});
const summary={count:results.length,balancedShown:results.filter(x=>x.decisions.balanced==='show').length,
 balancedHidden:results.filter(x=>x.decisions.balanced==='hide').length,
 balancedUnknown:results.filter(x=>x.decisions.balanced==='unknown').length,
 strictShown:results.filter(x=>x.decisions.strict==='show').length,
 strictHidden:results.filter(x=>x.decisions.strict==='hide').length,
 strictUnknown:results.filter(x=>x.decisions.strict==='unknown').length};
const output={source:'src/scoring.js',sourceInput:'title only; context empty; no full descriptions stored',settings:'level all, threshold 42, no allow/block lists',summary,results};
console.log('MATH_CURATOR_BASELINE_JSON='+JSON.stringify(output));
if(results.length!==10||new Set(results.map(x=>x.id)).size!==10)throw Error('Invalid corpus');
if(results.some(x=>!['show','hide','unknown'].includes(x.decisions.balanced)))throw Error('Invalid decision');
if(process.env.BASELINE_OUTPUT)fs.writeFileSync(process.env.BASELINE_OUTPUT,JSON.stringify(output,null,2)+'\n');
