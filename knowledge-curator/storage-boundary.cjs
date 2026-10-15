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
 const api={PROGRESS,JOURNAL,pending,readProgress,writeProgress,writeDuringRecovery,readAttempts,appendAttempt};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.KnowledgeStorage=api;
})(typeof window!=='undefined'?window:globalThis);
