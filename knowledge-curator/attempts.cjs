'use strict';
/* Separate event history from competency status; never silently discard an event. */
(function(root){
 const KEY='knowledge-curator-attempts-v1';
 function validEvent(x){
  return x&&typeof x==='object'&&!Array.isArray(x)&&
   typeof x.skillId==='string'&&/^[a-z0-9-]{1,80}$/.test(x.skillId)&&
   typeof x.exerciseId==='string'&&/^[a-z0-9-]{1,80}$/.test(x.exerciseId)&&
   typeof x.correct==='boolean'&&typeof x.timestamp==='string'&&
   Number.isFinite(Date.parse(x.timestamp));
 }
 function validateHistory(h){
  return Array.isArray(h)&&h.every(validEvent);
 }
 function read(storage){
  const raw=storage.getItem(KEY);
  if(raw===null)return [];
  const parsed=JSON.parse(raw);
  if(!validateHistory(parsed))throw Error('Historique local invalide');
  return parsed;
 }
 function append(storage,event){
  if(!validEvent(event))throw Error('Tentative invalide');
  const previous=read(storage);
  const next=[...previous,{skillId:event.skillId,exerciseId:event.exerciseId,correct:event.correct,timestamp:event.timestamp}];
  storage.setItem(KEY,JSON.stringify(next));
  return next;
 }
 function replace(storage,history){
  if(!validateHistory(history))throw Error('Historique importé invalide');
  storage.setItem(KEY,JSON.stringify(history));
 }
 const api={KEY,validEvent,validateHistory,read,append,replace};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.KnowledgeAttempts=api;
})(typeof window!=='undefined'?window:globalThis);
