# Knowledge Curator — Roadmap automatisable

## État
- V0.3 : parcours pilote, prérequis, exercices et progression locale.
- Boucle gratuite : validations répétées et rapport téléchargeable.
- Agent de codage autonome : **non installé**. Ne pas confondre cette validation avec une IA qui programme.

## Priorités V0.4
1. Plusieurs exercices distincts par compétence, avec tests de correction.
2. Historique local des tentatives et erreurs, sans données sensibles.
3. Révision différée simple et explicable, sans prétendre démontrer une maîtrise.
4. Tests d'import/export et persistance des données via navigateur.
5. Validation manuelle de l'accessibilité.

## Garde-fous
- Ne jamais publier automatiquement sur `main`.
- Aucune clé d'API ni appel payant.
- Toute écriture de code par un futur agent doit être limitée à une branche dédiée et faire l'objet d'une revue.
- Maximum cinq itérations par déclenchement.
- Arrêt sur test en erreur.

## Prochaine évolution
Pour obtenir une véritable boucle *analyser → coder → tester → corriger*, connecter un agent de programmation explicitement autorisé et mettre en place une sandbox, une limite de budget, une politique de permissions et une revue des pull requests.
