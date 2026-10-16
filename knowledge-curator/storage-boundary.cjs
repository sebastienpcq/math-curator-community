'use strict';
// Centralized legacy storage boundary. IndexedDB is NOT activated here.
(function(root){
 const PROGRESS='knowledge-curator-progress-v1';
 const JOURNAL='knowledge-curator-import-journal-v1';
 function pending(storage){return storage.getItem(JOURNAL)!==null;}
 function readProgress(storage,validate){
  if(pending(storage))throw Error('Legacy recovery pending');
  const raw=storage.getItem(PROGRESS);
  const value=raw===null?{}:JSON.parse(raw);
  if(!validate(value))throw Error('Invalid progress');
  return value;
 }
 function readArchive(storage,validate){
  if(pending(storage))throw Error('Legacy recovery pending');
  const raw=storage.getItem('knowledge-curator-legacy-v1-archive');
  if(!validArchive(raw,validate))throw Error('Invalid existing archive');
  return raw;
 }
 function writeProgress(storage,value,validate){
  if(pending(storage))throw Error('Legacy recovery pending');
  if(!validate(value))throw Error('Invalid progress');
  storage.setItem(PROGRESS,JSON.stringify(value));
 }
 // Only the import/reset transaction owner may call this while its
 // recovery journal is present. Ordinary writes remain blocked.
 function writeDuringRecovery(storage,value,validate){
  if(!pending(storage))throw Error('Recovery journal required');
  if(!validate(value))throw Error('Invalid progress');
  storage.setItem(PROGRESS,JSON.stringify(value));
 }
 function readAttempts(storage,attemptsModule){
  if(pending(storage))throw Error('Legacy recovery pending');
  return attemptsModule.read(storage);
 }
 function appendAttempt(storage,attemptsModule,attempt){
  if(pending(storage))throw Error('Legacy recovery pending');
  return attemptsModule.append(storage,attempt);
 }
 function validArchive(raw,validate){
  if(raw===null)return true;
  if(typeof raw!=='string')return false;
  const schema=root.KnowledgeStateV3;
  if(!schema||typeof schema.validLegacyArchive!=='function')
   throw Error('Canonical archive validator unavailable');
  if(!schema.validLegacyArchive(raw))return false;
  return validate(JSON.parse(raw).progress);
 }
 function recover(storage,attemptsModule,validate){
  const raw=storage.getItem(JOURNAL);
  if(raw===null)return false;
  const schema=root.KnowledgeStateV3;
  if(typeof schema?.validLegacyArchive!=='function')
   throw Error('Canonical archive validator unavailable');
  const snapshot=JSON.parse(raw);
  if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||
     !Object.hasOwn(snapshot,'progress')||!Object.hasOwn(snapshot,'attempts')||
     (snapshot.progress!==null&&typeof snapshot.progress!=='string')||
     (snapshot.attempts!==null&&typeof snapshot.attempts!=='string'))
   throw Error('Invalid recovery journal');
  const progress=snapshot.progress===null?{}:JSON.parse(snapshot.progress);
  const attempts=snapshot.attempts===null?[]:JSON.parse(snapshot.attempts);
  if(!validate(progress)||!attemptsModule.validateHistory(attempts))
   throw Error('Invalid recovery journal');
  if(Object.hasOwn(snapshot,'legacyArchive')&&
     !validArchive(snapshot.legacyArchive,validate))
   throw Error('Invalid recovery archive');
  const operations=[
   ...(Object.hasOwn(snapshot,'legacyArchive')
    ?[['knowledge-curator-legacy-v1-archive',snapshot.legacyArchive]]:[]),
   [attemptsModule.KEY,snapshot.attempts],[PROGRESS,snapshot.progress]
  ];
  for(const [key,value] of operations){
   if(value===null)storage.removeItem(key);
   else storage.setItem(key,value);
  }
  storage.removeItem(JOURNAL);
  return true;
 }
 // Transaction coordinator for the three legacy keys. The journal is
 // retained if rollback fails, allowing the existing startup recovery.
 function transaction(storage,attemptsModule,validate,mutate){
  if(typeof root.KnowledgeStateV3?.validLegacyArchive!=='function')
   throw Error('Canonical archive validator unavailable');
  if(pending(storage))throw Error('Legacy recovery pending');
  const ATTEMPTS=attemptsModule.KEY;
  const ARCHIVE='knowledge-curator-legacy-v1-archive';
  const snapshot={progress:storage.getItem(PROGRESS),attempts:storage.getItem(ATTEMPTS),
   legacyArchive:storage.getItem(ARCHIVE)};
  const before={
   progress:snapshot.progress===null?{}:JSON.parse(snapshot.progress),
   attempts:attemptsModule.read(storage),
   legacyArchive:snapshot.legacyArchive
  };
  if(!validate(before.progress))throw Error('Invalid existing progress');
  if(!validArchive(before.legacyArchive,validate))throw Error('Invalid existing archive');
  const next=mutate(structuredClone(before));
  if(!next||!validate(next.progress)||!attemptsModule.validateHistory(next.attempts)||
     !validArchive(next.legacyArchive,validate))
   throw Error('Invalid transaction state');
  storage.setItem(JOURNAL,JSON.stringify(snapshot));
  try{
   attemptsModule.replace(storage,next.attempts);
   writeDuringRecovery(storage,next.progress,validate);
   if(next.legacyArchive===null)storage.removeItem(ARCHIVE);
   else storage.setItem(ARCHIVE,next.legacyArchive);
   storage.removeItem(JOURNAL);
   return next;
  }catch(error){
   try{
    for(const [key,value] of [[ATTEMPTS,snapshot.attempts],[PROGRESS,snapshot.progress],[ARCHIVE,snapshot.legacyArchive]]){
     if(value===null)storage.removeItem(key);
     else storage.setItem(key,value);
    }
    storage.removeItem(JOURNAL);
   }catch(rollbackError){
    throw Error('Rollback failed; recovery journal retained',{cause:rollbackError});
   }
   throw error;
  }
 }
 const api={PROGRESS,JOURNAL,pending,readProgress,readArchive,writeProgress,writeDuringRecovery,readAttempts,appendAttempt,transaction,recover};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.KnowledgeStorage=api;
})(typeof window!=='undefined'?window:globalThis);
