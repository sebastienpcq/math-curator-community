'use strict';
(function(root){
 function latestByExercise(events,skillId){
  const latest=new Map();
  for(const e of events)if(e.skillId===skillId)latest.set(e.exerciseId,e.correct);
  return latest;
 }
 function achieved(step,events){
  if(!step||!Array.isArray(step.exerciseIds)||step.exerciseIds.length<2)return false;
  const last=latestByExercise(events,step.id);
  return step.exerciseIds.every(id=>last.get(id)===true);
 }
 function status(step,events){
  const matching=events.filter(e=>e.skillId===step.id);
  if(achieved(step,events))return 'demonstrated';
  if(matching.some(e=>!e.correct))return 'consolidate';
  if(matching.length)return 'in_progress';
  return 'not_started';
 }
 const api={latestByExercise,achieved,status};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.KnowledgeMastery=api;
})(typeof window!=='undefined'?window:globalThis);
