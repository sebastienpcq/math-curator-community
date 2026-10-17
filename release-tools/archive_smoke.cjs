const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve('release-candidate/extracted'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'mc-package-'));
(async()=>{let c;try{
c=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,chromiumSandbox:true,args:['--disable-extensions-except='+root,'--load-extension='+root]});
const w=c.serviceWorkers()[0]||await c.waitForEvent('serviceworker',{timeout:15000});
const base='chrome-extension://'+new URL(w.url()).host;
expect(await w.evaluate(()=>chrome.runtime.getManifest().version)).toBe('1.0.1');
const errors=[];c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
const popup=await c.newPage();await popup.goto(base+'/popup.html');await expect(popup.locator('#enabled')).toBeVisible();
const options=await c.newPage();await options.goto(base+'/options.html');await expect(options.locator('#domains input').first()).toBeVisible();await expect(options.locator('#saveRules')).toBeVisible();
await expect(popup.locator('#status')).toContainText('Désactivé');
await popup.locator('#level').selectOption('advanced');
await expect.poll(()=>w.evaluate(async()=>(await chrome.storage.local.get('settings')).settings?.level)).toBe('advanced');
expect(errors).toEqual([]);
const report={status:'PASS',chromium:c.browser().version(),source:'d762095dfbf9c6b716acf6a75d903a1b8f5e79f8',candidateSHA:process.env.GITHUB_SHA,assertions:['extracted ZIP MV3 service worker available','popup usable','options usable','UI preference stored','no observed interface pageerror'],sha256:JSON.parse(fs.readFileSync('release-candidate/package-manifest.json')).sha256};
fs.writeFileSync('release-candidate/archive-smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(c)await c.close();fs.rmSync(profile,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});

