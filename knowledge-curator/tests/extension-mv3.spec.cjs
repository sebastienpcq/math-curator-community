'use strict';
const {test,expect,chromium}=require('@playwright/test');
const path=require('node:path');
const fs=require('node:fs');
const os=require('node:os');
const root=path.resolve(__dirname,'../..');
test('MV3 extension loads and filters a controlled YouTube fixture',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'math-curator-mv3-'));
 let context;
 try{
  context=await chromium.launchPersistentContext(profile,{
   channel:'chromium',headless:true,
   args:['--disable-extensions-except='+root,'--load-extension='+root]
  });
  let workers=context.serviceWorkers();
  if(!workers.length)workers=[await context.waitForEvent('serviceworker',{timeout:15000})];
  expect(workers[0].url()).toMatch(/^chrome-extension:\/\/[a-p]{32}\//);
  const page=await context.newPage();
  await page.route('https://www.youtube.com/**',route=>route.fulfill({
   status:200,contentType:'text/html',
   body:'<!doctype html><html><body><ytd-video-renderer><a id="video-title" href="/watch?v=abcdefghijk">Funny cats compilation</a></ytd-video-renderer></body></html>'
  }));
  await page.goto('https://www.youtube.com/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('ytd-video-renderer')).toHaveCount(1);
  // Extension is disabled by default; this verifies opt-in behavior.
  await expect(page.locator('ytd-video-renderer')).not.toHaveClass(/math-curator-hidden/);
  await workers[0].evaluate(async()=>{
   await chrome.storage.local.set({settings:{enabled:true,mode:'balanced'}});
  });
  await expect(page.locator('ytd-video-renderer')).toHaveClass(/math-curator-hidden/,{timeout:10000});
  await workers[0].evaluate(async()=>{
   await chrome.storage.local.set({settings:{enabled:false}});
  });
  await expect(page.locator('ytd-video-renderer')).not.toHaveClass(/math-curator-hidden/,{timeout:10000});
 }finally{
  if(context)await context.close();
  fs.rmSync(profile,{recursive:true,force:true});
 }
});

test('MV3 hides Shorts and rescans dynamically inserted recommendations',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'math-curator-dynamic-'));
 let context;
 try{
  context=await chromium.launchPersistentContext(profile,{
   channel:'chromium',headless:true,
   args:['--disable-extensions-except='+root,'--load-extension='+root]
  });
  let workers=context.serviceWorkers();
  if(!workers.length)workers=[await context.waitForEvent('serviceworker',{timeout:15000})];
  const page=await context.newPage();
  await page.route('https://www.youtube.com/**',route=>route.fulfill({
   status:200,contentType:'text/html',
   body:'<!doctype html><html><body><main id="feed"><ytd-reel-item-renderer><a href="/shorts/abcdefghijk">Short</a></ytd-reel-item-renderer></main></body></html>'
  }));
  await page.goto('https://www.youtube.com/',{waitUntil:'domcontentloaded'});
  await workers[0].evaluate(async()=>chrome.storage.local.set({
   settings:{enabled:true,mode:'balanced',hideShorts:true}
  }));
  await expect(page.locator('ytd-reel-item-renderer')).toHaveClass(/math-curator-hidden/);
  await page.evaluate(()=>{
   const card=document.createElement('ytd-video-renderer');
   card.innerHTML='<a id="video-title" href="/watch?v=bcdefghijkl">Unrelated gaming highlights</a>';
   document.querySelector('#feed').append(card);
  });
  await expect(page.locator('ytd-video-renderer')).toHaveClass(/math-curator-hidden/);
  await workers[0].evaluate(async()=>chrome.storage.local.set({
   settings:{enabled:false,hideShorts:true}
  }));
  await expect(page.locator('ytd-reel-item-renderer')).not.toHaveClass(/math-curator-hidden/);
  await expect(page.locator('ytd-video-renderer')).not.toHaveClass(/math-curator-hidden/);
 }finally{
  if(context)await context.close();
  fs.rmSync(profile,{recursive:true,force:true});
 }
});
