'use strict';
(function(root){
 const KEY='knowledge-curator-state-v3';
 const VERSION=3;
 function plain(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
 function validProgress(progress){
  return plain(progress)&&Object.entries(progress).every(([id,v])=>
   /^[a-z0-9-]{1,80}$/.test(id)&&plain(v)&&
   ['in_progress','consolidate','demonstrated'].includes(v.status)&&
   typeof v.updatedAt==='string'&&Number.isFinite(Date.parse(v.updatedAt)));
 }
 function validLegacyArchive(raw){
  try {
   const archive=JSON.parse(raw);
   return plain(archive)&&archive.version===1&&
    typeof archive.importedAt==='string'&&Number.isFinite(Date.parse(archive.importedAt))&&
    validProgress(archive.progress);
  } catch {return false;}
 }
 function validate(record){
  return plain(record)&&record.version===VERSION&&
   validProgress(record.progress)&&
   Array.isArray(record.attempts)&&
   record.attempts.every(e=>plain(e)&&
    typeof e.skillId==='string'&&/^[a-z0-9-]{1,80}$/.test(e.skillId)&&
    typeof e.exerciseId==='string'&&/^[a-z0-9-]{1,80}$/.test(e.exerciseId)&&
    typeof e.correct==='boolean'&&typeof e.timestamp==='string'&&Number.isFinite(Date.parse(e.timestamp)))&&
   (record.legacyArchive===null||(
    typeof record.legacyArchive==='string'&&validLegacyArchive(record.legacyArchive)));
 }
 function fromLegacy(storage){
  const progressRaw=storage.getItem('knowledge-curator-progress-v1');
  const attemptsRaw=storage.getItem('knowledge-curator-attempts-v1');
  const archive=storage.getItem('knowledge-curator-legacy-v1-archive');
  const record={version:VERSION,progress:progressRaw===null?{}:JSON.parse(progressRaw),
   attempts:attemptsRaw===null?[]:JSON.parse(attemptsRaw),legacyArchive:archive};
  if(!validate(record))throw Error('Invalid legacy state');
  return record;
 }
 function read(storage){
  const raw=storage.getItem(KEY);
  if(raw===null)return null;
  const record=JSON.parse(raw);
  if(!validate(record))throw Error('Invalid canonical state');
  return record;
 }
 function migrate(storage){
  const existing=read(storage);
  if(existing)return existing;
  const record=fromLegacy(storage);
  storage.setItem(KEY,JSON.stringify(record));
  const confirmed=read(storage);
  if(!confirmed)throw Error('Migration not persisted');
  return confirmed;
 }
 const api={KEY,VERSION,validate,validProgress,validLegacyArchive,fromLegacy,read,migrate};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.KnowledgeStateV3=api;
})(typeof window!=='undefined'?window:globalThis);
