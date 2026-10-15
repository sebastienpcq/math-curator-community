# Architecture du stockage — décision technique (cycle 20)

## Contexte vérifié
La V0.5 persiste au moins trois valeurs distinctes dans localStorage : progression, tentatives, archive V1. Le journal de récupération protège certaines opérations mais une panne pendant plusieurs écritures ne constitue pas une transaction atomique. Les tests CI du cycle 19 sont réussis ; ils ne démontrent pas la résistance à toutes les interruptions possibles.

## Comparaison

| Option | Atomicité | Migration | Coût | Conclusion |
| --- | --- | --- | --- | --- |
| Plusieurs clés localStorage et journal | Non atomique ; récupération best effort | Aucune | Complexité croissante | Maintenir seulement pour compatibilité |
| Une seule valeur localStorage versionnée | Chaque setItem est atomique individuellement, mais quota/effacement et concurrence restent possibles | Nécessaire | Modéré | Cible raisonnable pour petite application locale |
| IndexedDB avec transaction readwrite | Transactions multi-enregistrements natives | Nécessaire | Plus élevé | À privilégier si données nombreuses ou opérations concurrentes |

## Décision
Ne pas remplacer immédiatement le stockage en production. Construire d'abord un module expérimental, indépendant et testable, pour un enregistrement unique versionné. Migrer seulement après tests de compatibilité, de quota, d'interruption, de restauration et de round-trip V1/V2. Ne jamais effacer les clés héritées lors de la première migration. Le module ne doit pas être utilisé dans l'interface avant validation.

## Invariants de migration
1. Aucune mutation des clés héritées.
2. Validation intégrale de l'historique, de la progression et de l'archive.
3. L'enregistrement canonique ne devient actif qu'après une écriture complète et une relecture validée.
4. En cas d'échec, le format hérité reste disponible.
5. La reprise est idempotente.
6. L'import V1 ne transforme pas une maîtrise déclarée en preuve de maîtrise.

## Limites
Un enregistrement unique n'assure ni synchronisation multi-appareils ni protection contre l'effacement volontaire du stockage. Une migration automatique sans sauvegarde serait prématurée.
