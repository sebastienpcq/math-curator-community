# PROMPT — VALIDATION DE KNOWLEDGE CURATOR V0.5

Rôle : ingénieur qualité logiciel et évaluateur pédagogique indépendant.

Objectif : vérifier de façon reproductible trois comportements, sans modifier les règles métier pour faire passer artificiellement les tests.

1. Erreurs : soumettre une réponse fausse en arithmétique, vérifier la persistance de l'événement et sa présence dans le tableau de consolidation.
2. Conservation : après trois tentatives, simuler la fermeture/réouverture d'une session utilisant le même stockage. Vérifier l'ordre et l'intégrité des événements, y compris les erreurs.
3. Révision : utiliser une horloge simulée pour vérifier qu'un rappel n'est pas exigible immédiatement après une réussite, puis devient exigible après son échéance.

Exécuter les tests Node.js existants et de nouveaux tests ciblés. Vérifier ensuite manuellement dans Chrome l'affichage, l'actualisation, les imports/exports et les messages d'erreur : une réussite de tests unitaires ne suffit pas à certifier l'interface.

Ne modifier ni `main`, ni `feature/knowledge-curator-v0.5`. Ne pas supprimer les données utilisateur. Aucun appel API payant. Documenter précisément les limites et les résultats réels.
