'use strict';
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=process.cwd(),out=path.join(root,'qa-evidence'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'mc-live-'));
fs.mkdirSync(out,{recursive:true});
const report={extensionSHA:'d762095dfbf9c6b716acf6a75d903a1b8f5e79f8',harnessSHA:process.env.GITHUB_SHA,tests:{},errors:[]};
let context,popup,options,worker,id,favoriteId;
const result=(key,status,detail)=>report.tests[key]={status,detail};
const settings=()=>worker.evaluate(async()=> (await chrome.storage.local.get('settings')).settings);
async function launch(){
 context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,chromiumSandbox:true,args:['--disable-extensions-except='+root,'--load-extension='+root]});
 context.on('console',m=>{if(m.type()==='error'){const loc=m.location();report.errors.push({kind:'console',source:loc.url?.startsWith('chrome-extension://')?'extension':'external-or-unattributed',message:m.text().slice(0,600),url:(loc.url||'').split('?')[0]});}});
 context.on('page',p=>p.on('pageerror',e=>report.errors.push({kind:'pageerror',source:String(e.stack).includes('chrome-extension://')?'extension':'external-or-unattributed',message:String(e.stack||e).slice(0,1200)})));
 worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:15000});
 id=new URL(worker.url()).host;
 popup=await context.newPage();await popup.goto('chrome-extension://'+id+'/popup.html');
 options=await context.newPage();await options.goto('chrome-extension://'+id+'/options.html');
}
(async()=>{
 try{
  await launch();
  report.chromium= context.browser().version();
  expect(await worker.evaluate(()=>chrome.runtime.getManifest().manifest_version)).toBe(3);
  result('A','PASS','Unpacked MV3 loaded; extension service worker available; Chromium sandbox requested.');
  await expect(popup.locator('#enabled')).toBeVisible();
  await expect(options.locator('#saveRules')).toBeVisible();
  await expect(options.locator('#domains input').first()).toBeVisible();
  await popup.locator('#level').selectOption('advanced');
  await expect.poll(async()=>(await settings()).level).toBe('advanced');
  await options.locator('#domains input').first().check();
  await expect.poll(async()=>(await settings()).domains.length).toBe(1);
  await options.locator('#domains input').first().uncheck();
  result('B','PASS','Popup and options loaded; level and domain preference saved through UI and checked in storage.');
  const page=await context.newPage();
  try{
   const response=await page.goto('https://www.youtube.com/',{waitUntil:'domcontentloaded',timeout:45000});
   report.youtubeHTTP=response?.status();
   if(!response?.ok())throw Object.assign(Error('YouTube HTTP '+response?.status()),{blocked:true});
   const protection=async()=>await page.locator('form[action*="consent"],iframe[src*="recaptcha"],#captcha-form,ytd-consent-bump-v2-lightbox').count()>0||/consent\.youtube|consent\.google|\/sorry\//.test(page.url());
   if(await protection())throw Object.assign(Error('Consent or CAPTCHA encountered; no interaction or bypass attempted'),{blocked:true});
   const selector='ytd-rich-grid-media,ytd-video-renderer,ytd-compact-video-renderer,ytd-grid-video-renderer';
   try{await page.locator(selector).first().waitFor({state:'visible',timeout:20000});}catch{throw Object.assign(Error('No usable recommendations on logged-out YouTube homepage within 20s'),{blocked:true});}
   if(await protection())throw Object.assign(Error('Consent or CAPTCHA encountered'),{blocked:true});
   await expect.poll(()=>page.evaluate(()=>Number(document.documentElement.dataset.mathCuratorScans||0)),{timeout:15000}).toBeGreaterThan(0);
   await popup.locator('#mode').selectOption('explore');
   await popup.locator('#level').selectOption('all');
   await popup.locator('#threshold').fill('0');await popup.locator('#threshold').dispatchEvent('input');
   await popup.locator('#hideShorts').uncheck();
   await popup.locator('#showBadges').check();
   await popup.locator('#enabled').check();
   await expect.poll(async()=>(await settings()).enabled).toBe(true);
   // Choose only an existing, visible card with a real video and channel.
   const cards=page.locator(selector);let card,channel;
   for(let n=0;n<Math.min(await cards.count(),30);n++){
    const candidate=cards.nth(n);
    if(!await candidate.isVisible())continue;
    const meta=await candidate.evaluate(el=>({href:el.querySelector('a[href*="watch?v="]')?.getAttribute('href'),channel:el.querySelector('ytd-channel-name a,#channel-name a,a.yt-simple-endpoint.yt-formatted-string[href^="/@"],#byline a')?.textContent?.trim()}));
    const vid=meta.href&&new URL(meta.href,'https://www.youtube.com').searchParams.get('v');
    if(vid&&/^[A-Za-z0-9_-]{11}$/.test(vid)&&meta.channel){card=candidate;channel=meta.channel;favoriteId=vid;break;}
   }
   if(!card)throw Object.assign(Error('No visible recommendation with channel metadata supported by extension'),{blocked:true});
   const handle=await card.elementHandle();
   await expect(card).toBeVisible();
   await page.screenshot({path:path.join(out,'before.png')});
   const badge=card.locator('.math-curator-badge').first();
   if(await badge.count()){
    await badge.click();await page.locator('.math-curator-dialog button').filter({hasText:/^Enregistrer$/}).click();
    await expect.poll(async()=>Boolean((await settings()).saved?.[favoriteId])).toBe(true);
    report.favoriteAddedThroughUI=true;
    await page.locator('.math-curator-dialog button').filter({hasText:/^Fermer$/}).click();
   }else{favoriteId=undefined;report.favoriteLimitation='No available save badge on selected real recommendation';}
   // Use a supported channel rule from the options UI; no DOM insertion or network mocking.
   await options.reload();
   await options.locator('#blockChannels').fill(channel);
   await options.locator('#saveRules').click();
   await expect(options.locator('#status')).toHaveText('Préférences enregistrées');
   await expect(card).toHaveClass(/math-curator-hidden/,{timeout:15000});
   expect(await handle.evaluate(el=>el.isConnected&&getComputedStyle(el).display==='none')).toBe(true);
   await page.screenshot({path:path.join(out,'hidden.png')});
   result('C','PASS','Existing visible real recommendation hidden by saved channel rule; same DOM element connected, extension class and computed display:none asserted.');
   await popup.locator('#enabled').uncheck();
   await expect.poll(()=>handle.evaluate(el=>el.isConnected&&!el.classList.contains('math-curator-hidden')&&getComputedStyle(el).display!=='none'),{timeout:15000}).toBe(true);
   await expect(card).toBeVisible();
   await page.screenshot({path:path.join(out,'restored.png')});
   result('D','PASS','Same real recommendation reappeared after disabling filtering through popup.');
  }catch(e){
   const status=e.blocked||/net::|Navigation timeout/.test(e.message)?'BLOCKED':'FAIL';
   if(!report.tests.C)result('C',status,e.message);
   if(!report.tests.D)result('D','BLOCKED','Filtering/reversibility prerequisite unavailable');
   if(!page.isClosed())await page.screenshot({path:path.join(out,'youtube-end.png')}).catch(()=>{});
  }
  await popup.locator('#level').selectOption('advanced');
  await expect.poll(async()=>(await settings()).level).toBe('advanced');
  const before=await settings();
  await context.close();context=null;
  await launch();
  const after=await settings();
  expect(after).toEqual(before);
  await expect(popup.locator('#level')).toHaveValue('advanced');
  if(favoriteId){expect(after.saved[favoriteId]).toBeTruthy();await expect(options.locator('#saved a[href="https://www.youtube.com/watch?v='+favoriteId+'"]')).toBeVisible();}
  result('E',favoriteId?'PASS':'BLOCKED',favoriteId?'All stored preferences and UI-added real-video favorite persisted after full browser close/relaunch with same profile.':'Preferences persisted and complete settings snapshot matched after full browser restart; real-video favorite path unavailable.');
  await popup.screenshot({path:path.join(out,'popup-after-restart.png')});
  await options.screenshot({path:path.join(out,'options-after-restart.png')});
  const extensionErrors=report.errors.filter(e=>e.source==='extension');
  result('F',extensionErrors.length?'FAIL':'PASS',extensionErrors.length?'Extension-attributed errors captured; inspect report':'No extension-attributed error observed via context console/pageerror monitoring. Does not prove absence of unreported worker startup errors.');
 }catch(e){report.fatal={message:e.message,stack:String(e.stack).slice(0,2000)};}
 finally{
  if(context)await context.close().catch(()=>{});
  for(const key of ['A','B','C','D','E','F'])if(!report.tests[key])result(key,'BLOCKED','Earlier prerequisite failed; see fatal error');
  report.verdict=Object.values(report.tests).some(t=>t.status==='FAIL')?'NO-GO':Object.values(report.tests).some(t=>t.status==='BLOCKED')?'INDETERMINE':'GO';
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Math Curator real YouTube QA\n\nExtension SHA: '+report.extensionSHA+'\n\nHarness SHA: '+report.harnessSHA+'\n\n'+Object.entries(report.tests).map(([k,v])=>'- '+k+': **'+v.status+'** — '+v.detail).join('\n')+'\n\nVerdict: **'+report.verdict+'**\n');
  fs.rmSync(profile,{recursive:true,force:true});
  if(report.verdict!=='GO')process.exitCode=1;
 }
})();
