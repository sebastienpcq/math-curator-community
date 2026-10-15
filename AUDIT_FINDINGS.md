# Math Curator — constats vérifiables

## P1 — Import de progression V0.5 non atomique

Dans `knowledge-curator/learning-ui.js`, le gestionnaire d'import déclarait `const history` dans un bloc, puis lui réaffectait `history=readHistory()`. Cette réaffectation à une constante provoquait une exception après remplacement de l'historique importé. Le bloc `catch` affichait un rejet mais ne restaurait pas nécessairement les données précédentes. Correction : sauvegarde préalable de l'historique et de la progression en mémoire, puis restauration de l'historique si une étape échoue.

## Vérifications à poursuivre

- Historique après actualisation et redémarrage réel de Chrome.
- Intervalles de révision après erreur postérieure à une réussite.
- Cohérence de la maîtrise quand les réponses sont enregistrées hors ordre chronologique.
- Robustesse de la sauvegarde en cas d'erreur `localStorage`.

Aucune de ces vérifications supplémentaires n'est déclarée réussie sans exécution.

## P1 — Planification obsolète après une erreur

`review.cjs` utilisait la dernière réussite pour calculer une échéance même lorsque la tentative la plus récente était incorrecte. Après une erreur, la prochaine révision doit être recalculée après une nouvelle réussite ; les erreurs restent comptabilisées dans le tableau de consolidation.
