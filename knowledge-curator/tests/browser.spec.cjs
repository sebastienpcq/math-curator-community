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
