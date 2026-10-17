# Plan expérimental et critères d'arrêt

## Inventaire au démarrage
- 10 vidéos mathématiques réelles sélectionnées intentionnellement, sans validation indépendante de la qualité.
- 3 vidéos réelles négatives avec étiquettes provisoires, toutes classées à tort pertinentes dans le pilote titre-seul.
- 14 cas textuels synthétiques : TP=7, FP=2, TN=5, FN=0 ; précision=7/9, rappel=7/7, F1=14/16. Ne pas extrapoler à YouTube.
- Huit extraits partiels de descriptions pour les dix vidéos positives. Pas de corpus représentatif de descriptions complètes.

## Jalons

1. **M0 — Schéma** : revue de la définition des labels et de la provenance, vérification des valeurs obligatoires et de la traçabilité.
2. **M1 — Pilote d'annotation** : 12 vidéos distinctes non issues du jeu final, au moins 4 pertinentes, 4 hors sujet et 4 ambiguës ; ajuster les consignes avant gel.
3. **M2 — Collecte** : viser 120 vidéos, documenter toutes les exclusions et strates manquantes.
4. **M3 — Accord** : double annotation humaine d'au moins 30 vidéos, arbitrage documenté ; ne pas revendiquer l'indépendance sans deuxième personne.
5. **M4 — Évaluation gelée** : titre seul vs métadonnées enrichies sur les mêmes vidéos, matrice de confusion et abstention, effectifs par strate.
6. **M5 — UX** : tester séparément trois profils (Exploration, Apprentissage, Rigueur) avec tâches d'utilisabilité ; ne pas faire croire que Rigueur certifie les démonstrations.

## Politique de décision

Un résultat positif sur les exemples utilisés pour concevoir le classificateur n'est pas une validation externe. Toute règle nouvelle doit d'abord être motivée par un groupe d'erreurs identifié sur le développement, puis évaluée sur des données gelées non consultées lors du réglage.

Suspendre l'expérience si les sources ne sont pas traçables, si les annotations sont incohérentes ou si les effectifs rendent une métrique trompeuse. Aucune modification de `main`, des PR #5/#7 ou du classificateur de production.
