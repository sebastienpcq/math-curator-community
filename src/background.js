importScripts('config.js');
chrome.runtime.onMessage.addListener((msg,_sender,respond)=>{
 if(msg?.type!=='SAVE_VIDEO')return;
 (async()=>{const {settings:existing} = await chrome.storage.local.get('settings');const s={...MathConfig.DEFAULTS,...existing};const v=msg.video;
 if(!v?.id||!/^[\w-]{11}$/.test(v.id))throw Error('Identifiant de vidéo invalide');
 const saved={...(s.saved||{})};saved[v.id]={id:v.id,title:String(v.title||'').slice(0,300),channel:String(v.channel||'').slice(0,120),url:'https://www.youtube.com/watch?v='+v.id,savedAt:Date.now()};
 s.saved=saved;await chrome.storage.local.set({settings:s});respond({ok:true});})().catch(e=>respond({ok:false,error:String(e)}));return true;
});
