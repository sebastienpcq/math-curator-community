(function(root){
'use strict';
const DOMAINS = Object.freeze({
  elementary:'Arithmétique et algèbre', geometry:'Géométrie et trigonométrie',
  calculus:'Analyse et calcul différentiel', linear:'Algèbre linéaire',
  probability:'Probabilités et statistiques', discrete:'Discrètes et combinatoire',
  number:'Théorie des nombres', logic:'Logique et ensembles', graphs:'Théorie des graphes',
  complexity:'Algorithmique et complexité', optimization:'Optimisation', advanced:'Mathématiques avancées'
});
const DEFAULTS = Object.freeze({enabled:false,mode:'balanced',focus:'all',level:'beginner',threshold:42,
 domains:[],allowChannels:[],blockChannels:[],allowVideos:[],blockVideos:[],saved:{},showBadges:true,
 hideShorts:true,hideDistractions:true});
root.MathConfig={DOMAINS,DEFAULTS};
})(globalThis);
