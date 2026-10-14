# Référence technique — historique des tentatives

## Tâche atomique pour Ollama
Fichier : `attempts.cjs`.

**Question :** expliquer comment tester que trois réponses successives `false, false, true` sont conservées, y compris après réouverture du stockage. Ne proposer ni réécriture du moteur, ni modification de la progression.

**Résultat attendu :** trois événements distincts, dans l'ordre, chacun ayant `skillId`, `exerciseId`, `correct`, `timestamp`. Une erreur de stockage doit être signalée sans prétendre que la tentative a été sauvegardée.

## Implémentation de référence
- `attempts.cjs` : API `read`, `append`, `replace`, validation des événements.
- `tests/attempts.test.cjs` : suite de tests de conservation, redémarrage simulé, validation des données, erreurs de quota.
- `learning-ui.js` : soumission du formulaire vers `KnowledgeAttempts.append` avant la progression.

## Grille de comparaison
Comparer une proposition d'Ollama aux exigences suivantes (un évaluateur humain doit décider) :
1. Distingue l'historique des tentatives de l'état de compétence.
2. Ne remplace pas les anciens événements.
3. Teste plusieurs réponses à un même exercice.
4. Teste la lecture après écriture.
5. Prévoit la gestion d'un échec de `localStorage`.
6. Ne prétend pas qu'une réponse valide démontre une maîtrise durable.

**Aucune note automatique n'est attribuée à la seule ressemblance textuelle.** La comparaison porte sur les comportements et les tests.

## Limites restantes
Le stockage navigateur est local au profil et peut être effacé. Le prototype ne propose pas encore un écran chronologique de consultation des tentatives. La modification coordonnée de deux clés `localStorage` n'est pas transactionnelle ; l'import/export demande encore un test navigateur de bout en bout.
