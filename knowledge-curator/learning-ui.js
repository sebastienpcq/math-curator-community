'use strict';
(() => {
const KEY='knowledge-curator-progress-v1';
const steps=document.querySelector('#study-steps');
const msg=document.querySelector('#study-message');
const count=document.querySelector('#study-count');
let data=null,progress={};
let history=[];
function readHistory(){try{return KnowledgeStorage.readAttempts(localStorage,KnowledgeAttempts);}catch(error){msg.textContent='Historique inaccessible : '+error.message;return [];}}
function derivedProgress(){const next={...progress};for(const s of data.paths[0].steps){const state=KnowledgeMastery.status(s,history);if(state!=='not_started')next[s.id]={status:state,updatedAt:next[s.id]?.updatedAt||new Date().toISOString()};else if(next[s.id]?.status==='demonstrated'||next[s.id]?.status==='consolidate')next[s.id]={status:'in_progress',updatedAt:new Date().toISOString()};}return next;}
function showHistory(){const list=document.querySelector('#attempt-history');list.replaceChildren();for(const a of history.slice(-30).reverse()){const li=document.createElement('li');const skill=data.paths[0].steps.find(s=>s.id===a.skillId);li.textContent=(skill?.title||a.skillId)+' · '+a.exerciseId+' · '+(a.correct?'correct':'incorrect')+' · '+new Date(a.timestamp).toLocaleString('fr-FR');list.append(li);}if(!history.length){const li=document.createElement('li');li.textContent='Aucune tentative enregistrée.';list.append(li);}}
function validProgress(p){
 if(!p||typeof p!=='object'||Array.isArray(p))return false;
 const allowed=new Set(data.paths[0].steps.map(s=>s.id));
 return Object.entries(p).every(([id,value])=>allowed.has(id)&&value&&typeof value==='object'&&['in_progress','consolidate','demonstrated'].includes(value.status)&&typeof value.updatedAt==='string');
}
function load(){
 try {
  const pending=localStorage.getItem('knowledge-curator-import-journal-v1');
  if(pending!==null){
   const snapshot=JSON.parse(pending);
   if(!snapshot||typeof snapshot!=='object'||!Object.hasOwn(snapshot,'progress')||!Object.hasOwn(snapshot,'attempts')||
      (snapshot.progress!==null&&typeof snapshot.progress!=='string')||
      (snapshot.attempts!==null&&typeof snapshot.attempts!=='string'))throw Error('Journal de récupération invalide');
   const restoredProgress=snapshot.progress===null?{}:JSON.parse(snapshot.progress);
   const restoredAttempts=snapshot.attempts===null?[]:JSON.parse(snapshot.attempts);
   if(!validProgress(restoredProgress)||!KnowledgeAttempts.validateHistory(restoredAttempts))throw Error('Journal de récupération invalide');
   if(Object.hasOwn(snapshot,'legacyArchive')){
    if(snapshot.legacyArchive!==null&&typeof snapshot.legacyArchive!=='string')throw Error('Archive de récupération invalide');
    if(snapshot.legacyArchive!==null){
     const archive=JSON.parse(snapshot.legacyArchive);
     if(!archive||typeof archive!=='object'||archive.version!==1||!validProgress(archive.progress))throw Error('Archive de récupération invalide');
    }
   }
   if(Object.hasOwn(snapshot,'legacyArchive')){
    if(snapshot.legacyArchive===null)localStorage.removeItem('knowledge-curator-legacy-v1-archive');
    else localStorage.setItem('knowledge-curator-legacy-v1-archive',snapshot.legacyArchive);
   }
   if(snapshot.attempts===null)localStorage.removeItem(KnowledgeAttempts.KEY);
   else localStorage.setItem(KnowledgeAttempts.KEY,snapshot.attempts);
   if(snapshot.progress===null)localStorage.removeItem(KEY);
   else localStorage.setItem(KEY,snapshot.progress);
   localStorage.removeItem('knowledge-curator-import-journal-v1');
   msg.textContent='Import interrompu récupéré depuis la sauvegarde locale.';
  }
  const raw=localStorage.getItem(KEY);const p=raw?JSON.parse(raw):{};if(!validProgress(p))throw Error('Progression invalide');progress=p;return true;}
 catch {msg.textContent='Impossible de lire la progression enregistrée. Aucune sauvegarde automatique effectuée.';return false;}
}
function persist(){
 try{KnowledgeStorage.writeProgress(localStorage,progress,validProgress);return true;}
 catch{msg.textContent='Sauvegarde locale indisponible. Exporte ta progression pour la conserver.';return false;}
}
function setStatus(id,status){progress[id]={status,updatedAt:new Date().toISOString()};persist();render();}
function render(){
 history=readHistory();progress=derivedProgress();showHistory();
 const dashboard=document.querySelector('#review-dashboard');dashboard.replaceChildren();
 const weak=KnowledgeReview.weakSkills(data.paths[0],history);
 const due=data.paths[0].steps.map(s=>({s,r:KnowledgeReview.reviewState(s,history)})).filter(x=>x.r.due);
 const h=document.createElement('h3');h.textContent='Révisions et consolidation';dashboard.append(h);
 const dueLine=document.createElement('p');dueLine.textContent=due.length?('À revoir : '+due.map(x=>x.s.title).join(', ')):'Aucune révision échue pour le moment.';dashboard.append(dueLine);
 const err=document.createElement('p');err.textContent=weak.length?('À consolider selon les erreurs : '+weak.slice(0,3).map(x=>x.step.title+' ('+x.review.errors+')').join(', ')):'Aucune erreur enregistrée.';dashboard.append(err);
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
      KnowledgeStorage.appendAttempt(localStorage,KnowledgeAttempts,{
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
  const review=KnowledgeReview.reviewState(s,history);
  if(review.due && s.reviewExerciseIds?.length){
   const ex=exercises.get(s.reviewExerciseIds[0]);
   if(ex){
    const form=document.createElement('form');form.className='exercise delayed-review';
    const label=document.createElement('label');label.textContent='Révision différée : '+ex.question;
    const input=document.createElement('input');input.type='text';input.inputMode='decimal';input.required=true;label.append(input);
    const btn=document.createElement('button');btn.type='submit';btn.textContent='Tester mon rappel';
    const feedback=document.createElement('p');feedback.setAttribute('role','status');
    form.append(label,btn,feedback);
    form.addEventListener('submit',event=>{
     event.preventDefault();
     const ok=KnowledgeLearning.grade(ex,input.value);
     try {KnowledgeStorage.appendAttempt(localStorage,KnowledgeAttempts,{skillId:s.id,exerciseId:ex.id,correct:ok,timestamp:new Date().toISOString()});}
     catch(error){msg.textContent='Révision non enregistrée : '+error.message;return;}
     msg.textContent=(ok?'Rappel correct. ':'Rappel à consolider. ')+ex.explanation;
     render();
    });
    item.append(form);
   }
  }
  steps.append(item);
 }
 count.textContent=done+' / '+path.steps.length+' compétences démontrées';
}
document.querySelector('#progress-export').addEventListener('click',()=>{
 try {
  if(localStorage.getItem('knowledge-curator-import-journal-v1')!==null)throw Error('Récupération en attente');
  const attempts=KnowledgeAttempts.read(localStorage);
  const raw=localStorage.getItem(KEY);
  const saved=raw===null?{}:JSON.parse(raw);
  if(!validProgress(saved))throw Error('Progression locale invalide');
  const blob=new Blob([JSON.stringify({version:2,progress:saved,attempts},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='knowledge-curator-progression.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  msg.textContent='Export de la progression préparé.';
 } catch(error) {
  msg.textContent='Export impossible : données locales indisponibles ou récupération en attente. Aucune donnée modifiée.';
 }
});
document.querySelector('#progress-import').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(file.size>100000){msg.textContent='Fichier trop volumineux.';return;}
 try{const payload=JSON.parse(await file.text());if(![1,2].includes(payload.version)||!validProgress(payload.progress))throw Error('Format invalide');
    const previousHistory=KnowledgeAttempts.read(localStorage);
    const previousProgress=progress;
    if(payload.version===1&&previousHistory.length){
      msg.textContent='Import V1 refusé : un historique récent existe déjà. Exporte tes données actuelles avant toute migration.';
      e.target.value='';
      return;
    }
    // Keep original V1 assertions in a separate, non-authoritative archive.
    // The active progression still requires fresh evidence of mastery.
    const legacyArchive=payload.version===1
      ?JSON.stringify({version:1,importedAt:new Date().toISOString(),progress:payload.progress})
      :null;
    const previousLegacyArchive=localStorage.getItem('knowledge-curator-legacy-v1-archive');
    if(payload.version===1){
      payload.progress=Object.fromEntries(Object.entries(payload.progress).map(([id,value])=>[
        id,value.status==='demonstrated'||value.status==='consolidate'
          ?{...value,status:'in_progress'}
          :value
      ]));
    }
    if(payload.version===2&&!KnowledgeAttempts.validateHistory(payload.attempts))throw Error('Historique invalide');
    // A pending journal is written before either legacy key changes.
    // On next launch, recover the original state if an interruption occurred.
    const JOURNAL='knowledge-curator-import-journal-v1';
    const originalProgressRaw=localStorage.getItem(KEY);
    const originalAttemptsRaw=localStorage.getItem(KnowledgeAttempts.KEY);
    const journal={progress:originalProgressRaw,attempts:originalAttemptsRaw,legacyArchive:previousLegacyArchive};
    localStorage.setItem(JOURNAL,JSON.stringify(journal));
    try {
      if(payload.version===2)KnowledgeAttempts.replace(localStorage,payload.attempts);
      progress=payload.progress;
      history=KnowledgeAttempts.read(localStorage);
      progress=derivedProgress();
      if(!persist())throw Error('Sauvegarde indisponible');
      if(legacyArchive!==null)localStorage.setItem('knowledge-curator-legacy-v1-archive',legacyArchive);
      localStorage.removeItem(JOURNAL);
    } catch(error) {
      progress=previousProgress;
      history=previousHistory;
      try {
        if(originalAttemptsRaw===null)localStorage.removeItem(KnowledgeAttempts.KEY);
        else localStorage.setItem(KnowledgeAttempts.KEY,originalAttemptsRaw);
        if(originalProgressRaw===null)localStorage.removeItem(KEY);
        else localStorage.setItem(KEY,originalProgressRaw);
        if(previousLegacyArchive===null)localStorage.removeItem('knowledge-curator-legacy-v1-archive');
        else localStorage.setItem('knowledge-curator-legacy-v1-archive',previousLegacyArchive);
        localStorage.removeItem(JOURNAL);
      } catch(rollbackError) {
        msg.textContent='Import interrompu : restauration impossible. Le journal de récupération est conservé. Ne réinitialise pas le stockage.';
        e.target.value='';
        return;
      }
      throw error;
    }
    render();msg.textContent='Progression importée.';}
 catch{msg.textContent='Import refusé : fichier non conforme.';}
 e.target.value='';
});
document.querySelector('#progress-reset').addEventListener('click',()=>{
 if(!confirm('Effacer toute la progression locale ?'))return;
 const JOURNAL='knowledge-curator-import-journal-v1';
 try {
  if(localStorage.getItem(JOURNAL)!==null){
   msg.textContent='Réinitialisation refusée : une récupération de données est en attente.';
   return;
  }
  const oldProgress=localStorage.getItem(KEY);
  const oldAttempts=localStorage.getItem(KnowledgeAttempts.KEY);
  localStorage.setItem(JOURNAL,JSON.stringify({progress:oldProgress,attempts:oldAttempts}));
  try {
   KnowledgeAttempts.replace(localStorage,[]);
   localStorage.setItem(KEY,'{}');
   localStorage.removeItem(JOURNAL);
   progress={};history=[];render();
   msg.textContent='Progression réinitialisée.';
  } catch(error) {
   try {
    if(oldAttempts===null)localStorage.removeItem(KnowledgeAttempts.KEY);
    else localStorage.setItem(KnowledgeAttempts.KEY,oldAttempts);
    if(oldProgress===null)localStorage.removeItem(KEY);
    else localStorage.setItem(KEY,oldProgress);
    localStorage.removeItem(JOURNAL);
    history=KnowledgeAttempts.read(localStorage);
    load();render();
    msg.textContent='Réinitialisation annulée : les données précédentes sont conservées.';
   } catch(rollbackError) {
    msg.textContent='Réinitialisation interrompue : récupération requise au prochain démarrage. Ne vide pas le stockage.';
   }
  }
 } catch(error) {
  msg.textContent='Réinitialisation impossible : stockage indisponible.';
 }
});
fetch('learning.json').then(r=>{if(!r.ok)throw Error('Impossible de charger le parcours');return r.json();}).then(d=>{
 const errors=KnowledgeLearning.validate(d);if(errors.length)throw Error(errors.join(', '));
 data=d;if(!load())return;history=readHistory();progress=derivedProgress();persist();render();
}).catch(error=>{msg.textContent='Parcours indisponible : '+error.message;});
})();
