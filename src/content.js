(()=>{'use strict';
const cardSelector=['ytd-rich-grid-media','ytd-video-renderer','ytd-compact-video-renderer','ytd-grid-video-renderer','ytd-playlist-video-renderer','ytd-rich-item-renderer','ytd-reel-item-renderer'].join(',');
let settings={...MathConfig.DEFAULTS};let observer=null,timer=null;const results=new WeakMap();
const metrics={scans:0,totalMs:0,maxMs:0,lastMs:0};
// Read-only diagnostics; no user content is collected or transmitted.
Object.defineProperty(window,'__mathCuratorMetrics',{value:metrics,configurable:false});
const txt=(node)=>node?.textContent?.trim()||'';
function extract(card){
 const anchor=card.querySelector('a#video-title-link, a#video-title, a[href*="watch?v="], a[href*="/shorts/"]');
 const href=anchor?.getAttribute('href')||'';let id='';try{const url=new URL(href,location.origin);id=url.searchParams.get('v')||(url.pathname.startsWith('/shorts/')?url.pathname.split('/')[2]:'')||'';}catch{}
 const title=txt(card.querySelector('#video-title, #video-title-link, h3 yt-formatted-string, a[title]'))||anchor?.getAttribute('title')||'';
 const channel=txt(card.querySelector('ytd-channel-name a, #channel-name a, a.yt-simple-endpoint.yt-formatted-string[href^="/@"], #byline a'));
 const context=txt(card.querySelector('#description-text, #description, .metadata-snippet-text, #metadata-line'));
 return {id,title,channel,context,url:id?'https://www.youtube.com/watch?v='+encodeURIComponent(id):href};
}
function showDialog(video,ev){
 document.querySelector('.math-curator-dialog')?.remove();const box=document.createElement('section');box.className='math-curator-dialog';box.setAttribute('role','dialog');box.setAttribute('aria-label','Détails du classement');
 const heading=document.createElement('h2');heading.textContent=video.title||'Vidéo sans titre';box.append(heading);
 const note=document.createElement('p');note.textContent=ev.score===null?'Non évaluée':`Indice textuel : ${ev.score}/100 — confiance ${ev.confidence}`;box.append(note);
 const basis=document.createElement('p');basis.textContent='Source : '+ev.basis+'. Ceci n’est pas un score de rigueur validé.';box.append(basis);
 const list=document.createElement('ul');for(const t of [...ev.evidence,...ev.warnings]){const li=document.createElement('li');li.textContent=t;list.append(li);}box.append(list);
 const save=document.createElement('button');save.textContent='Enregistrer';save.addEventListener('click',()=>{chrome.runtime.sendMessage({type:'SAVE_VIDEO',video},res=>{save.textContent=res?.ok?'Enregistrée':'Erreur';});});box.append(save);
 if(video.id){const allow=document.createElement('button');allow.textContent='Toujours autoriser';allow.addEventListener('click',async()=>{const allowed=[...new Set([...(settings.allowVideos||[]),video.id])];const response=await chrome.runtime.sendMessage({type:'PATCH_SETTINGS',patch:{allowVideos:allowed}});if(!response?.ok)throw Error('Storage update failed');settings={...MathConfig.DEFAULTS,...response.settings};box.remove();scan();});box.append(allow);}
 const close=document.createElement('button');close.textContent='Fermer';close.addEventListener('click',()=>box.remove());box.append(close);document.body.append(box);close.focus();box.addEventListener('keydown',e=>{if(e.key==='Escape')box.remove();});
}
function process(card){
 const video=extract(card);const fingerprint=[video.id,video.title,video.channel,video.context,JSON.stringify([settings.enabled,settings.mode,settings.focus,settings.level,settings.threshold,settings.domains,settings.allowVideos,settings.blockVideos,settings.allowChannels,settings.blockChannels,settings.showBadges,settings.hideShorts])].join('|');
 if(results.get(card)===fingerprint)return;results.set(card,fingerprint);
 if(!settings.enabled){card.classList.remove('math-curator-hidden');card.querySelector('.math-curator-badge')?.remove();return;}
 const isShort=!!card.matches('ytd-reel-item-renderer')||!!card.querySelector('a[href^="/shorts/"]');
 const ev=MathScoring.evaluate(video,settings);
 let decision=MathScoring.decide(ev,video,settings);
 if(isShort&&settings.hideShorts&&!settings.allowVideos?.includes(video.id))decision='hide';
 // Explicit video blocks take precedence over Shorts exceptions and allowlists.
 if(video.id&&settings.blockVideos?.includes(video.id))decision='hide';
 // Unknown content is preserved except in strict mode; no arbitrary zero score.
 card.classList.toggle('math-curator-hidden',decision==='hide'||(decision==='unknown'&&settings.mode==='strict'));
 const old=card.querySelector('.math-curator-badge');
 if(!settings.showBadges||decision==='hide'||(decision==='unknown'&&settings.mode==='strict')||!video.title){old?.remove();return;}
 const badge=old||document.createElement('button');badge.type='button';badge.className='math-curator-badge';badge.textContent=ev.score===null?'Math Curator · non évaluée':`Math Curator · indice ${ev.score}/85 · ${ev.confidence.split(' ')[0]}`;
 badge.onclick=e=>{e.preventDefault();e.stopPropagation();showDialog(video,ev);};
 if(!old){const place=card.querySelector('#details, #meta, #metadata, #text')||card;place.append(badge);}
}
function scan(){if(!document.documentElement)return;const started=performance.now();document.querySelectorAll(cardSelector).forEach(process);
 document.querySelectorAll('ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer').forEach(el=>{el.classList.toggle('math-curator-hidden',settings.enabled&&settings.hideShorts);});
 const distractions=['ytd-merch-shelf-renderer','ytd-brand-video-shelf-renderer'];for(const q of distractions)document.querySelectorAll(q).forEach(el=>el.classList.toggle('math-curator-hidden',settings.enabled&&settings.hideDistractions));
 const duration=performance.now()-started;metrics.scans++;metrics.lastMs=duration;metrics.totalMs+=duration;metrics.maxMs=Math.max(metrics.maxMs,duration);
 // Content scripts run in an isolated world: expose aggregate-only diagnostics
 // on the DOM for browser tests. No video metadata or identifiers are exposed.
 const el=document.documentElement;
 el.dataset.mathCuratorScans=String(metrics.scans);
 el.dataset.mathCuratorLastMs=String(metrics.lastMs);
 el.dataset.mathCuratorTotalMs=String(metrics.totalMs);
 el.dataset.mathCuratorMaxMs=String(metrics.maxMs);
}
function schedule(){if(timer)return;timer=setTimeout(()=>{timer=null;scan();},180);}
chrome.storage.local.get('settings').then(data=>{settings={...MathConfig.DEFAULTS,...data.settings};scan();observer=new MutationObserver(records=>{
  if(records.some(r=>
    (r.type==='characterData'&&!r.target.parentElement?.closest('.math-curator-dialog, .math-curator-badge'))||
    (r.type==='attributes'&&!r.target.closest?.('.math-curator-dialog, .math-curator-badge'))||
    [...r.addedNodes,...r.removedNodes].some(n=>
      n.nodeType===1&&!n.matches?.('.math-curator-badge, .math-curator-dialog')&&
      !n.closest?.('.math-curator-dialog')
    )
  ))schedule();
});observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['href','title']});});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.settings){settings={...MathConfig.DEFAULTS,...changes.settings.newValue};resultsCleanup();schedule();}});
function resultsCleanup(){document.querySelectorAll(cardSelector).forEach(card=>results.delete(card));}
window.addEventListener('yt-navigate-finish',schedule);document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
})();
