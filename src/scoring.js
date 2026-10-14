(function(root){
'use strict';
// These are metadata-only indicators, never a judgement of mathematical truth.
const rules={
 elementary:/\b(arithmetic|arithmétique|algèbre|algebra|equation|équation|fractions?|polynom|mathematics|mathématiques|maths?|mathe|matem[aá]tic)\b/i,
 geometry:/\b(géométrie|geometry|trigonométrie|trigonometry|triangles?|euclid|geometric)\b/i,
 calculus:/\b(analyse|calculus|limite|limits?|derivat|dériv|intégral|integral|continuit|continuity|séries?|series)\b/i,
 linear:/\b(algèbre linéaire|linear algebra|matrices?|matrix|vecteurs?|vectors?|eigenvalues?|valeurs propres|espaces? vectoriels?)\b/i,
 probability:/\b(probabilit|probability|statistics?|statistiques?|variance|bayesian|bayésien)\b/i,
 discrete:/\b(combinatoire|combinatorics|discrete math|mathématiques discrètes|permutations?|recurrence|récurrence)\b/i,
 number:/\b(théorie des nombres|number theory|nombres? premiers?|prime numbers?|congruence|modular|diophant)\b/i,
 logic:/\b(logique|logic|ensembles?|set theory|théorème de g[oö]del|godel|predicate|prédicat)\b/i,
 graphs:/\b(théorie des graphes|graph theory|graphes?|graphs?|trees?|arbres? couvrants?)\b/i,
 complexity:/\b(complexit|complexity|algorithm|algorith|np.complete|p vs np|computability|calculabilit)\b/i,
 optimization:/\b(optimis|optimiz|convex|simplex|programmation linéaire|linear programming)\b/i,
 advanced:/\b(topolog|topology|functional analysis|analyse fonctionnelle|measure theory|théorie de la mesure|abstract algebra|algèbre abstraite|differential geometry|géométrie différentielle|category theory)\b/i
};
const mathGeneral=/\b(mathématiques?|maths?|mathematics?|matem[aá]ticas?|mathématique|theorem|théorème|proof|preuve|démonstration|demonstration|algebra|algèbre|equations?|équations?|geometry|géométrie|calculus|derivative|dérivée|integral|intégrale|probabilit|statistics|statistiques|number theory|théorie des nombres|graph theory|linear algebra|analyse mathématique)\b/i;
const pedagogy=/\b(cours|course|leçon|lesson|lecture|tutoriel|tutorial|explained|expliqu|comprendre|understand|introduction|initiation|apprendre|learn|masterclass|chapter|chapitre|playlist|formation|professeur|teacher)\b/i;
const proof=/\b(démonstration|demonstration|preuve|proof|prove|théorème|theorem|rigoureux|rigorous|derivation|dérivation mathématique)\b/i;
const intuition=/\b(intuition|intuitive|visuel|visual|géométrique|geometric|pourquoi|why|conceptuel|conceptual|animation|3d)\b/i;
const exercise=/\b(exercices?|exercises?|corrigés?|solutions?|problèmes?|problems?|worked examples?|exemples? corrigés?)\b/i;
const structure=/\b(chapitre|chapter|partie|part \d|cours complet|full course|playlist|leçon \d|lesson \d|introduction|prérequis|prerequisite)\b/i;
const clickbait=/\b(shocking|incroyable|impossible|personne ne sait|nobody knows|mind.?blowing|secret|100% guaranteed|en 30 secondes|in 30 seconds)\b/i;
const advanced=/\b(university|universit|graduate|master|phd|doctorat|advanced|avancé|research|recherche)\b/i;
const beginner=/\b(débutant|beginner|bases? de|introduction|initiation|pour les nuls|from scratch|fondamentaux)\b/i;
function evaluate(video,settings={}){
 const title=String(video.title||'').trim(), context=String(video.context||'').trim(), channel=String(video.channel||'').trim();
 const text=[title,context].join(' '); const domains=Object.keys(rules).filter(k=>rules[k].test(text));
 const general=mathGeneral.test(text); const relevant=domains.length>0||general;
 const evidence=[]; const warnings=[];
 if(!title){return {relevant:false,score:null,confidence:'insuffisante',domains:[],evidence:['Titre indisponible'],warnings:[],basis:'Métadonnées visibles uniquement',signals:{}};}
 if(!relevant)return {relevant:false,score:null,confidence:'faible',domains:[],evidence:['Aucun indice mathématique explicite dans les métadonnées visibles'],warnings:[],basis:'Métadonnées visibles uniquement',signals:{}};
 const signals={pedagogy:pedagogy.test(text),proof:proof.test(text),intuition:intuition.test(text),exercise:exercise.test(text),structure:structure.test(text),clickbait:clickbait.test(title),advanced:advanced.test(text),beginner:beginner.test(text)};
 // Deliberately conservative proxy score, bounded; not the 100-point rubric in the brief.
 let score=35+(domains.length?8:0)+(general?5:0)+(signals.pedagogy?13:0)+(signals.proof?10:0)+(signals.intuition?7:0)+(signals.exercise?8:0)+(signals.structure?7:0)-(signals.clickbait?12:0);
 score=Math.max(0,Math.min(85,score));
 if(domains.length)evidence.push('Sujet mathématique repéré : '+domains.map(k=>root.MathConfig?.DOMAINS[k]||k).join(', '));
 if(signals.pedagogy)evidence.push('Indices textuels de cours ou d’explication');
 if(signals.proof)evidence.push('Mention de preuve, théorème ou démonstration (non vérifiée)');
 if(signals.intuition)evidence.push('Mention d’intuition ou de visualisation (non vérifiée)');
 if(signals.exercise)evidence.push('Mention d’exercices ou de problèmes (non vérifiée)');
 if(signals.structure)evidence.push('Indices textuels de progression ou de chapitrage');
 if(signals.clickbait)warnings.push('Titre à formulation sensationnaliste : signal faible, pas une preuve');
 warnings.push('Aucune vérification du raisonnement, du déroulement ou de la transcription');
 const confidence=context.length>60?'moyenne (métadonnées)':'faible (titre principalement)';
 return {relevant:true,score,confidence,domains,evidence,warnings,basis:'Indices de métadonnées, non audité',signals};
}
function decide(ev,video,settings){
 const s=settings||{};
 if(!s.enabled)return 'show';
 if(video.id&&s.blockVideos?.includes(video.id))return 'hide';
 if(video.id&&s.allowVideos?.includes(video.id))return 'show';
 const channel=(video.channel||'').trim().toLocaleLowerCase();
 if(channel&&s.blockChannels?.some(c=>c.trim().toLocaleLowerCase()===channel))return 'hide';
 if(channel&&s.allowChannels?.some(c=>c.trim().toLocaleLowerCase()===channel))return 'show';
 if(!video.title)return 'unknown';
 if(s.domains?.length&&!ev.domains.some(d=>s.domains.includes(d)))return ev.relevant?'hide':'unknown';
 if(!ev.relevant)return 'hide';
 if(s.focus==='proof'&&!ev.signals.proof)return 'hide';
 if(s.focus==='intuition'&&!ev.signals.intuition)return 'hide';
 if(s.level==='beginner'&&ev.signals.advanced&&!ev.signals.beginner)return 'hide';
 if(s.level==='advanced'&&ev.signals.beginner&&!ev.signals.advanced)return 'hide';
 const threshold=Number.isFinite(Number(s.threshold))?Number(s.threshold):48;
 const min=s.mode==='strict'?Math.max(64,threshold):s.mode==='explore'?Math.min(35,threshold):threshold;
 if(s.mode==='strict'&&ev.confidence.startsWith('faible'))return 'unknown';
 return ev.score>=min?'show':'hide';
}
root.MathScoring={evaluate,decide};
if(typeof module!=='undefined'&&module.exports)module.exports={evaluate,decide};
})(globalThis);
