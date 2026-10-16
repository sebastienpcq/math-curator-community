'use strict';
const fs=require('node:fs');
const scoring=require('../../src/scoring.js');
const fixtures=require('./adversarial-text-fixtures-v0.1.json');
const rows=fixtures.cases.map(v=>{
 const ev=scoring.evaluate({title:v.title});
 return {title:v.title,reference:v.relevant,predicted:ev.relevant,score:ev.score,domains:ev.domains,ambiguous:!!v.ambiguous};
});
const counts={tp:0,fp:0,tn:0,fn:0};
for(const v of rows){const k=v.reference?(v.predicted?'tp':'fn'):(v.predicted?'fp':'tn');counts[k]++;}
const precision=counts.tp+counts.fp?counts.tp/(counts.tp+counts.fp):null;
const recall=counts.tp+counts.fn?counts.tp/(counts.tp+counts.fn):null;
const f1=precision!==null&&recall!==null&&precision+recall?2*precision*recall/(precision+recall):null;
const output={scope:'synthetic metadata relevance only; not real video pedagogical quality',counts,precision,recall,f1,rows};
console.log('MATH_CURATOR_SYNTHETIC='+JSON.stringify(output));
if(process.env.BASELINE_OUTPUT)fs.writeFileSync(process.env.BASELINE_OUTPUT,JSON.stringify(output,null,2)+'\n');
