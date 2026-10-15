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
   request.onsuccess=()=>{
    try{
     const previous=request.result||{version:3,progress:{},attempts:[],legacyArchive:null};
     const next=change(structuredClone(previous));
     if(!next||next.version!==3||!Array.isArray(next.attempts)||!next.progress||
        typeof next.progress!=='object'||Array.isArray(next.progress))throw Error('Invalid state');
     result=next;
     store.put(next,KEY);
    }catch(error){
     tx.abort();
    }
   };
   tx.oncomplete=()=>resolve(result);
   tx.onabort=()=>reject(tx.error||Error('IndexedDB transaction aborted'));
   tx.onerror=()=>reject(tx.error||Error('IndexedDB transaction failed'));
  });
 }
 const api={DB_NAME,STORE,KEY,open,transact};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.KnowledgeIndexedDB=api;
})(typeof window!=='undefined'?window:globalThis);
