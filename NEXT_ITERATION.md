# Reprise automatique

1. Inspecter la CI de `agent/recursive-audit` et exécuter la suite V0.5.
2. Vérifier que le scénario Playwright d'import passe et que l'historique antérieur est restauré en cas d'échec de sauvegarde.
3. Auditer `review.cjs` : une erreur après une réussite ne doit pas laisser une révision future inappropriée.
4. Ajouter tests avec horloge simulée, puis corriger seulement après preuve d'échec.
5. Ne pas fusionner `main` sans validation explicite.
