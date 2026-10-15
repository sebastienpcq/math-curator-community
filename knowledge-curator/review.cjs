'use strict';
(function(root){
 const DAY=86400000;
 const INTERVALS=[1,3,7,14,30];
 function validDate(s){const n=Date.parse(s);return Number.isFinite(n)?n:null;}
 function reviewState(step,events,now=Date.now()){
  const ordered=events.filter(e=>e.skillId===step.id).slice().sort((a,b)=>validDate(a.timestamp)-validDate(b.timestamp));
  const errors=ordered.filter(e=>!e.correct).length;
  const latest=ordered.at(-1);
  const lastCorrect=ordered.filter(e=>e.correct).at(-1);
  const independent=new Set(ordered.filter(e=>e.correct).map(e=>e.exerciseId)).size;
  if(!latest)return {errors:0,independent:0,due:false,nextAt:null,stage:0};
  const last=validDate(latest.timestamp);
  const successive=ordered.slice().reverse().findIndex(e=>!e.correct);
  const streak=successive<0?ordered.length:successive;
  const stage=Math.min(Math.max(0,streak-1),INTERVALS.length-1);
  // An incorrect answer invalidates the pending successful-review schedule.
  // The skill remains in weakSkills; a new success starts a fresh interval.
  const dueAt=latest.correct&&lastCorrect!==undefined
   ?last+INTERVALS[stage]*DAY
   :null;
  return {errors,independent,stage,due:dueAt!==null&&now>=dueAt,nextAt:dueAt===null?null:new Date(dueAt).toISOString()};
 }
 function weakSkills(path,events){
  return path.steps.map(s=>({step:s,review:reviewState(s,events)}))
   .filter(x=>x.review.errors>0).sort((a,b)=>b.review.errors-a.review.errors);
 }
 const api={INTERVALS,reviewState,weakSkills};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.KnowledgeReview=api;
})(typeof window!=='undefined'?window:globalThis);
