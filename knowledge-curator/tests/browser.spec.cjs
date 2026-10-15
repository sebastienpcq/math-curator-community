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
 await expect(page.locator('#study-message')).toContainText('Import refusé');
 const after=await page.evaluate(()=>({
  attempts:localStorage.getItem('knowledge-curator-attempts-v1'),
  progress:localStorage.getItem('knowledge-curator-progress-v1')
 }));
 expect(after).toEqual(before);
 await page.evaluate(()=>{Storage.prototype.setItem=window.__restoreSetItem;});
 await page.reload();
 await expect(page.locator('#attempt-history')).toContainText('incorrect');
});
