'use strict';
const {URL} = require('node:url');
const DISCIPLINES = new Set(['mathematics','physics','history']);
const LEVELS = new Set(['beginner','intermediate','advanced']);
const STATUS = new Set(['unreviewed','in_review','reviewed','rejected']);
const CRITERIA = ['accuracy','pedagogy','sources','accessibility'];
function validateResource(r) {
  const errors=[];
  if (!r || typeof r !== 'object' || Array.isArray(r)) return ['Ressource invalide'];
  if (typeof r.id!=='string'||!/^[a-z0-9-]{3,80}$/.test(r.id)) errors.push('id invalide');
  if (typeof r.title!=='string'||!r.title.trim()) errors.push('titre manquant');
  if (!DISCIPLINES.has(r.discipline)) errors.push('discipline invalide');
  if (!LEVELS.has(r.level)) errors.push('niveau invalide');
  if (!STATUS.has(r.review?.status)) errors.push('statut de revue invalide');
  try {const u=new URL(r.url); if(u.protocol!=='https:' || !u.hostname) errors.push('URL HTTPS requise');}
  catch {errors.push('URL invalide');}
  if (r.review?.status==='reviewed') {
    if (!r.review.reviewer || !r.review.reviewedAt || !r.review.justification) errors.push('revue documentée requise');
    for(const k of CRITERIA) if(!Number.isInteger(r.review.scores?.[k]) || r.review.scores[k]<1 || r.review.scores[k]>5) errors.push('note '+k+' invalide');
  } else if (r.review?.scores !== undefined) {
    errors.push('aucune note autorisée hors revue terminée');
  }
  return errors;
}
function validateCatalog(c) {
  if(!c||c.schemaVersion!==1||!Array.isArray(c.resources)) return ['format de catalogue invalide'];
  const errors=[],ids=new Set();
  for(const [i,r] of c.resources.entries()){
    errors.push(...validateResource(r).map(e=>'ressource '+i+': '+e));
    if(ids.has(r.id)) errors.push('identifiant dupliqué : '+r.id);
    ids.add(r.id);
  }
  return errors;
}
module.exports={validateCatalog,validateResource};
