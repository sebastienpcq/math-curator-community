importScripts('config.js');
let settingsQueue=Promise.resolve();
function updateSettings(patch){
 const task=settingsQueue.catch(()=>{}).then(async()=>{
  const {settings:stored}=await chrome.storage.local.get('settings');
  const current={...MathConfig.DEFAULTS,...stored};
  const next={...current,...patch};
  await chrome.storage.local.set({settings:next});
  return next;
 });
 settingsQueue=task.catch(()=>{});
 return task;
}
chrome.runtime.onMessage.addListener((msg,_sender,respond)=>{
 if(msg?.type==='PATCH_SETTINGS'){
  const patch=msg.patch;
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!Object.hasOwn(MathConfig.DEFAULTS,k))){
   respond({ok:false,error:'Invalid settings patch'});return;
  }
  updateSettings(patch).then(settings=>respond({ok:true,settings})).catch(()=>respond({ok:false,error:'Storage update failed'}));
  return true;
 }
 if(msg?.type!=='SAVE_VIDEO')return;
 (async()=>{
  const v=msg.video;
  if(!v?.id||!/^\\w[\\w-]{10}$/.test(v.id))throw Error('Identifiant de vidéo invalide');
  const {settings:stored}=await chrome.storage.local.get('settings');
  const saved={...((stored?.saved)||{})};
  saved[v.id]={id:v.id,title:String(v.title||'').slice(0,300),channel:String(v.channel||'').slice(0,120),url:'https://www.youtube.com/watch?v='+v.id,savedAt:Date.now()};
  await updateSettings({saved});
  respond({ok:true});
 })().catch(()=>respond({ok:false,error:'Unable to save video'}));
 return true;
});
