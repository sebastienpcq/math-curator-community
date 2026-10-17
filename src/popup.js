(async()=>{'use strict';
const $=id=>document.getElementById(id);
let s={...MathConfig.DEFAULTS,...(await chrome.storage.local.get('settings')).settings};
function status(){ $('status').textContent=s.enabled?'Actif sur YouTube':'Désactivé : toutes les vidéos sont réaffichées';$('thresholdValue').textContent=s.threshold+'/85';}
async function patch(change){
 const response=await chrome.runtime.sendMessage({type:'PATCH_SETTINGS',patch:change});
 if(!response?.ok)throw Error(response?.error||'Unable to save preferences');
 s={...MathConfig.DEFAULTS,...response.settings};status();
}
for(const k of ['enabled','mode','level','threshold','hideShorts','showBadges']){
 const e=$(k);e[e.type==='checkbox'?'checked':'value']=s[k];
 e.addEventListener('input',async()=>{
  const value=e.type==='checkbox'?e.checked:e.type==='range'?Number(e.value):e.value;
  try{await patch({[k]:value});}catch{ $('status').textContent='Échec de sauvegarde';}
 });
}
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.settings){s={...MathConfig.DEFAULTS,...changes.settings.newValue};status();}});
$('restore').onclick=async()=>{try{await patch({enabled:false});$('enabled').checked=false;}catch{$('status').textContent='Échec de sauvegarde';}};
$('options').onclick=()=>chrome.runtime.openOptionsPage();status();
})();