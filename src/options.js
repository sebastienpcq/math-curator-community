(async()=>{'use strict';const $=id=>document.getElementById(id);let s={...MathConfig.DEFAULTS,...(await chrome.storage.local.get('settings')).settings};async function save(patch){const response=await chrome.runtime.sendMessage({type:'PATCH_SETTINGS',patch});if(!response?.ok)throw Error(response?.error||'Storage update failed');s={...MathConfig.DEFAULTS,...response.settings};$('status').textContent='Préférences enregistrées';}
for(const [k,v] of Object.entries(MathConfig.DOMAINS)){const label=document.createElement('label');const input=document.createElement('input');input.type='checkbox';input.checked=s.domains.includes(k);input.addEventListener('change',async()=>{const response=await chrome.runtime.sendMessage({type:input.checked?'ADD_LIST_ITEM':'REMOVE_LIST_ITEM',key:'domains',value:k});if(!response?.ok)throw Error('Domain update failed');s={...MathConfig.DEFAULTS,...response.settings};});label.append(input,document.createTextNode(' '+v));$('domains').append(label);}
for(const k of ['allowChannels','blockChannels'])$(k).value=(s[k]||[]).join('\n');$('saveRules').onclick=async()=>{
 for(const k of ['allowChannels','blockChannels']){
  const desired=[...new Set($(k).value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean))].slice(0,200);
  const expected=Array.isArray(s[k])?s[k]:[];
  const response=await chrome.runtime.sendMessage({type:'REPLACE_CHANNEL_LIST',key:k,expected,desired});
  if(!response?.ok){
   $('status').textContent=response?.error==='CONFLICT'?'Conflit : préférences modifiées ailleurs. Rouvrez les options pour vérifier les changements.':'Échec de sauvegarde';
   return;
  }
  s={...MathConfig.DEFAULTS,...response.settings};
 }
 $('status').textContent='Préférences enregistrées';
};
function render(){const c=$('saved');c.replaceChildren();const videos=Object.values(s.saved||{}).sort((a,b)=>b.savedAt-a.savedAt);if(!videos.length){c.textContent='Aucun favori pour le moment.';return;}for(const v of videos){const row=document.createElement('div');row.className='favorite';const a=document.createElement('a');a.href=v.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=v.title||v.id;const del=document.createElement('button');del.textContent='Retirer';del.onclick=async()=>{const response=await chrome.runtime.sendMessage({type:'REMOVE_FAVORITE',id:v.id});if(!response?.ok)throw Error('Favorite removal failed');s={...MathConfig.DEFAULTS,...response.settings};render();};row.append(a,del);c.append(row);}}render();$('clearSaved').onclick=async()=>{if(!confirm('Effacer tous les favoris ?'))return;const response=await chrome.runtime.sendMessage({type:'CLEAR_FAVORITES'});if(!response?.ok)throw Error('Favorite clear failed');s={...MathConfig.DEFAULTS,...response.settings};render();};
})();