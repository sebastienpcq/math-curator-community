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
  });
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
     if(!next||next.version!==3||!Array.isArray(next.attempts)||!next.progress||
        typeof next.progress!=='object'||Array.isArray(next.progress))throw Error('Invalid state');
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
