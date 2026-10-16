'use strict';
const fs=require('node:fs');
const scoring=require('../../src/scoring.js');
const corpus=require('./real-negative-corpus-v0.1.json');
const results=corpus.videos.map(v=>{
 const evidence=scoring.evaluate({id:v.id,title:v.title,channel:v.channel,context:''});
 return {id:v.id,reference:v.label,predictedRelevant:evidence.relevant,score:evidence.score,domains:evidence.domains,provisionalLabel:true};
});
const falsePositives=results.filter(v=>v.reference==='negative'&&v.predictedRelevant);
const output={scope:'Three real videos, negative labels based on verified metadata, not independently double annotated',results,falsePositives:falsePositives.length};
console.log('MATH_CURATOR_REAL_NEGATIVE_PILOT='+JSON.stringify(output));
if(process.env.BASELINE_OUTPUT)fs.writeFileSync(process.env.BASELINE_OUTPUT,JSON.stringify(output,null,2)+'\n');
