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
 if(msg?.type==='ADD_LIST_ITEM'||msg?.type==='REMOVE_LIST_ITEM'){
  const allowed=['domains','allowChannels','blockChannels','allowVideos','blockVideos'];
  const key=msg.key,value=msg.value;
  if(!allowed.includes(key)||typeof value!=='string'||!value.trim()||value.length>200){
   respond({ok:false,error:'Invalid list operation'});return;
  }
  const task=settingsQueue.catch(()=>{}).then(async()=>{
   const {settings:stored}=await chrome.storage.local.get('settings');
   const current={...MathConfig.DEFAULTS,...stored};
   const existing=Array.isArray(current[key])?current[key]:[];
   const list=msg.type==='ADD_LIST_ITEM'?[...new Set([...existing,value])]:existing.filter(x=>x!==value);
   const next={...current,[key]:list};
   await chrome.storage.local.set({settings:next});
   return next;
  });
  settingsQueue=task.catch(()=>{});
  task.then(settings=>respond({ok:true,settings})).catch(()=>respond({ok:false,error:'List update failed'}));
  return true;
 }
 if(msg?.type==='PATCH_SETTINGS'){
  const patch=msg.patch;
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!Object.hasOwn(MathConfig.DEFAULTS,k))){
   respond({ok:false,error:'Invalid settings patch'});return;
  }
  updateSettings(patch).then(settings=>respond({ok:true,settings})).catch(()=>respond({ok:false,error:'Storage update failed'}));
  return true;
 }
 if(['REMOVE_FAVORITE','CLEAR_FAVORITES'].includes(msg?.type)){
  const task=settingsQueue.catch(()=>{}).then(async()=>{
   const {settings:stored}=await chrome.storage.local.get('settings');
   const current={...MathConfig.DEFAULTS,...stored};
   const saved={...(current.saved||{})};
   if(msg.type==='REMOVE_FAVORITE'){
    if(typeof msg.id!=='string'||!/^[A-Za-z0-9_-]{11}$/.test(msg.id))throw Error('Invalid video ID');
    delete saved[msg.id];
   }else{
    for(const id of Object.keys(saved))delete saved[id];
   }
   const next={...current,saved};
   await chrome.storage.local.set({settings:next});
   return next;
  });
  settingsQueue=task.catch(()=>{});
  task.then(settings=>respond({ok:true,settings})).catch(()=>respond({ok:false,error:'Favorite update failed'}));
  return true;
 }
 if(msg?.type!=='SAVE_VIDEO')return;
 (async()=>{
  const v=msg.video;
  if(!v?.id||!/^[A-Za-z0-9_-]{11}$/.test(v.id))throw Error('Identifiant de vidéo invalide');
  const task=settingsQueue.catch(()=>{}).then(async()=>{
   const {settings:stored}=await chrome.storage.local.get('settings');
   const current={...MathConfig.DEFAULTS,...stored};
   const saved={...(current.saved||{})};
   saved[v.id]={id:v.id,title:String(v.title||'').slice(0,300),channel:String(v.channel||'').slice(0,120),url:'https://www.youtube.com/watch?v='+v.id,savedAt:Date.now()};
   await chrome.storage.local.set({settings:{...current,saved}});
  });
  settingsQueue=task.catch(()=>{});
  await task;
  respond({ok:true});
 })().catch(()=>respond({ok:false,error:'Unable to save video'}));
 return true;
});
