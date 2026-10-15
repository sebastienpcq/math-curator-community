const {test,expect}=require('@playwright/test');
test('réponse incorrecte visible et conservée après rafraîchissement',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 const first=page.locator('.study-step').first();
 await first.locator('form.exercise').first().locator('input').fill('999');
 await first.locator('form.exercise').first().locator('button[type=submit]').click();
 await expect(page.locator('#review-dashboard')).toContainText('Opérations arithmétiques');
 await expect(page.locator('#attempt-history')).toContainText('incorrect');
 await page.reload();
 await expect(page.locator('#attempt-history')).toContainText('incorrect');
 await expect(page.locator('#review-dashboard')).toContainText('Opérations arithmétiques');
});
test('réponse isolée ne valide pas la compétence',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 const first=page.locator('.study-step').first();
 await first.locator('form.exercise').first().locator('input').fill('56');
 await first.locator('form.exercise').first().locator('button[type=submit]').click();
 await expect(first.locator('.study-status')).not.toContainText('Maîtrise provisoirement démontrée');
 await expect(page.locator('#review-dashboard')).toContainText('Aucune révision échue');
});

test('import V0.5 conserve les tentatives importées après rechargement',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 const first=page.locator('.study-step').first();
 await first.locator('form.exercise').first().locator('input').fill('999');
 await first.locator('form.exercise').first().locator('button[type=submit]').click();
 const payload={version:2,progress:{},attempts:[{
  skillId:'arithmetic',exerciseId:'ex-arithmetic',correct:false,
  timestamp:'2026-10-15T00:00:00.000Z'
 }]};
 await page.locator('#progress-import').setInputFiles({
  name:'progress.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))
 });
 await expect(page.locator('#study-message')).toContainText('Progression importée');
 await page.reload();
 await expect(page.locator('#attempt-history')).toContainText('incorrect');
 await expect(page.locator('#review-dashboard')).toContainText('À consolider');
});

test('failed second storage write restores prior imported history',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 await page.locator('.study-step').first().locator('form.exercise').first().locator('input').fill('999');
 await page.locator('.study-step').first().locator('form.exercise').first().locator('button[type=submit]').click();
 const before=await page.evaluate(()=>({
  attempts:localStorage.getItem('knowledge-curator-attempts-v1'),
  progress:localStorage.getItem('knowledge-curator-progress-v1')
 }));
 await page.evaluate(()=>{
  const original=Storage.prototype.setItem;
  window.__restoreSetItem=original;
  Storage.prototype.setItem=function(key,value){
   if(key==='knowledge-curator-progress-v1')throw Error('simulated progress write failure');
   return original.call(this,key,value);
  };
 });
 const payload={version:2,progress:{},attempts:[{
  skillId:'arithmetic',exerciseId:'ex-arithmetic-v2',correct:true,
  timestamp:'2026-10-15T12:00:00.000Z'
 }]};
 await page.locator('#progress-import').setInputFiles({
  name:'failure.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))
 });
 await expect(page.locator('#study-message')).toContainText('restauration impossible');
 await page.evaluate(()=>{Storage.prototype.setItem=window.__restoreSetItem;});
 await page.reload();
 const after=await page.evaluate(()=>({
  attempts:localStorage.getItem('knowledge-curator-attempts-v1'),
  progress:localStorage.getItem('knowledge-curator-progress-v1')
 }));
 expect(after).toEqual(before);
 await expect(page.locator('#attempt-history')).toContainText('incorrect');
});

test('failed rollback reports an explicit warning',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 await page.evaluate(()=>{
  const original=Storage.prototype.setItem;
  let attemptsWrites=0;
  window.__restoreSetItem=original;
  Storage.prototype.setItem=function(key,value){
   if(key==='knowledge-curator-attempts-v1'){
    attemptsWrites++;
    if(attemptsWrites>=2)throw Error('simulated rollback failure');
   }
   if(key==='knowledge-curator-progress-v1' && attemptsWrites>0)throw Error('simulated progress failure');
   return original.call(this,key,value);
  };
 });
 const payload={version:2,progress:{},attempts:[{
  skillId:'arithmetic',exerciseId:'ex-arithmetic',correct:false,
  timestamp:'2026-10-15T00:00:00.000Z'
 }]};
 await page.locator('#progress-import').setInputFiles({
  name:'rollback.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))
 });
 await expect(page.locator('#study-message')).toContainText('restauration impossible');
 await page.evaluate(()=>{Storage.prototype.setItem=window.__restoreSetItem;});
});

test('interrupted import journal restores original state on reload',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 await page.locator('.study-step').first().locator('form.exercise').first().locator('input').fill('999');
 await page.locator('.study-step').first().locator('form.exercise').first().locator('button[type=submit]').click();
 const baseline=await page.evaluate(()=>({
  attempts:localStorage.getItem('knowledge-curator-attempts-v1'),
  progress:localStorage.getItem('knowledge-curator-progress-v1')
 }));
 await page.evaluate(()=>{
  const attemptsKey='knowledge-curator-attempts-v1';
  const progressKey='knowledge-curator-progress-v1';
  localStorage.setItem('knowledge-curator-import-journal-v1',JSON.stringify({
   attempts:localStorage.getItem(attemptsKey),progress:localStorage.getItem(progressKey)
  }));
  localStorage.setItem(attemptsKey,'[]');
  localStorage.setItem(progressKey,'{}');
 });
 await page.reload();
 const restored=await page.evaluate(()=>({
  attempts:localStorage.getItem('knowledge-curator-attempts-v1'),
  progress:localStorage.getItem('knowledge-curator-progress-v1'),
  journal:localStorage.getItem('knowledge-curator-import-journal-v1')
 }));
 expect(restored.attempts).toBe(baseline.attempts);
 expect(restored.progress).toBe(baseline.progress);
 expect(restored.journal).toBeNull();
 await expect(page.locator('#attempt-history')).toContainText('incorrect');
});

test('corrupt recovery journal does not overwrite existing history',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 await page.locator('.study-step').first().locator('form.exercise').first().locator('input').fill('999');
 await page.locator('.study-step').first().locator('form.exercise').first().locator('button[type=submit]').click();
 const before=await page.evaluate(()=>localStorage.getItem('knowledge-curator-attempts-v1'));
 await page.evaluate(()=>localStorage.setItem('knowledge-curator-import-journal-v1',JSON.stringify({
  attempts:'not json',progress:'{}'
 })));
 await page.reload();
 const after=await page.evaluate(()=>localStorage.getItem('knowledge-curator-attempts-v1'));
 expect(after).toBe(before);
 await expect(page.locator('#study-message')).toContainText('Impossible de lire la progression');
});

test('corrupt journal remains untouched after repeated reloads',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 const baseline=await page.evaluate(()=>localStorage.getItem('knowledge-curator-progress-v1'));
 const bad='{"progress":"not-json","attempts":"[]"}';
 await page.evaluate(value=>localStorage.setItem('knowledge-curator-import-journal-v1',value),bad);
 for(let i=0;i<3;i++){
  await page.reload();
  const state=await page.evaluate(()=>({
   journal:localStorage.getItem('knowledge-curator-import-journal-v1'),
   progress:localStorage.getItem('knowledge-curator-progress-v1')
  }));
  expect(state.journal).toBe(bad);
  expect(state.progress).toBe(baseline);
  await expect(page.locator('#study-message')).toContainText('Impossible de lire la progression');
 }
});

test('reset failure preserves history and reports cancellation',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 const first=page.locator('.study-step').first();
 await first.locator('form.exercise').first().locator('input').fill('999');
 await first.locator('form.exercise').first().locator('button[type=submit]').click();
 const before=await page.evaluate(()=>({
  attempts:localStorage.getItem('knowledge-curator-attempts-v1'),
  progress:localStorage.getItem('knowledge-curator-progress-v1')
 }));
 await page.evaluate(()=>{
  const original=Storage.prototype.setItem;
  window.__restoreSetItem=original;
  let failed=false;
  Storage.prototype.setItem=function(key,value){
   if(key==='knowledge-curator-progress-v1'&&!failed){failed=true;throw Error('simulated reset failure');}
   return original.call(this,key,value);
  };
  window.confirm=()=>true;
 });
 await page.locator('#progress-reset').click();
 await expect(page.locator('#study-message')).toContainText('Réinitialisation annulée');
 const after=await page.evaluate(()=>({
  attempts:localStorage.getItem('knowledge-curator-attempts-v1'),
  progress:localStorage.getItem('knowledge-curator-progress-v1')
 }));
 expect(after).toEqual(before);
 await page.evaluate(()=>{Storage.prototype.setItem=window.__restoreSetItem;});
 await page.reload();
 await expect(page.locator('#attempt-history')).toContainText('incorrect');
});

test('export rejects corrupt history without replacing it',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 await page.evaluate(()=>localStorage.setItem('knowledge-curator-attempts-v1','{broken'));
 await page.locator('#progress-export').click();
 await expect(page.locator('#study-message')).toContainText('Export impossible');
 expect(await page.evaluate(()=>localStorage.getItem('knowledge-curator-attempts-v1'))).toBe('{broken');
});
test('export refuses pending recovery journal',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 await page.evaluate(()=>localStorage.setItem('knowledge-curator-import-journal-v1','{broken'));
 await page.locator('#progress-export').click();
 await expect(page.locator('#study-message')).toContainText('Export impossible');
 expect(await page.evaluate(()=>localStorage.getItem('knowledge-curator-import-journal-v1'))).toBe('{broken');
});

test('export and reimport preserve attempts after reload',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 const first=page.locator('.study-step').first();
 await first.locator('form.exercise').first().locator('input').fill('999');
 await first.locator('form.exercise').first().locator('button[type=submit]').click();
 const original=await page.evaluate(()=>({
  progress:JSON.parse(localStorage.getItem('knowledge-curator-progress-v1')),
  attempts:JSON.parse(localStorage.getItem('knowledge-curator-attempts-v1'))
 }));
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#progress-export').click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toBe('knowledge-curator-progression.json');
 const fs=require('node:fs');
 const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
 expect(exported.version).toBe(2);
 expect(exported.attempts).toEqual(original.attempts);
 expect(exported.progress).toEqual(original.progress);
 await page.locator('#progress-reset').evaluate(button=>{window.confirm=()=>true;button.click();});
 await expect(page.locator('#attempt-history')).toContainText('Aucune tentative');
 await page.locator('#progress-import').setInputFiles({
  name:'restored.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))
 });
 await expect(page.locator('#study-message')).toContainText('Progression importée');
 await page.reload();
 const restored=await page.evaluate(()=>({
  progress:JSON.parse(localStorage.getItem('knowledge-curator-progress-v1')),
  attempts:JSON.parse(localStorage.getItem('knowledge-curator-attempts-v1'))
 }));
 expect(restored).toEqual(original);
});

test('V1 import refuses to overwrite progress with recent attempt history',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 const first=page.locator('.study-step').first();
 await first.locator('form.exercise').first().locator('input').fill('999');
 await first.locator('form.exercise').first().locator('button[type=submit]').click();
 const before=await page.evaluate(()=>({
  progress:localStorage.getItem('knowledge-curator-progress-v1'),
  attempts:localStorage.getItem('knowledge-curator-attempts-v1')
 }));
 const payload={version:1,progress:{}};
 await page.locator('#progress-import').setInputFiles({
  name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))
 });
 await expect(page.locator('#study-message')).toContainText('Import V1 refusé');
 const after=await page.evaluate(()=>({
  progress:localStorage.getItem('knowledge-curator-progress-v1'),
  attempts:localStorage.getItem('knowledge-curator-attempts-v1')
 }));
 expect(after).toEqual(before);
});

test('legacy V1 import on fresh storage remains compatible',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 const payload={version:1,progress:{arithmetic:{
  status:'in_progress',updatedAt:'2026-10-15T00:00:00.000Z'
 }}};
 await page.locator('#progress-import').setInputFiles({
  name:'legacy-fresh.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))
 });
 await expect(page.locator('#study-message')).toContainText('Progression importée');
 await page.reload();
 const result=await page.evaluate(()=>({
  progress:JSON.parse(localStorage.getItem('knowledge-curator-progress-v1')),
  attempts:localStorage.getItem('knowledge-curator-attempts-v1')
 }));
 expect(result.progress.arithmetic.status).toBe('in_progress');
 expect(result.attempts).toBeNull();
});

test('legacy V1 mastery is not accepted without recorded evidence',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 const payload={version:1,progress:{arithmetic:{
  status:'demonstrated',updatedAt:'2026-10-15T00:00:00.000Z'
 }}};
 await page.locator('#progress-import').setInputFiles({
  name:'legacy-mastery.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))
 });
 await expect(page.locator('#study-message')).toContainText('Progression importée');
 await page.reload();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('knowledge-curator-progress-v1')));
 expect(saved.arithmetic.status).toBe('in_progress');
 await expect(page.locator('.study-step').first().locator('.study-status')).not.toContainText('Maîtrise provisoirement démontrée');
});

test('legacy V1 mastery is archived without granting mastery',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 const payload={version:1,progress:{arithmetic:{
  status:'demonstrated',updatedAt:'2026-10-15T00:00:00.000Z'
 }}};
 await page.locator('#progress-import').setInputFiles({
  name:'legacy-archive.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))
 });
 await expect(page.locator('#study-message')).toContainText('Progression importée');
 const result=await page.evaluate(()=>({
  archive:JSON.parse(localStorage.getItem('knowledge-curator-legacy-v1-archive')),
  active:JSON.parse(localStorage.getItem('knowledge-curator-progress-v1'))
 }));
 expect(result.archive.progress.arithmetic.status).toBe('demonstrated');
 expect(result.active.arithmetic.status).toBe('in_progress');
});

test('legacy archive write failure prevents successful import',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 await page.evaluate(()=>{
  const original=Storage.prototype.setItem;
  window.__restoreSetItem=original;
  Storage.prototype.setItem=function(key,value){
   if(key==='knowledge-curator-legacy-v1-archive')throw Error('archive unavailable');
   return original.call(this,key,value);
  };
 });
 const payload={version:1,progress:{arithmetic:{
  status:'demonstrated',updatedAt:'2026-10-15T00:00:00.000Z'
 }}};
 await page.locator('#progress-import').setInputFiles({
  name:'archive-failure.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))
 });
 await expect(page.locator('#study-message')).toContainText('Import refusé');
 expect(await page.evaluate(()=>localStorage.getItem('knowledge-curator-import-journal-v1'))).toBeNull();
 await page.evaluate(()=>{Storage.prototype.setItem=window.__restoreSetItem;});
});

test('interrupted V1 import restores legacy archive and progress',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 const oldArchive=JSON.stringify({version:1,importedAt:'2026-10-15T00:00:00.000Z',progress:{}});
 const original=await page.evaluate(archive=>{
  localStorage.setItem('knowledge-curator-legacy-v1-archive',archive);
  return {progress:localStorage.getItem('knowledge-curator-progress-v1'),
   attempts:localStorage.getItem('knowledge-curator-attempts-v1'),
   archive:localStorage.getItem('knowledge-curator-legacy-v1-archive')};
 },oldArchive);
 await page.evaluate(snapshot=>{
  localStorage.setItem('knowledge-curator-import-journal-v1',JSON.stringify({
   progress:snapshot.progress,attempts:snapshot.attempts,legacyArchive:snapshot.archive
  }));
  localStorage.setItem('knowledge-curator-legacy-v1-archive',JSON.stringify({
   version:1,importedAt:'2026-10-16T00:00:00.000Z',progress:{}
  }));
  localStorage.setItem('knowledge-curator-progress-v1','{}');
 },original);
 await page.reload();
 const after=await page.evaluate(()=>({
  progress:localStorage.getItem('knowledge-curator-progress-v1'),
  attempts:localStorage.getItem('knowledge-curator-attempts-v1'),
  archive:localStorage.getItem('knowledge-curator-legacy-v1-archive'),
  journal:localStorage.getItem('knowledge-curator-import-journal-v1')
 }));
 expect(after.progress).toBe(original.progress);
 expect(after.attempts).toBe(original.attempts);
 expect(after.archive).toBe(original.archive);
 expect(after.journal).toBeNull();
});

test('recovery retry after a transient storage failure restores three keys',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 const before=await page.evaluate(()=>{
  const archive=JSON.stringify({version:1,importedAt:'2026-10-15T00:00:00.000Z',progress:{}});
  localStorage.setItem('knowledge-curator-legacy-v1-archive',archive);
  const snapshot={
   progress:localStorage.getItem('knowledge-curator-progress-v1'),
   attempts:localStorage.getItem('knowledge-curator-attempts-v1'),
   legacyArchive:archive
  };
  localStorage.setItem('knowledge-curator-import-journal-v1',JSON.stringify(snapshot));
  localStorage.setItem('knowledge-curator-progress-v1','{}');
  localStorage.setItem('knowledge-curator-legacy-v1-archive','{"version":1,"progress":{}}');
  return snapshot;
 });
 await page.addInitScript(()=>{
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
   if(key==='knowledge-curator-progress-v1')throw Error('transient recovery failure');
   return original.call(this,key,value);
  };
 });
 await page.reload();
 await expect(page.locator('#study-message')).toContainText('Impossible de lire la progression');
 expect(await page.evaluate(()=>localStorage.getItem('knowledge-curator-import-journal-v1'))).not.toBeNull();
 // New browser page simulates a restart with the transient failure removed.
 const next=await page.context().newPage();
 await next.goto('http://127.0.0.1:8770/');
 await expect(next.locator('#study-steps .study-step')).toHaveCount(7);
 const after=await next.evaluate(()=>({
  progress:localStorage.getItem('knowledge-curator-progress-v1'),
  attempts:localStorage.getItem('knowledge-curator-attempts-v1'),
  legacyArchive:localStorage.getItem('knowledge-curator-legacy-v1-archive'),
  journal:localStorage.getItem('knowledge-curator-import-journal-v1')
 }));
 expect(after.progress).toBe(before.progress);
 expect(after.attempts).toBe(before.attempts);
 expect(after.legacyArchive).toBe(before.legacyArchive);
 expect(after.journal).toBeNull();
 await next.close();
});

test('IndexedDB readwrite transactions preserve two concurrent updates',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 const result=await page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{
   const request=indexedDB.open('knowledge-curator-concurrency-test',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('state');
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  const update=(field,value)=>new Promise((resolve,reject)=>{
   const tx=db.transaction('state','readwrite');
   const store=tx.objectStore('state');
   const request=store.get('canonical');
   request.onsuccess=()=>{
    const previous=request.result||{attempts:[],progress:{}};
    if(field==='attempts')previous.attempts.push(value);
    else previous.progress.algebra=value;
    store.put(previous,'canonical');
   };
   tx.oncomplete=resolve;
   tx.onerror=()=>reject(tx.error);
   tx.onabort=()=>reject(tx.error);
  });
  await Promise.all([update('attempts',{correct:false}),update('progress','in_progress')]);
  const final=await new Promise((resolve,reject)=>{
   const tx=db.transaction('state','readonly');
   const request=tx.objectStore('state').get('canonical');
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  db.close();
  return final;
 });
 expect(result.attempts).toHaveLength(1);
 expect(result.progress.algebra).toBe('in_progress');
});

test('experimental IndexedDB adapter preserves concurrent updates',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB;
  const db=await adapter.open(indexedDB);
  await Promise.all([
   adapter.transact(db,state=>{
    state.attempts.push({skillId:'arithmetic',exerciseId:'ex-arithmetic',
     correct:false,timestamp:'2026-10-15T00:00:00.000Z'});
    return state;
   }),
   adapter.transact(db,state=>{
    state.progress.arithmetic={status:'in_progress',updatedAt:'2026-10-15T00:00:00.000Z'};
    return state;
   })
  ]);
  const final=await new Promise((resolve,reject)=>{
   const tx=db.transaction(adapter.STORE,'readonly');
   const request=tx.objectStore(adapter.STORE).get(adapter.KEY);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  db.close();
  return final;
 });
 expect(result.attempts).toHaveLength(1);
 expect(result.progress.arithmetic.status).toBe('in_progress');
});
test('experimental IndexedDB adapter aborts invalid state without committing',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB;
  const db=await adapter.open(indexedDB);
  let rejected=false;
  try{await adapter.transact(db,()=>({version:2,progress:{},attempts:[]}));}
  catch{rejected=true;}
  const value=await new Promise((resolve,reject)=>{
   const tx=db.transaction(adapter.STORE,'readonly');
   const request=tx.objectStore(adapter.STORE).get(adapter.KEY);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  db.close();
  return {rejected,unchanged:value===undefined};
 });
 expect(result.rejected).toBe(true);
 expect(result.unchanged).toBe(true);
});

test('IndexedDB migration preserves legacy storage and is idempotent',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const attemptsKey='knowledge-curator-attempts-v1';
  const progressKey='knowledge-curator-progress-v1';
  const initial={progress:localStorage.getItem(progressKey),attempts:localStorage.getItem(attemptsKey)};
  const adapter=window.KnowledgeIndexedDB;
  const db=await adapter.open(indexedDB);
  const first=await adapter.migrateFromLegacy(db,localStorage,window.KnowledgeStateV3);
  const second=await adapter.migrateFromLegacy(db,localStorage,window.KnowledgeStateV3);
  const persisted=await adapter.read(db);
  db.close();
  return {first,second,persisted,initial,after:{
   progress:localStorage.getItem(progressKey),attempts:localStorage.getItem(attemptsKey)
  }};
 });
 expect(result.first).toEqual(result.second);
 expect(result.first).toEqual(result.persisted);
 expect(result.after).toEqual(result.initial);
 expect(result.persisted.version).toBe(3);
});

test('invalid legacy data cannot create IndexedDB canonical state',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB;
  const db=await adapter.open(indexedDB);
  const store={
   getItem:key=>key==='knowledge-curator-progress-v1'?'{invalid':null
  };
  let rejected=false;
  try{await adapter.migrateFromLegacy(db,store,window.KnowledgeStateV3);}
  catch{rejected=true;}
  const current=await adapter.read(db);
  db.close();
  return {rejected,current};
 });
 expect(result.rejected).toBe(true);
 expect(result.current).toBeNull();
});

test('concurrent migrations preserve first committed canonical state',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB;
  const db=await adapter.open(indexedDB);
  const stamp='2026-10-15T00:00:00.000Z';
  const a={getItem:key=>key==='knowledge-curator-progress-v1'
   ?JSON.stringify({arithmetic:{status:'in_progress',updatedAt:stamp}}):null};
  const b={getItem:key=>key==='knowledge-curator-progress-v1'
   ?JSON.stringify({algebra:{status:'in_progress',updatedAt:stamp}}):null};
  const [first,second]=await Promise.all([
   adapter.migrateFromLegacy(db,a,window.KnowledgeStateV3),
   adapter.migrateFromLegacy(db,b,window.KnowledgeStateV3)
  ]);
  const stored=await adapter.read(db);
  db.close();
  return {first,second,stored};
 });
 expect(result.first).toEqual(result.second);
 expect(result.second).toEqual(result.stored);
 expect(Object.keys(result.stored.progress)).toHaveLength(1);
});

test('two real Chromium tabs converge on one IndexedDB migration',async({context})=>{
 const a=await context.newPage(),b=await context.newPage();
 await Promise.all([a.goto('http://127.0.0.1:8770/'),b.goto('http://127.0.0.1:8770/')]);
 for(const page of [a,b]){
  await page.addScriptTag({url:'/state-v3.cjs'});
  await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 }
 const run=(page,skill)=>page.evaluate(async skill=>{
  const db=await window.KnowledgeIndexedDB.open(indexedDB);
  const snapshot={getItem:key=>key==='knowledge-curator-progress-v1'
   ?JSON.stringify({[skill]:{status:'in_progress',updatedAt:'2026-10-15T00:00:00.000Z'}}):null};
  const value=await window.KnowledgeIndexedDB.migrateFromLegacy(db,snapshot,window.KnowledgeStateV3);
  db.close();
  return value;
 },skill);
 const [left,right]=await Promise.all([run(a,'arithmetic'),run(b,'algebra')]);
 expect(left).toEqual(right);
 const final=await a.evaluate(async()=>{
  const db=await window.KnowledgeIndexedDB.open(indexedDB);
  const state=await window.KnowledgeIndexedDB.read(db);
  db.close();return state;
 });
 expect(final).toEqual(left);
 expect(Object.keys(final.progress)).toHaveLength(1);
 await Promise.all([a.close(),b.close()]);
});

test('IndexedDB upgrade blocked by another connection is reported',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB;
  const db=await adapter.open(indexedDB);
  const upgrade=indexedDB.open(adapter.DB_NAME,2);
  const blocked=new Promise(resolve=>{
   upgrade.onblocked=()=>resolve(true);
   upgrade.onerror=()=>resolve(false);
  });
  const wasBlocked=await blocked;
  db.close();
  const upgraded=await new Promise((resolve,reject)=>{
   upgrade.onsuccess=()=>{upgrade.result.close();resolve(true);};
   upgrade.onerror=()=>reject(upgrade.error);
  });
  return {wasBlocked,upgraded};
 });
 expect(result.wasBlocked).toBe(true);
 expect(result.upgraded).toBe(true);
});

test('IndexedDB adapter aborts thrown callback without committing',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB;
  const db=await adapter.open(indexedDB);
  const before=await adapter.read(db);
  let message='';
  try{
   await adapter.transact(db,()=>{throw Error('intentional failure');});
  }catch(error){message=error.message;}
  const after=await adapter.read(db);
  db.close();
  return {message,before,after};
 });
 expect(result.message).toBe('intentional failure');
 expect(result.after).toEqual(result.before);
});
test('IndexedDB adapter aborts invalid data without replacing committed state',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB;
  const db=await adapter.open(indexedDB);
  const initial=await adapter.transact(db,state=>{
   state.progress.arithmetic={status:'in_progress',updatedAt:'2026-10-15T00:00:00.000Z'};
   return state;
  });
  let rejected=false;
  try{await adapter.transact(db,()=>({version:2,progress:{},attempts:[]}));}
  catch{rejected=true;}
  const after=await adapter.read(db);
  db.close();
  return {initial,after,rejected};
 });
 expect(result.rejected).toBe(true);
 expect(result.after).toEqual(result.initial);
});

test('IndexedDB adapter propagates simulated quota error without commit',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB;
  const db=await adapter.open(indexedDB);
  const before=await adapter.read(db);
  let name='';
  try{
   await adapter.transact(db,()=>{
    throw new DOMException('Simulated quota exhaustion','QuotaExceededError');
   });
  }catch(error){name=error.name;}
  const after=await adapter.read(db);
  db.close();
  return {name,before,after};
 });
 expect(result.name).toBe('QuotaExceededError');
 expect(result.after).toEqual(result.before);
});

test('IndexedDB migration refuses legacy state with pending recovery journal',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB;
  const db=await adapter.open(indexedDB);
  const store={getItem:key=>key==='knowledge-curator-import-journal-v1'
   ?'{"progress":null,"attempts":null}':null};
  let error='';
  try{await adapter.migrateFromLegacy(db,store,window.KnowledgeStateV3);}
  catch(e){error=e.message;}
  const saved=await adapter.read(db);
  db.close();
  return {error,saved};
 });
 expect(result.error).toBe('Legacy recovery pending');
 expect(result.saved).toBeNull();
});

test('IndexedDB rejects invalid attempt payload without commit',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB;
  const db=await adapter.open(indexedDB);
  const before=await adapter.read(db);
  let rejected=false;
  try{
   await adapter.transact(db,state=>{
    state.attempts.push({skillId:'arithmetic',exerciseId:'ex-arithmetic',
     correct:'yes',timestamp:'2026-10-15T00:00:00.000Z'});
    return state;
   });
  }catch{rejected=true;}
  const after=await adapter.read(db);
  db.close();
  return {before,after,rejected};
 });
 expect(result.rejected).toBe(true);
 expect(result.after).toEqual(result.before);
});

test('IndexedDB and V3 validator reject the same malformed archive',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const db=await window.KnowledgeIndexedDB.open(indexedDB);
  const invalid={version:3,progress:{},attempts:[],
   legacyArchive:JSON.stringify({version:1,importedAt:'invalid',progress:{}})};
  const schemaValid=window.KnowledgeStateV3.validate(invalid);
  let rejected=false;
  try{await window.KnowledgeIndexedDB.transact(db,()=>invalid);}
  catch{rejected=true;}
  const stored=await window.KnowledgeIndexedDB.read(db);
  db.close();
  return {schemaValid,rejected,stored};
 });
 expect(result.schemaValid).toBe(false);
 expect(result.rejected).toBe(true);
 expect(result.stored).toBeNull();
});


test('opt-in migration preview does not write and confirm preserves legacy',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB,db=await adapter.open(indexedDB);
  const key='knowledge-curator-progress-v1';
  const original=localStorage.getItem(key);
  const prepared=await adapter.prepareMigration(db,localStorage,window.KnowledgeStateV3);
  const before=await adapter.read(db);
  const committed=await adapter.confirmMigration(db,localStorage,window.KnowledgeStateV3,prepared);
  const after=await adapter.read(db);
  db.close();
  return {status:prepared.status,before,committed,after,original,legacy:localStorage.getItem(key)};
 });
 expect(result.status).toBe('ready');
 expect(result.before).toBeNull();
 expect(result.after).toEqual(result.committed);
 expect(result.legacy).toBe(result.original);
});
test('opt-in migration refuses changed legacy snapshot',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB,db=await adapter.open(indexedDB);
  const key='knowledge-curator-progress-v1';
  const original=localStorage.getItem(key);
  const prepared=await adapter.prepareMigration(db,localStorage,window.KnowledgeStateV3);
  localStorage.setItem(key,JSON.stringify({arithmetic:{status:'in_progress',updatedAt:'2026-10-15T00:00:00.000Z'}}));
  let error='';
  try{await adapter.confirmMigration(db,localStorage,window.KnowledgeStateV3,prepared);}
  catch(e){error=e.message;}
  const canonical=await adapter.read(db);
  if(original===null)localStorage.removeItem(key);else localStorage.setItem(key,original);
  db.close();
  return {error,canonical};
 });
 expect(result.error).toBe('Legacy data changed since preview');
 expect(result.canonical).toBeNull();
});

test('confirmed migration commits the exact previewed snapshot',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB;
  const db=await adapter.open(indexedDB);
  const stamp='2026-10-15T00:00:00.000Z';
  let reads=0;
  const legacy={getItem:key=>{
   if(key==='knowledge-curator-progress-v1'){
    reads++;
    return JSON.stringify({arithmetic:{status:'in_progress',updatedAt:stamp}});
   }
   return null;
  }};
  const prepared=await adapter.prepareMigration(db,legacy,window.KnowledgeStateV3);
  const approved=JSON.stringify(prepared.snapshot);
  const result=await adapter.confirmMigration(db,legacy,window.KnowledgeStateV3,prepared);
  const stored=await adapter.read(db);
  db.close();
  return {approved,result,stored,reads};
 });
 expect(JSON.stringify(result.result)).toBe(result.approved);
 expect(result.stored).toEqual(result.result);
 expect(result.reads).toBe(2);
});

test('cutover inspection detects legacy divergence without mutation',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await page.addScriptTag({url:'/state-v3.cjs'});
 await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
 const result=await page.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB;
  const db=await adapter.open(indexedDB);
  await adapter.migrateFromLegacy(db,localStorage,window.KnowledgeStateV3);
  const matching=await adapter.inspectCutover(db,localStorage,window.KnowledgeStateV3);
  const key='knowledge-curator-progress-v1';
  const original=localStorage.getItem(key);
  localStorage.setItem(key,JSON.stringify({arithmetic:{
   status:'in_progress',updatedAt:'2026-10-15T00:00:00.000Z'
  }}));
  const divergent=await adapter.inspectCutover(db,localStorage,window.KnowledgeStateV3);
  const canonical=await adapter.read(db);
  if(original===null)localStorage.removeItem(key);else localStorage.setItem(key,original);
  db.close();
  return {matching,divergent,canonical};
 });
 expect(result.matching).toEqual({ready:true,reason:'states-match'});
 expect(result.divergent).toEqual({ready:false,reason:'state-divergence'});
 expect(result.canonical.progress.arithmetic).toBeUndefined();
});

test('cutover gate detects legacy changes made by another active tab',async({context})=>{
 const first=await context.newPage(),second=await context.newPage();
 await Promise.all([first.goto('http://127.0.0.1:8770/'),second.goto('http://127.0.0.1:8770/')]);
 await first.addScriptTag({url:'/state-v3.cjs'});
 await first.addScriptTag({url:'/indexeddb-experimental.cjs'});
 await first.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB,db=await adapter.open(indexedDB);
  await adapter.migrateFromLegacy(db,localStorage,window.KnowledgeStateV3);
  db.close();
 });
 const before=await first.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB,db=await adapter.open(indexedDB);
  const result=await adapter.inspectCutover(db,localStorage,window.KnowledgeStateV3);
  db.close();return result;
 });
 await second.evaluate(()=>{
  localStorage.setItem('knowledge-curator-progress-v1',JSON.stringify({
   arithmetic:{status:'in_progress',updatedAt:'2026-10-15T00:00:00.000Z'}
  }));
 });
 const after=await first.evaluate(async()=>{
  const adapter=window.KnowledgeIndexedDB,db=await adapter.open(indexedDB);
  const result=await adapter.inspectCutover(db,localStorage,window.KnowledgeStateV3);
  db.close();return result;
 });
 expect(before.ready).toBe(true);
 expect(after).toEqual({ready:false,reason:'state-divergence'});
 await Promise.all([first.close(),second.close()]);
});

test('V2 import and reset preserve consistency after storage boundary integration',async({page})=>{
 await page.goto('http://127.0.0.1:8770/');
 await expect(page.locator('#study-steps .study-step')).toHaveCount(7);
 const first=page.locator('.study-step').first();
 await first.locator('form.exercise').first().locator('input').fill('999');
 await first.locator('form.exercise').first().locator('button[type=submit]').click();
 const snapshot=await page.evaluate(()=>({
  progress:JSON.parse(localStorage.getItem('knowledge-curator-progress-v1')),
  attempts:JSON.parse(localStorage.getItem('knowledge-curator-attempts-v1'))
 }));
 const payload={version:2,progress:snapshot.progress,attempts:snapshot.attempts};
 await page.locator('#progress-import').setInputFiles({
  name:'boundary-import.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))
 });
 await expect(page.locator('#study-message')).toContainText('Progression importée');
 await page.reload();
 const after=await page.evaluate(()=>({
  progress:JSON.parse(localStorage.getItem('knowledge-curator-progress-v1')),
  attempts:JSON.parse(localStorage.getItem('knowledge-curator-attempts-v1')),
  journal:localStorage.getItem('knowledge-curator-import-journal-v1')
 }));
 expect(after.progress).toEqual(snapshot.progress);
 expect(after.attempts).toEqual(snapshot.attempts);
 expect(after.journal).toBeNull();
});
