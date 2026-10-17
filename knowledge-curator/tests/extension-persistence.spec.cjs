'use strict';
const {test,expect,chromium}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
async function start(profile){
 const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:['--disable-extensions-except='+root,'--load-extension='+root]});
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:15000});
 const id=new URL(worker.url()).host;
 return {context,worker,id};
}
async function read(worker){return (await worker.evaluate(()=>chrome.storage.local.get('settings'))).settings||{};}
test('popup changes propagate to YouTube content script',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'mc-popup-'));let browser;
 try{
  browser=await start(profile);
  const {context,id,worker}=browser;
  const page=await context.newPage();
  await page.route('https://www.youtube.com/**',r=>r.fulfill({status:200,contentType:'text/html',body:'<html><body><ytd-video-renderer><a id="video-title" href="/watch?v=abcdefghijk">Funny cats compilation</a></ytd-video-renderer></body></html>'}));
  await page.goto('https://www.youtube.com/');
  const popup=await context.newPage();await popup.goto('chrome-extension://'+id+'/popup.html');
  await popup.locator('#enabled').check();
  await expect(page.locator('ytd-video-renderer')).toHaveClass(/math-curator-hidden/);
  await popup.locator('#enabled').uncheck();
  await expect(page.locator('ytd-video-renderer')).not.toHaveClass(/math-curator-hidden/);
  expect((await read(worker)).enabled).toBe(false);
 }finally{await browser?.context.close();fs.rmSync(profile,{recursive:true,force:true});}
});
test('options preferences persist across browser restart',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'mc-restart-'));let browser;
 try{
  browser=await start(profile);
  const url='chrome-extension://'+browser.id+'/options.html';
  const options=await browser.context.newPage();await options.goto(url);
  await options.locator('#allowChannels').fill('3Blue1Brown');
  await options.locator('#blockChannels').fill('Noise Channel');
  await options.locator('#saveRules').click();
  await expect.poll(async()=>(await read(browser.worker)).allowChannels?.[0]).toBe('3Blue1Brown');
  const domain=options.locator('#domains input[type=checkbox]').first();await domain.check();
  await expect.poll(async()=>(await read(browser.worker)).domains?.length).toBe(1);
  await browser.context.close();browser=null;
  browser=await start(profile);
  const saved=await read(browser.worker);
  expect(saved.allowChannels).toEqual(['3Blue1Brown']);
  expect(saved.blockChannels).toEqual(['Noise Channel']);
  expect(saved.domains?.length).toBe(1);
  const reopened=await browser.context.newPage();await reopened.goto('chrome-extension://'+browser.id+'/options.html');
  await expect(reopened.locator('#allowChannels')).toHaveValue('3Blue1Brown');
  await expect(reopened.locator('#domains input[type=checkbox]').first()).toBeChecked();
 }finally{await browser?.context.close();fs.rmSync(profile,{recursive:true,force:true});}
});
test('concurrent popup and options preserve independent settings changes',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'mc-race-'));let browser;
 try{
  browser=await start(profile);
  const popup=await browser.context.newPage(),options=await browser.context.newPage();
  await popup.goto('chrome-extension://'+browser.id+'/popup.html');
  await options.goto('chrome-extension://'+browser.id+'/options.html');
  await popup.locator('#enabled').check();
  await expect.poll(async()=>(await read(browser.worker)).enabled).toBe(true);
  await options.locator('#allowChannels').fill('3Blue1Brown');
  await options.locator('#saveRules').click();
  await expect.poll(async()=>(await read(browser.worker)).allowChannels?.[0]).toBe('3Blue1Brown');
  const result=await read(browser.worker);
  // Independent edits must both survive the serialized patch protocol.
  expect(result.enabled).toBe(true);
  expect(result.allowChannels).toEqual(['3Blue1Brown']);
 }finally{await browser?.context.close();fs.rmSync(profile,{recursive:true,force:true});}
});

test('simultaneous favorite saves preserve both entries',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'mc-favorites-'));let browser;
 try{
  browser=await start(profile);
  const worker=browser.worker;
  const sender=await browser.context.newPage();await sender.goto('chrome-extension://'+browser.id+'/options.html');
  const result=await sender.evaluate(async()=>{
   const videos=[{id:'abcdefghijk',title:'First'},{id:'bcdefghijkl',title:'Second'}];
   return Promise.all(videos.map(video=>chrome.runtime.sendMessage({type:'SAVE_VIDEO',video})));
  });
  expect(result.every(x=>x.ok)).toBe(true);
  const saved=(await read(worker)).saved;
  expect(Object.keys(saved).sort()).toEqual(['abcdefghijk','bcdefghijkl']);
 }finally{await browser?.context.close();fs.rmSync(profile,{recursive:true,force:true});}
});
test('favorite remove and add are serialized without losing unrelated entries',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'mc-favorite-race-'));let browser;
 try{
  browser=await start(profile);
  const worker=browser.worker;
  const sender=await browser.context.newPage();await sender.goto('chrome-extension://'+browser.id+'/options.html');
  await sender.evaluate(()=>chrome.runtime.sendMessage({type:'SAVE_VIDEO',video:{id:'abcdefghijk',title:'Old'}}));
  const replies=await sender.evaluate(()=>Promise.all([
   chrome.runtime.sendMessage({type:'REMOVE_FAVORITE',id:'abcdefghijk'}),
   chrome.runtime.sendMessage({type:'SAVE_VIDEO',video:{id:'bcdefghijkl',title:'New'}})
  ]));
  expect(replies.every(x=>x.ok)).toBe(true);
  const saved=(await read(worker)).saved;
  expect(saved.abcdefghijk).toBeUndefined();
  expect(saved.bcdefghijkl).toBeDefined();
 }finally{await browser?.context.close();fs.rmSync(profile,{recursive:true,force:true});}
});

test('two concurrent removals preserve unrelated favorites',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'mc-double-remove-'));let browser;
 try{
  browser=await start(profile);
  const page=await browser.context.newPage();await page.goto('chrome-extension://'+browser.id+'/options.html');
  const ids=['abcdefghijk','bcdefghijkl','cdefghijklm'];
  for(const id of ids)expect((await page.evaluate(video=>chrome.runtime.sendMessage({type:'SAVE_VIDEO',video}),{id,title:id})).ok).toBe(true);
  const replies=await page.evaluate(()=>Promise.all(['abcdefghijk','bcdefghijkl'].map(id=>chrome.runtime.sendMessage({type:'REMOVE_FAVORITE',id}))));
  expect(replies.every(r=>r.ok)).toBe(true);
  expect(Object.keys((await read(browser.worker)).saved||{})).toEqual(['cdefghijklm']);
 }finally{await browser?.context.close();fs.rmSync(profile,{recursive:true,force:true});}
});
test('confirmed favorite survives Chromium restart',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'mc-worker-restart-'));let browser;
 try{
  browser=await start(profile);
  const page=await browser.context.newPage();await page.goto('chrome-extension://'+browser.id+'/options.html');
  expect((await page.evaluate(()=>chrome.runtime.sendMessage({type:'SAVE_VIDEO',video:{id:'abcdefghijk',title:'Persisted'}}))).ok).toBe(true);
  // A confirmed write must survive a full Chromium restart with the same profile.
  // This is stronger for durability, but does not assert worker-only restart semantics.
  await browser.context.close();browser=null;
  browser=await start(profile);
  const saved=await read(browser.worker);
  expect(saved.saved?.abcdefghijk?.title).toBe('Persisted');
 }finally{await browser?.context.close();fs.rmSync(profile,{recursive:true,force:true});}
});

test('stale domain list patches must not erase independently selected domains',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'mc-domain-race-'));let browser;
 try{
  browser=await start(profile);
  const a=await browser.context.newPage(),b=await browser.context.newPage();
  await a.goto('chrome-extension://'+browser.id+'/options.html');
  await b.goto('chrome-extension://'+browser.id+'/options.html');
  await a.locator('#domains input[type=checkbox]').nth(0).check();
  await expect.poll(async()=>(await read(browser.worker)).domains?.length).toBe(1);
  await b.locator('#domains input[type=checkbox]').nth(1).check();
  await expect.poll(async()=>(await read(browser.worker)).domains?.length).toBe(2);
  const domains=(await read(browser.worker)).domains;
  expect(new Set(domains).size).toBe(2);
 }finally{await browser?.context.close();fs.rmSync(profile,{recursive:true,force:true});}
});
