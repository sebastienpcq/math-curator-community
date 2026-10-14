'use strict';
function validate(data){
 const errors=[],ids=new Set(),ex=new Map((data.exercises||[]).map(x=>[x.id,x]));
 for(const p of data.paths||[]){
  const local=new Map(p.steps.map(s=>[s.id,s]));
  for(const s of p.steps){
   if(ids.has(s.id))errors.push('Duplicate skill '+s.id);ids.add(s.id);
   for(const pre of s.prerequisites)if(!local.has(pre))errors.push('Missing prerequisite '+pre);
   for(const id of s.exerciseIds)if(!ex.has(id)||ex.get(id).skillId!==s.id)errors.push('Missing exercise '+id);
  }
  const visiting=new Set(),visited=new Set();
  function visit(id){if(visiting.has(id)){errors.push('Cycle '+id);return;}if(visited.has(id))return;visiting.add(id);for(const pre of local.get(id)?.prerequisites||[])if(local.has(pre))visit(pre);visiting.delete(id);visited.add(id);}
  for(const s of p.steps)visit(s.id);
 }
 for(const x of data.exercises||[])if(x.type!=='numeric'||!Number.isFinite(x.answer)||x.tolerance<0)errors.push('Invalid exercise '+x.id);
 return errors;
}
function normalizeAnswer(value){const s=String(value).trim().replace(',','.');if(!/^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)$/.test(s))return null;const n=Number(s);return Number.isFinite(n)?n:null;}
function grade(exercise,value){const n=normalizeAnswer(value);return n!==null&&Math.abs(n-exercise.answer)<=exercise.tolerance;}
function available(path,progress){return path.steps.filter(s=>s.prerequisites.every(p=>progress[p]?.status==='demonstrated'));}
const api={validate,normalizeAnswer,grade,available};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof window!=='undefined')window.KnowledgeLearning=api;
