# PROMPT EXPERT — KNOWLEDGE CURATOR V0.5 : RÉTENTION ET TRANSFERT

## Rôle
Agir comme architecte JavaScript, ingénieur pédagogique et responsable des tests.

## État à préserver
Partir de la branche `feature/knowledge-curator-v0.4`. Préserver Math Curator 1.0, l'agent Ollama V0.5 (gelé), le catalogue, les progrès et les tentatives.

## Objectif
Ne plus assimiler trois réponses correctes immédiatement à un acquis durable. Proposer des révisions après certains délais, observer les erreurs, et présenter de nouvelles questions mobilisant les mêmes principes dans des situations différentes.

## Critères d'acceptation
1. Un rappel n'est pas exigé immédiatement après une réussite.
2. Une révision devient exigible après un intervalle explicite ; les intervalles sont heuristiques et non une preuve scientifique individualisée.
3. Les erreurs sont comptabilisées par compétence.
4. Les questions de rappel sont distinctes des exercices initiaux.
5. Toute tentative est ajoutée à l'historique sans effacer les précédentes.
6. La sauvegarde locale reste fonctionnelle et sans compte utilisateur.
7. Les tests unitaires vérifient le déclenchement des révisions et les cas limites.
8. L'agent Ollama n'écrit pas le code.

## Livraison et limites
Documenter la différence entre maîtrise immédiate, rappel différé et stabilité réelle des connaissances. Tester l'interface en navigateur et vérifier l'import/export avant toute publication stable. Ne jamais annoncer un résultat de test non exécuté.
