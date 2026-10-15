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

test('MV3 reacts to SPA navigation and settings changes without reload',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'math-curator-spa-'));
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
   body:'<!doctype html><html><body><main id="feed"><ytd-video-renderer><a id="video-title" href="/watch?v=abcdefghijk">Gaming highlights</a></ytd-video-renderer></main></body></html>'
  }));
  await page.goto('https://www.youtube.com/',{waitUntil:'domcontentloaded'});
  await workers[0].evaluate(async()=>chrome.storage.local.set({
   settings:{enabled:true,mode:'balanced'}
  }));
  await expect(page.locator('ytd-video-renderer')).toHaveClass(/math-curator-hidden/);
  await page.evaluate(()=>{
   history.pushState({},'','/results?search_query=math');
   const feed=document.querySelector('#feed');
   feed.replaceChildren();
   const card=document.createElement('ytd-video-renderer');
   card.innerHTML='<a id="video-title" href="/watch?v=bcdefghijkl">Gaming compilation</a>';
   feed.append(card);
   window.dispatchEvent(new Event('yt-navigate-finish'));
  });
  await expect(page.locator('ytd-video-renderer')).toHaveClass(/math-curator-hidden/);
  await workers[0].evaluate(async()=>chrome.storage.local.set({
   settings:{enabled:true,mode:'balanced',allowVideos:['bcdefghijkl']}
  }));
  await expect(page.locator('ytd-video-renderer')).not.toHaveClass(/math-curator-hidden/);
  await workers[0].evaluate(async()=>chrome.storage.local.set({
   settings:{enabled:true,mode:'balanced',allowVideos:[]}
  }));
  await expect(page.locator('ytd-video-renderer')).toHaveClass(/math-curator-hidden/);
 }finally{
  if(context)await context.close();
  fs.rmSync(profile,{recursive:true,force:true});
 }
});

test('MV3 explicit video block wins over allowlist and Shorts exception',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'math-curator-priority-'));
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
   body:'<!doctype html><html><body><main><ytd-video-renderer><a id="video-title" href="/watch?v=abcdefghijk">Cours de mathématiques débutant</a></ytd-video-renderer><ytd-reel-item-renderer><a href="/shorts/bcdefghijkl">Short</a></ytd-reel-item-renderer></main></body></html>'
  }));
  await page.goto('https://www.youtube.com/',{waitUntil:'domcontentloaded'});
  await workers[0].evaluate(async()=>chrome.storage.local.set({settings:{
   enabled:true,mode:'balanced',hideShorts:true,
   allowVideos:['abcdefghijk','bcdefghijkl'],
   blockVideos:['abcdefghijk','bcdefghijkl']
  }}));
  await expect(page.locator('ytd-video-renderer')).toHaveClass(/math-curator-hidden/);
  await expect(page.locator('ytd-reel-item-renderer')).toHaveClass(/math-curator-hidden/);
  await workers[0].evaluate(async()=>chrome.storage.local.set({settings:{
   enabled:true,mode:'balanced',hideShorts:true,
   allowVideos:['abcdefghijk','bcdefghijkl'],blockVideos:[]
  }}));
  await expect(page.locator('ytd-video-renderer')).not.toHaveClass(/math-curator-hidden/);
  await expect(page.locator('ytd-reel-item-renderer')).not.toHaveClass(/math-curator-hidden/);
 }finally{
  if(context)await context.close();
  fs.rmSync(profile,{recursive:true,force:true});
 }
});

test('MV3 video-specific rules override channel rules and strict filtering',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'math-curator-rules-'));
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
   body:'<!doctype html><html><body><main><ytd-video-renderer><a id="video-title" href="/watch?v=abcdefghijk">Gaming compilation</a><ytd-channel-name><a>Example Channel</a></ytd-channel-name></ytd-video-renderer></main></body></html>'
  }));
  await page.goto('https://www.youtube.com/',{waitUntil:'domcontentloaded'});
  const card=page.locator('ytd-video-renderer');
  const set=async settings=>workers[0].evaluate(async value=>{
   await chrome.storage.local.set({settings:value});
  },settings);
  await set({enabled:true,mode:'strict',allowChannels:['Example Channel'],blockVideos:['abcdefghijk']});
  await expect(card).toHaveClass(/math-curator-hidden/);
  await set({enabled:true,mode:'strict',blockChannels:['Example Channel'],allowVideos:['abcdefghijk']});
  await expect(card).not.toHaveClass(/math-curator-hidden/);
  await set({enabled:true,mode:'strict',allowChannels:['Example Channel'],blockChannels:['Example Channel']});
  await expect(card).toHaveClass(/math-curator-hidden/);
  await set({enabled:true,mode:'strict',allowChannels:['Example Channel']});
  await expect(card).not.toHaveClass(/math-curator-hidden/);
  await set({enabled:true,mode:'strict'});
  await expect(card).toHaveClass(/math-curator-hidden/);
 }finally{
  if(context)await context.close();
  fs.rmSync(profile,{recursive:true,force:true});
 }
});

test('MV3 reevaluates reused video cards and handles missing metadata',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'math-curator-reused-'));
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
   body:'<!doctype html><html><body><main><ytd-video-renderer id="reused"><a id="video-title" href="/watch?v=abcdefghijk">Gaming highlights</a></ytd-video-renderer><ytd-video-renderer id="missing"></ytd-video-renderer></main></body></html>'
  }));
  await page.goto('https://www.youtube.com/',{waitUntil:'domcontentloaded'});
  await workers[0].evaluate(async()=>chrome.storage.local.set({settings:{
   enabled:true,mode:'balanced'
  }}));
  await expect(page.locator('#reused')).toHaveClass(/math-curator-hidden/);
  await expect(page.locator('#missing')).not.toHaveClass(/math-curator-hidden/);
  await page.evaluate(()=>{
   const card=document.querySelector('#reused');
   const link=card.querySelector('#video-title');
   link.textContent='Cours de mathématiques débutant : fractions et équations';
   link.setAttribute('href','/watch?v=bcdefghijkl');
  });
  await expect(page.locator('#reused')).not.toHaveClass(/math-curator-hidden/);
  await page.evaluate(()=>{
   const card=document.querySelector('#reused');
   const link=card.querySelector('#video-title');
   link.textContent='Gaming highlights';
   link.setAttribute('href','/watch?v=cdefghijklm');
  });
  await expect(page.locator('#reused')).toHaveClass(/math-curator-hidden/);
  await workers[0].evaluate(async()=>chrome.storage.local.set({settings:{
   enabled:true,mode:'strict'
  }}));
  await expect(page.locator('#missing')).toHaveClass(/math-curator-hidden/);
 }finally{
  if(context)await context.close();
  fs.rmSync(profile,{recursive:true,force:true});
 }
});

test('MV3 processes a large recommendation feed and dynamic batch',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'math-curator-load-'));
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
   body:'<!doctype html><html><body><main id="feed"></main></body></html>'
  }));
  await page.goto('https://www.youtube.com/',{waitUntil:'domcontentloaded'});
  await workers[0].evaluate(async()=>chrome.storage.local.set({
   settings:{enabled:true,mode:'balanced',hideShorts:true}
  }));
  const createBatch=async(start,count)=>page.evaluate(({start,count})=>{
   const fragment=document.createDocumentFragment();
   for(let i=start;i<start+count;i++){
    const card=document.createElement('ytd-video-renderer');
    const a=document.createElement('a');
    a.id='video-title';
    a.href='/watch?v='+String(i).padStart(11,'0');
    a.textContent=i%2===0?'Gaming highlights':'Cours de mathématiques débutant fractions';
    card.append(a);fragment.append(card);
   }
   document.querySelector('#feed').append(fragment);
  },{start,count});
  await createBatch(0,250);
  await expect.poll(()=>page.locator('ytd-video-renderer.math-curator-hidden').count(),{
   timeout:15000
  }).toBe(125);
  await createBatch(250,250);
  await expect.poll(()=>page.locator('ytd-video-renderer.math-curator-hidden').count(),{
   timeout:15000
  }).toBe(250);
  expect(await page.locator('ytd-video-renderer').count()).toBe(500);
  await workers[0].evaluate(async()=>chrome.storage.local.set({
   settings:{enabled:false}
  }));
  await expect.poll(()=>page.locator('ytd-video-renderer.math-curator-hidden').count(),{
   timeout:15000
  }).toBe(0);
 }finally{
  if(context)await context.close();
  fs.rmSync(profile,{recursive:true,force:true});
 }
});

test('MV3 badge mutations do not prevent filtering later inserted videos',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'math-curator-badges-'));
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
   body:'<!doctype html><html><body><main id="feed"><ytd-video-renderer><a id="video-title" href="/watch?v=abcdefghijk">Cours de mathématiques débutant fractions et équations</a></ytd-video-renderer></main></body></html>'
  }));
  await page.goto('https://www.youtube.com/',{waitUntil:'domcontentloaded'});
  await workers[0].evaluate(async()=>chrome.storage.local.set({settings:{
   enabled:true,mode:'balanced',showBadges:true
  }}));
  await expect(page.locator('.math-curator-badge')).toHaveCount(1);
  await page.evaluate(()=>{
   const card=document.createElement('ytd-video-renderer');
   card.innerHTML='<a id="video-title" href="/watch?v=bcdefghijkl">Gaming highlights</a>';
   document.querySelector('#feed').append(card);
  });
  await expect(page.locator('ytd-video-renderer.math-curator-hidden')).toHaveCount(1);
  await expect(page.locator('.math-curator-badge')).toHaveCount(1);
 }finally{
  if(context)await context.close();
  fs.rmSync(profile,{recursive:true,force:true});
 }
});

test('MV3 exposes scan counts and timing without content telemetry',async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'math-curator-metrics-'));
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
   body:'<!doctype html><html><body><main id="feed"></main></body></html>'
  }));
  await page.goto('https://www.youtube.com/',{waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(()=>Number(document.documentElement.dataset.mathCuratorScans||0))).toBeGreaterThan(0);
  const before=await page.evaluate(()=>Number(document.documentElement.dataset.mathCuratorScans||0));
  await page.evaluate(()=>{
   const fragment=document.createDocumentFragment();
   for(let i=0;i<100;i++){
    const card=document.createElement('ytd-video-renderer');
    card.innerHTML='<a id="video-title" href="/watch?v=abcdefghijk">Gaming highlights</a>';
    fragment.append(card);
   }
   document.querySelector('#feed').append(fragment);
  });
  await expect.poll(()=>page.evaluate(()=>window.__mathCuratorMetrics.scans)).toBeGreaterThan(before);
  const metrics=await page.evaluate(()=>{
   const d=document.documentElement.dataset;
   return {scans:Number(d.mathCuratorScans),lastMs:Number(d.mathCuratorLastMs),
    totalMs:Number(d.mathCuratorTotalMs),maxMs:Number(d.mathCuratorMaxMs)};
  });
  expect(metrics.totalMs).toBeGreaterThanOrEqual(0);
  expect(metrics.maxMs).toBeGreaterThanOrEqual(metrics.lastMs);
  expect(metrics.scans).toBeLessThan(12);
  expect(Object.keys(metrics).sort()).toEqual(['lastMs','maxMs','scans','totalMs']);
  console.log('Math Curator scan metrics',JSON.stringify(metrics));
 }finally{
  if(context)await context.close();
  fs.rmSync(profile,{recursive:true,force:true});
 }
});
