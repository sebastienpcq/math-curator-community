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
