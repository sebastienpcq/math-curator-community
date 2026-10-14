'use strict';
(() => {
const KEY='knowledge-curator-progress-v1';
const steps=document.querySelector('#study-steps');
const msg=document.querySelector('#study-message');
const count=document.querySelector('#study-count');
let data=null,progress={};
let history=[];
function readHistory(){try{return KnowledgeAttempts.read(localStorage);}catch(error){msg.textContent='Historique inaccessible : '+error.message;return [];}}
function derivedProgress(){const next={...progress};for(const s of data.paths[0].steps){const state=KnowledgeMastery.status(s,history);if(state==='demonstrated'||state==='consolidate'||state==='in_progress')next[s.id]={status:state,updatedAt:next[s.id]?.updatedAt||new Date().toISOString()};else if(next[s.id]?.status==='demonstrated')next[s.id]={status:'in_progress',updatedAt:new Date().toISOString()};}return next;}
function showHistory(){const list=document.querySelector('#attempt-history');list.replaceChildren();for(const a of history.slice(-30).reverse()){const li=document.createElement('li');const skill=data.paths[0].steps.find(s=>s.id===a.skillId);li.textContent=(skill?.title||a.skillId)+' · '+a.exerciseId+' · '+(a.correct?'correct':'incorrect')+' · '+new Date(a.timestamp).toLocaleString('fr-FR');list.append(li);}if(!history.length){const li=document.createElement('li');li.textContent='Aucune tentative enregistrée.';list.append(li);}}
function validProgress(p){
 if(!p||typeof p!=='object'||Array.isArray(p))return false;
 const allowed=new Set(data.paths[0].steps.map(s=>s.id));
 return Object.entries(p).every(([id,value])=>allowed.has(id)&&value&&typeof value==='object'&&['in_progress','consolidate','demonstrated'].includes(value.status)&&typeof value.updatedAt==='string');
}
function load(){
 try {const raw=localStorage.getItem(KEY);const p=raw?JSON.parse(raw):{};progress=validProgress(p)?p:{};}
 catch {progress={};msg.textContent='Impossible de lire la progression enregistrée.';}
}
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify(progress));return true;}
 catch{msg.textContent='Sauvegarde locale indisponible. Exporte ta progression pour la conserver.';return false;}
}
function setStatus(id,status){progress[id]={status,updatedAt:new Date().toISOString()};persist();render();}
function render(){
 history=readHistory();progress=derivedProgress();showHistory();
 steps.replaceChildren();let done=0;
 const path=data.paths[0],available=new Set(KnowledgeLearning.available(path,progress).map(s=>s.id));
 const exercises=new Map(data.exercises.map(e=>[e.id,e]));
 for(const s of path.steps){
  const state=progress[s.id]?.status||'not_started',unlocked=available.has(s.id),passed=state==='demonstrated';
  if(passed)done++;
  const item=document.createElement('article');item.className='study-step';
  const h=document.createElement('h3');h.textContent=s.title;
  const description=document.createElement('p');description.textContent=s.objective;
  const stateLine=document.createElement('p');stateLine.className='study-status';
  stateLine.textContent=(passed?'Maîtrise provisoirement démontrée':state==='consolidate'?'À consolider':state==='in_progress'?'En cours':'Non commencée')+(unlocked?' · prérequis satisfaits':' · prérequis à vérifier');
  const missing=s.prerequisites.filter(id=>progress[id]?.status!=='demonstrated');
  if(missing.length){const p=document.createElement('p');p.textContent='Prérequis : '+missing.map(id=>path.steps.find(t=>t.id===id).title).join(', ');item.append(p);}
  item.append(h,description,stateLine);
  for(const rid of s.resourceIds){
   const resource=window.knowledgeCatalog?.resources?.find(r=>r.id===rid);
   if(resource){const a=document.createElement('a');a.href=resource.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Voir la ressource : '+resource.title;item.append(a);}
  }
  const start=document.createElement('button');start.textContent='Étudier cette notion';start.type='button';start.addEventListener('click',()=>setStatus(s.id,'in_progress'));item.append(start);
  for(const exerciseId of s.exerciseIds){
  const exercise=exercises.get(exerciseId);
  if(exercise){
   const form=document.createElement('form');form.className='exercise';
   const label=document.createElement('label');label.textContent=exercise.question;
   const input=document.createElement('input');input.type='text';input.inputMode='decimal';input.required=true;input.autocomplete='off';label.append(input);
   const submit=document.createElement('button');submit.type='submit';submit.textContent='Vérifier ma réponse';
   const feedback=document.createElement('p');feedback.setAttribute('role','status');
   form.append(label,submit,feedback);
   form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!unlocked){feedback.textContent='Valide d’abord les prérequis pour ce test.';return;}
    const ok=KnowledgeLearning.grade(exercise,input.value);
    feedback.textContent=(ok?'Réponse correcte. ':'Réponse à revoir. ')+exercise.explanation;
    try {
      KnowledgeAttempts.append(localStorage,{
        skillId:s.id,exerciseId:exercise.id,correct:ok,timestamp:new Date().toISOString()
      });
    } catch(error) {
      msg.textContent='Attention : tentative non enregistrée ('+error.message+').';
      return;
    }
    history=readHistory();
    const newState=KnowledgeMastery.status(s,history);
    setStatus(s.id,newState);
    msg.textContent=(ok?'Réponse correcte. ':'Réponse à revoir. ')+exercise.explanation;
   });
   if(!unlocked){submit.disabled=true;submit.title='Prérequis à vérifier';}
   item.append(form);
  }
  }
  steps.append(item);
 }
 count.textContent=done+' / '+path.steps.length+' compétences démontrées';
}
document.querySelector('#progress-export').addEventListener('click',()=>{
 const blob=new Blob([JSON.stringify({version:2,progress,attempts:KnowledgeAttempts.read(localStorage)},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='knowledge-curator-progression.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
document.querySelector('#progress-import').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(file.size>100000){msg.textContent='Fichier trop volumineux.';return;}
 try{const payload=JSON.parse(await file.text());if(![1,2].includes(payload.version)||!validProgress(payload.progress))throw Error('Format invalide');
    const history=KnowledgeAttempts.read(localStorage);
    if(payload.version===2){
      if(!KnowledgeAttempts.validateHistory(payload.attempts))throw Error('Historique invalide');
      KnowledgeAttempts.replace(localStorage,payload.attempts);
    }
    progress=payload.progress;
    history=readHistory();progress=derivedProgress();
    if(!persist()){
      if(payload.version===2)KnowledgeAttempts.replace(localStorage,history);
      throw Error('Sauvegarde indisponible');
    }
    render();msg.textContent='Progression importée.';}
 catch{msg.textContent='Import refusé : fichier non conforme.';}
 e.target.value='';
});
document.querySelector('#progress-reset').addEventListener('click',()=>{
 if(!confirm('Effacer toute la progression locale ?'))return;
 progress={};KnowledgeAttempts.replace(localStorage,[]);history=[];persist();render();msg.textContent='Progression réinitialisée.';
});
fetch('learning.json').then(r=>{if(!r.ok)throw Error('Impossible de charger le parcours');return r.json();}).then(d=>{
 const errors=KnowledgeLearning.validate(d);if(errors.length)throw Error(errors.join(', '));
 data=d;load();history=readHistory();progress=derivedProgress();persist();render();
}).catch(error=>{msg.textContent='Parcours indisponible : '+error.message;});
})();
