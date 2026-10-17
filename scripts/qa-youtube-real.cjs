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
  await popup.locator('#mode').selectOption('explore');
  await expect.poll(async()=>(await read()).mode).toBe('explore');
  await popup.locator('#level').selectOption('all');
  await expect.poll(async()=>(await read()).level).toBe('all');
  await popup.locator('#showBadges').check();
  await popup.locator('#hideShorts').uncheck();
  await popup.locator('#enabled').check();
  await expect.poll(async()=>{const s=await read();return s.enabled&&s.showBadges&&s.mode==='explore';}).toBe(true);
  report.settings=await read();
  page=await context.newPage();
  const response=await page.goto(report.url,{waitUntil:'domcontentloaded',timeout:45000});
  report.http=response?.status();await guard();
  if(!response?.ok())throw blocked('YouTube HTTP '+response?.status());
  try{await page.locator('ytd-video-renderer').first().waitFor({state:'attached',timeout:30000});}catch{await guard();throw blocked('No real video result within 30 seconds');}
  await expect.poll(()=>page.evaluate(()=>Number(document.documentElement.dataset.mathCuratorScans||0)),{timeout:15000}).toBeGreaterThan(0);
  // Select after filtering: a visible real video carrying a visible badge.
  try{
   await expect.poll(async()=>{
    const cards=page.locator('ytd-video-renderer');
    for(let i=0;i<Math.min(await cards.count(),30);i++){
     const c=cards.nth(i);
     if(!await c.isVisible()||!await c.locator('.math-curator-badge').first().isVisible())continue;
     const data=await c.evaluate(el=>{
      const a=el.querySelector('a#video-title-link,a#video-title,a[href*="watch?v="]');
      const title=el.querySelector('#video-title,#video-title-link,h3 yt-formatted-string,a[title]')?.textContent?.trim()||a?.getAttribute('title')||'';
      const channel=el.querySelector('ytd-channel-name a,#channel-name a,a.yt-simple-endpoint.yt-formatted-string[href^="/@"],#byline a')?.textContent?.trim()||'';
      return {href:a?.getAttribute('href'),title,channel};
     });
     const vid=data.href&&new URL(data.href,'https://www.youtube.com').searchParams.get('v');
     if(vid&&/^[A-Za-z0-9_-]{11}$/.test(vid)&&data.title){card=c;video={id:vid,title:data.title,channel:data.channel};return true;}
    }return false;
   },{timeout:15000}).toBe(true);
  }catch{
   await guard();
   report.settings=await read();
   report.domDiagnostic=await page.locator('ytd-video-renderer').evaluateAll(cards=>cards.slice(0,20).map(el=>{
    const badge=el.querySelector('.math-curator-badge');
    const chain=[];for(let p=badge;p&&p!==el.parentElement;p=p.parentElement){const s=getComputedStyle(p);chain.push({tag:p.tagName,id:p.id,display:s.display,visibility:s.visibility,rects:p.getClientRects().length});}
    return {title:el.querySelector('#video-title')?.textContent?.trim(),hiddenClass:el.classList.contains('math-curator-hidden'),display:getComputedStyle(el).display,badgeExists:!!badge,badgeAncestors:chain,placement:el.querySelector('#details,#meta,#metadata,#text')?.outerHTML.slice(0,900)};
   }));
   throw blocked('No visible interactive badge on a visible real video after filtering; see settings and DOM diagnostics');
  }
  report.video=video;await expect(card).toBeVisible();
  const badge=card.locator('.math-curator-badge').first();
  await expect(badge).toBeVisible();await expect(badge).toBeEnabled();
  mark('1_badge','PASS','Visible enabled badge on visible real video with title and valid ID.');
  await page.screenshot({path:path.join(out,'favorite-badge.png')});
  await badge.click();
  const dialog=page.locator('.math-curator-dialog');
  await expect(dialog).toBeVisible();await expect(dialog.locator('h2')).toHaveText(video.title);
  mark('2_dialog','PASS','Details dialog opened through badge click and identifies selected video.');
  await dialog.getByRole('button',{name:'Enregistrer',exact:true}).click();
  await expect(dialog.getByRole('button',{name:'Enregistrée',exact:true})).toBeVisible();
  mark('3_acknowledgement','PASS','Existing save button acknowledged success.');
  await expect.poll(async()=>Boolean((await read()).saved?.[video.id])).toBe(true);
  const saved=(await read()).saved[video.id];
  expect(saved).toMatchObject({id:video.id,title:video.title.slice(0,300),channel:video.channel.slice(0,120),url:'https://www.youtube.com/watch?v='+video.id});
  expect(saved.savedAt).toBeGreaterThan(0);report.savedBeforeRestart=saved;
  mark('4_storage','PASS','chrome.storage.local.settings.saved[id] contains matching ID, title, channel, URL and timestamp.');
  await page.screenshot({path:path.join(out,'favorite-saved.png')});
  await context.close();context=null;await launch();
  expect((await read()).saved[video.id]).toEqual(saved);
  await expect(options.locator('#saved a[href="https://www.youtube.com/watch?v='+video.id+'"]')).toHaveText(saved.title);
  await expect(options.locator('#saved a[href="https://www.youtube.com/watch?v='+video.id+'"]')).toBeVisible();
  mark('5_restart','PASS','Identical favorite record persisted after complete Chromium shutdown/relaunch; visible in options UI.');
  await options.screenshot({path:path.join(out,'favorite-after-restart.png')});
 }catch(e){
  report.error=e.message;
  const status=e.blocked||/net::/.test(e.message)?'BLOCKED':'FAIL';
  const keys=['1_badge','2_dialog','3_acknowledgement','4_storage','5_restart'];
  const next=keys.find(k=>!report.tests[k]);if(next)mark(next,status,e.message);
 }finally{
  if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'youtube-final.png')}).catch(()=>{});
  if(context)await context.close().catch(()=>{});
  for(const k of ['1_badge','2_dialog','3_acknowledgement','4_storage','5_restart'])if(!report.tests[k])mark(k,'BLOCKED','Prerequisite not completed');
  report.verdict=Object.values(report.tests).some(x=>x.status==='FAIL')?'NO-GO':Object.values(report.tests).every(x=>x.status==='PASS')?'GO':'INDETERMINE';
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Final live favorite acceptance\n\nExtension SHA: '+report.extensionSHA+'\n\nQA SHA: '+report.harnessSHA+'\n\n'+Object.entries(report.tests).map(([k,v])=>'- '+k+': **'+v.status+'** — '+v.detail).join('\n')+'\n\nVerdict: **'+report.verdict+'**\n');
  fs.rmSync(profile,{recursive:true,force:true});if(report.verdict!=='GO')process.exitCode=1;
 }
})();
