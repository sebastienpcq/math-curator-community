'use strict';
// Experimental IndexedDB adapter. Not loaded by the production UI.
(function(root){
 const DB_NAME='knowledge-curator-experimental';
 const STORE='state';
 const KEY='canonical';
 function open(indexedDBFactory){
  return new Promise((resolve,reject)=>{
   const request=indexedDBFactory.open(DB_NAME,1);
   request.onupgradeneeded=()=>{
    const db=request.result;
    if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
   };
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error||Error('IndexedDB open failed'));
   request.onblocked=()=>reject(Error('IndexedDB upgrade blocked by another tab'));
  });
 }
 function validState(record){
  if(!record||typeof record!=='object'||Array.isArray(record)||record.version!==3)return false;
  if(!record.progress||typeof record.progress!=='object'||Array.isArray(record.progress))return false;
  if(!Object.entries(record.progress).every(([id,v])=>
    /^[a-z0-9-]{1,80}$/.test(id)&&v&&typeof v==='object'&&!Array.isArray(v)&&
    ['in_progress','consolidate','demonstrated'].includes(v.status)&&
    typeof v.updatedAt==='string'&&Number.isFinite(Date.parse(v.updatedAt))))return false;
  if(!Array.isArray(record.attempts)||!record.attempts.every(e=>
    e&&typeof e==='object'&&!Array.isArray(e)&&
    typeof e.skillId==='string'&&/^[a-z0-9-]{1,80}$/.test(e.skillId)&&
    typeof e.exerciseId==='string'&&/^[a-z0-9-]{1,80}$/.test(e.exerciseId)&&
    typeof e.correct==='boolean'&&typeof e.timestamp==='string'&&Number.isFinite(Date.parse(e.timestamp))))return false;
  if(record.legacyArchive!==null){
    if(typeof record.legacyArchive!=='string')return false;
    try {
      const archive=JSON.parse(record.legacyArchive);
      if(!archive||archive.version!==1||!archive.progress||typeof archive.progress!=='object')return false;
    }catch{return false;}
  }
  return true;
 }
 function transact(db,change){
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite');
   const store=tx.objectStore(STORE);
   const request=store.get(KEY);
   let result;
   let changeError=null;
   request.onsuccess=()=>{
    try{
     const previous=request.result===undefined?{version:3,progress:{},attempts:[],legacyArchive:null}:request.result;
     const next=change(structuredClone(previous));
     if(!validState(next))throw Error('Invalid state');
     result=next;
     store.put(next,KEY);
    }catch(error){
     changeError=error;
     tx.abort();
    }
   };
   tx.oncomplete=()=>resolve(result);
   tx.onabort=()=>reject(changeError||tx.error||Error('IndexedDB transaction aborted'));
   tx.onerror=()=>reject(tx.error||Error('IndexedDB transaction failed'));
  });
 }
 function read(db){
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readonly');
   const request=tx.objectStore(STORE).get(KEY);
   request.onsuccess=()=>resolve(request.result===undefined?null:request.result);
   request.onerror=()=>reject(request.error||Error('IndexedDB read failed'));
   tx.onabort=()=>reject(tx.error||Error('IndexedDB read aborted'));
  });
 }
 async function migrateFromLegacy(db,legacyStorage,stateV3){
  // Never delete or rewrite legacy keys. Existing canonical data wins.
  const existing=await read(db);
  if(existing!==null){
   if(!stateV3.validate(existing))throw Error('Invalid IndexedDB state');
   return existing;
  }
  // A pending multi-key recovery means legacy data may be partially written.
  // Do not migrate it until the legacy recovery procedure completes.
  if(legacyStorage.getItem('knowledge-curator-import-journal-v1')!==null)
   throw Error('Legacy recovery pending');
  const snapshot=stateV3.fromLegacy(legacyStorage);
  // Recheck atomically in the same write transaction; an empty
  // canonical record is still an existing record, not an absent one.
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite');
   const store=tx.objectStore(STORE);
   const request=store.get(KEY);
   let result,changeError=null;
   request.onsuccess=()=>{
    try {
     if(request.result!==undefined){
      if(!stateV3.validate(request.result))throw Error('Invalid IndexedDB state');
      result=request.result;
     } else {
      result=snapshot;
      store.put(snapshot,KEY);
     }
    } catch(error) {changeError=error;tx.abort();}
   };
   tx.oncomplete=()=>resolve(result);
   tx.onabort=()=>reject(changeError||tx.error||Error('Migration aborted'));
   tx.onerror=()=>reject(tx.error||Error('Migration failed'));
  });
 }
 const api={DB_NAME,STORE,KEY,open,transact,read,migrateFromLegacy};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.KnowledgeIndexedDB=api;
})(typeof window!=='undefined'?window:globalThis);
