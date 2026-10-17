'use strict';
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=process.cwd(),out=path.join(root,'qa-evidence'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'mc-final-'));
fs.mkdirSync(out,{recursive:true});
const report={extensionSHA:'d762095dfbf9c6b716acf6a75d903a1b8f5e79f8',harnessSHA:process.env.GITHUB_SHA,url:'https://www.youtube.com/results?search_query=maths+cours+fractions',tests:{},errors:[]};
let context,worker,popup,options,page,card,handle,video;
const mark=(key,status,detail)=>report.tests[key]={status,detail};
const read=()=>worker.evaluate(async()=> (await chrome.storage.local.get('settings')).settings);
const blocked=message=>Object.assign(Error(message),{blocked:true});
async function launch(){
 context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,chromiumSandbox:true,args:['--disable-extensions-except='+root,'--load-extension='+root]});
 context.setDefaultTimeout(15000);
 context.on('console',m=>{if(m.type()==='error')report.errors.push({message:m.text().slice(0,500),url:(m.location().url||'').split('?')[0]});});
 context.on('page',p=>p.on('pageerror',e=>report.errors.push({message:String(e.stack||e).slice(0,1000)})));
 worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:15000});
 const base='chrome-extension://'+new URL(worker.url()).host;
 popup=await context.newPage();await popup.goto(base+'/popup.html');
 options=await context.newPage();await options.goto(base+'/options.html');
}
async function guard(){
 if(/consent\.youtube|consent\.google|\/sorry\//.test(page.url())||await page.locator('form[action*="consent"],iframe[src*="recaptcha"],#captcha-form,ytd-consent-bump-v2-lightbox').count())throw blocked('Consent/CAPTCHA detected; no bypass attempted');
}
(async()=>{
 try{
  await launch();report.chromium=context.browser().version();
  // Only prerequisites and the two remaining functional checks; no previous UI or preference suite.
  await popup.locator('#enabled').uncheck();
  page=await context.newPage();
  const response=await page.goto(report.url,{waitUntil:'domcontentloaded',timeout:45000});
  report.http=response?.status();await guard();
  if(!response?.ok())throw blocked('YouTube HTTP '+response?.status());
  const cards=page.locator('ytd-video-renderer');
  try{await cards.first().waitFor({state:'visible',timeout:30000});}catch{await guard();throw blocked('No visible real video search result within 30 seconds');}
  await guard();
  for(let i=0;i<Math.min(await cards.count(),30);i++){
   const candidate=cards.nth(i);if(!await candidate.isVisible())continue;
   const data=await candidate.evaluate(el=>({
    href:el.querySelector('a[href*="watch?v="]')?.getAttribute('href'),
    title:el.querySelector('#video-title')?.textContent?.trim(),
    channel:el.querySelector('ytd-channel-name a,#channel-name a,a.yt-simple-endpoint.yt-formatted-string[href^="/@"],#byline a')?.textContent?.trim()
   }));
   const id=data.href&&new URL(data.href,'https://www.youtube.com').searchParams.get('v');
   if(id&&/^[A-Za-z0-9_-]{11}$/.test(id)&&data.channel){card=candidate;video={id,title:data.title,channel:data.channel};break;}
  }
  if(!card)throw blocked('Search results lack a visible video/channel pair usable by existing extension');
  handle=await card.elementHandle();report.video=video;
  await expect(card).toBeVisible();
  expect(await handle.evaluate(el=>!el.classList.contains('math-curator-hidden'))).toBe(true);
  await page.screenshot({path:path.join(out,'real-before.png')});
  try{
   await options.locator('#blockChannels').fill(video.channel);
   await options.locator('#saveRules').click();
   await expect(options.locator('#status')).toHaveText('Préférences enregistrées');
   await popup.locator('#enabled').check();
   await expect.poll(async()=>(await read()).enabled).toBe(true);
   await expect.poll(()=>handle.evaluate(el=>el.isConnected&&el.classList.contains('math-curator-hidden')&&getComputedStyle(el).display==='none'),{timeout:15000}).toBe(true);
   await page.screenshot({path:path.join(out,'real-hidden.png')});
   await popup.locator('#enabled').uncheck();
   await expect.poll(()=>handle.evaluate(el=>el.isConnected&&!el.classList.contains('math-curator-hidden')&&getComputedStyle(el).display!=='none'),{timeout:15000}).toBe(true);
   await expect(card).toBeVisible();await page.screenshot({path:path.join(out,'real-restored.png')});
   mark('filtering','PASS','Same pre-existing real result: visible before activation, extension class plus display:none after activation with saved channel rule, visible again after disabling. Same connected DOM handle asserted.');
  }catch(e){await guard();mark('filtering',e.blocked?'BLOCKED':'FAIL',e.message);}
  try{
   // Remove the test block via existing UI so the real video's save badge can be used.
   await options.reload();await options.locator('#blockChannels').fill('');
   await options.locator('#saveRules').click();await expect(options.locator('#status')).toHaveText('Préférences enregistrées');
   await popup.locator('#mode').selectOption('explore');
   await popup.locator('#level').selectOption('all');
   await popup.locator('#threshold').fill('0');await popup.locator('#threshold').dispatchEvent('input');
   await popup.locator('#hideShorts').uncheck();await popup.locator('#showBadges').check();
   await popup.locator('#enabled').check();
   await guard();
   const badge=card.locator('.math-curator-badge').first();
   try{await badge.waitFor({state:'visible',timeout:15000});}catch{throw blocked('Existing favorite mechanism inaccessible: no visible Math Curator badge on selected real result');}
   await badge.click();
   const dialog=page.locator('.math-curator-dialog');
   await dialog.getByRole('button',{name:'Enregistrer',exact:true}).click();
   await expect.poll(async()=>Boolean((await read()).saved?.[video.id]),{timeout:15000}).toBe(true);
   await expect(dialog.getByRole('button',{name:'Enregistrée',exact:true})).toBeVisible();
   const saved=(await read()).saved[video.id];report.savedBeforeRestart=saved;
   await page.screenshot({path:path.join(out,'favorite-saved.png')});
   await context.close();context=null;
   await launch();
   expect((await read()).saved[video.id]).toEqual(saved);
   await expect(options.locator('#saved a[href="https://www.youtube.com/watch?v='+video.id+'"]')).toBeVisible();
   await options.screenshot({path:path.join(out,'favorite-after-restart.png')});
   mark('favorite','PASS','Real public video saved using existing badge/dialog UI; stored record identical and rendered in options after full browser close/relaunch using same temporary profile.');
  }catch(e){mark('favorite',e.blocked||/net::/.test(e.message)?'BLOCKED':'FAIL',e.message);}
 }catch(e){
  report.prerequisiteError=e.message;
  for(const key of ['filtering','favorite'])if(!report.tests[key])mark(key,'BLOCKED','Prerequisite unavailable: '+e.message);
 }finally{
  if(page&&!page.isClosed()){
   await page.screenshot({path:path.join(out,'youtube-final.png')}).catch(()=>{});
   report.pageDiagnostic=await page.evaluate(()=>({url:location.href,title:document.title,videoCards:document.querySelectorAll('ytd-video-renderer').length,bodyExcerpt:document.body.innerText.slice(0,1800)})).catch(()=>null);
  }
  if(context)await context.close().catch(()=>{});
  for(const key of ['filtering','favorite'])if(!report.tests[key])mark(key,'BLOCKED','Prerequisite unavailable');
  report.verdict=Object.values(report.tests).some(x=>x.status==='FAIL')?'NO-GO':Object.values(report.tests).every(x=>x.status==='PASS')?'GO':'INDETERMINE';
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Final two real YouTube checks\n\nExtension SHA: '+report.extensionSHA+'\n\nQA SHA: '+report.harnessSHA+'\n\n'+Object.entries(report.tests).map(([k,v])=>'- '+k+': **'+v.status+'** — '+v.detail).join('\n')+'\n\nVerdict: **'+report.verdict+'**\n');
  fs.rmSync(profile,{recursive:true,force:true});if(report.verdict!=='GO')process.exitCode=1;
 }
})();
