'use strict';
const names={mathematics:'Mathématiques',physics:'Physique',history:'Histoire'};
const levels={beginner:'Débutant',intermediate:'Intermédiaire',advanced:'Avancé'};
const elements={list:document.querySelector('#resources'),count:document.querySelector('#count'),empty:document.querySelector('#empty'),query:document.querySelector('#query'),discipline:document.querySelector('#discipline'),level:document.querySelector('#level'),form:document.querySelector('#filters')};
let resources=[];
function paint(){
  const q=elements.query.value.trim().toLocaleLowerCase('fr');
  const filtered=resources.filter(r=>(!q||(r.title+' '+names[r.discipline]).toLocaleLowerCase('fr').includes(q))&&(!elements.discipline.value||r.discipline===elements.discipline.value)&&(!elements.level.value||r.level===elements.level.value));
  elements.list.replaceChildren();
  elements.count.textContent=filtered.length+' ressource'+(filtered.length>1?'s':'');
  elements.empty.hidden=filtered.length!==0;
  for(const r of filtered){
    const card=document.createElement('article');card.className='card';
    const meta=document.createElement('div');meta.className='meta';meta.textContent=names[r.discipline]+' · '+levels[r.level];
    const heading=document.createElement('h3');heading.textContent=r.title;
    const status=document.createElement('div');status.className='status';status.textContent='◌ Évaluation pédagogique en attente';
    const link=document.createElement('a');link.className='resource-link';link.href=r.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Consulter la ressource ↗';
    card.append(meta,heading,status,link);elements.list.append(card);
  }
}
elements.form.addEventListener('input',paint);
elements.form.addEventListener('reset',()=>setTimeout(paint,0));
fetch('catalog.json').then(r=>{if(!r.ok)throw Error('Catalogue inaccessible');return r.json();}).then(c=>{resources=c.resources;paint();}).catch(()=>{elements.count.textContent='Erreur de chargement';elements.empty.hidden=false;elements.empty.textContent='Le catalogue doit être servi par un serveur local (voir README).';});
