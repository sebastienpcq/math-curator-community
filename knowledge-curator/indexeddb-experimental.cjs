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
  if(typeof root.KnowledgeStateV3?.validate!=='function')
   throw Error('State V3 validator unavailable');
  return root.KnowledgeStateV3.validate(record);
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
 async function prepareMigration(db,legacyStorage,stateV3){
  if(legacyStorage.getItem('knowledge-curator-import-journal-v1')!==null)
   throw Error('Legacy recovery pending');
  const snapshot=stateV3.fromLegacy(legacyStorage);
  if(!stateV3.validate(snapshot))throw Error('Invalid legacy snapshot');
  const current=await read(db);
  if(current!==null){
   if(!stateV3.validate(current))throw Error('Invalid IndexedDB state');
   return {status:'already-present',snapshot,current};
  }
  return {status:'ready',snapshot,current:null};
 }
 async function confirmMigration(db,legacyStorage,stateV3,prepared){
  if(!prepared||prepared.status!=='ready'||!stateV3.validate(prepared.snapshot))
   throw Error('Migration not prepared');
  if(legacyStorage.getItem('knowledge-curator-import-journal-v1')!==null)
   throw Error('Legacy recovery pending');
  // Refuse if the legacy snapshot changed since preview. This is a best-effort
  // guard, not an atomic lock against concurrent localStorage writers.
  const current=stateV3.fromLegacy(legacyStorage);
  if(JSON.stringify(current)!==JSON.stringify(prepared.snapshot))
   throw Error('Legacy data changed since preview');
  // Commit the exact approved snapshot; do not reread legacy data during
  // the transaction, which could otherwise import an unreviewed revision.
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite');
   const store=tx.objectStore(STORE);
   const request=store.get(KEY);
   let result,changeError=null;
   request.onsuccess=()=>{
    try{
     if(request.result!==undefined){
      if(!stateV3.validate(request.result))throw Error('Invalid IndexedDB state');
      result=request.result;
     }else{
      result=prepared.snapshot;
      store.put(result,KEY);
     }
    }catch(error){changeError=error;tx.abort();}
   };
   tx.oncomplete=()=>resolve(result);
   tx.onabort=()=>reject(changeError||tx.error||Error('Migration aborted'));
   tx.onerror=()=>reject(tx.error||Error('Migration failed'));
  });
 }
 function inspectCutover(db,legacyStorage,stateV3){
  return Promise.resolve().then(async()=>{
   if(legacyStorage.getItem('knowledge-curator-import-journal-v1')!==null)
    return {ready:false,reason:'legacy-recovery-pending'};
   const canonical=await read(db);
   if(canonical===null)return {ready:false,reason:'canonical-missing'};
   if(!stateV3.validate(canonical))return {ready:false,reason:'canonical-invalid'};
   let legacy;
   try{legacy=stateV3.fromLegacy(legacyStorage);}
   catch{return {ready:false,reason:'legacy-invalid'};}
   if(JSON.stringify(canonical)!==JSON.stringify(legacy))
    return {ready:false,reason:'state-divergence'};
   return {ready:true,reason:'states-match'};
  });
 }
 const api={DB_NAME,STORE,KEY,open,transact,read,migrateFromLegacy,prepareMigration,confirmMigration,inspectCutover};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.KnowledgeIndexedDB=api;
})(typeof window!=='undefined'?window:globalThis);
