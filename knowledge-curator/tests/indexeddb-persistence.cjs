'use strict';
const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'math-curator-profile-'));
 try {
  let context=await chromium.launchPersistentContext(dir,{headless:true});
  let page=context.pages()[0]||await context.newPage();
  await page.goto('http://127.0.0.1:8770/');
  await page.addScriptTag({url:'/state-v3.cjs'});
  await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
  const expected=await page.evaluate(async()=>{
   const db=await window.KnowledgeIndexedDB.open(indexedDB);
   const record=await window.KnowledgeIndexedDB.transact(db,state=>{
    state.progress.arithmetic={status:'in_progress',updatedAt:'2026-10-15T00:00:00.000Z'};
    return state;
   });
   db.close();
   return record;
  });
  await context.close();
  context=await chromium.launchPersistentContext(dir,{headless:true});
  page=context.pages()[0]||await context.newPage();
  await page.goto('http://127.0.0.1:8770/');
  await page.addScriptTag({url:'/state-v3.cjs'});
  await page.addScriptTag({url:'/indexeddb-experimental.cjs'});
  const actual=await page.evaluate(async()=>{
   const db=await window.KnowledgeIndexedDB.open(indexedDB);
   const record=await window.KnowledgeIndexedDB.read(db);
   db.close();return record;
  });
  if(JSON.stringify(actual)!==JSON.stringify(expected))
   throw Error('IndexedDB state changed after browser restart');
  await context.close();
  console.log('PASS: IndexedDB survives Chromium persistent-profile restart');
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
