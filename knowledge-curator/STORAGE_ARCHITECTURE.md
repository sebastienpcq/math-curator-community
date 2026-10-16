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

## Cycle 23 — Concurrence entre onglets

Un test déterministe reproduit une perte de mise à jour : deux onglets lisent la même valeur V3 ; le premier ajoute une tentative et sauvegarde ; le second écrit ensuite son ancien instantané avec une modification de progression. La tentative du premier onglet disparaît.

Ce test **documente un défaut architectural**, il ne constitue pas une correction. Une propriété `revision` comparée avant écriture ne résout pas le problème à elle seule : la lecture et l'écriture ne sont pas une opération atomique dans localStorage. `storage` events et BroadcastChannel peuvent aider à détecter les changements mais n'offrent pas de garantie transactionnelle.

### Orientation

- Garder V3 expérimental et inactif.
- Privilégier une transaction IndexedDB `readwrite` pour des modifications concurrentes.
- Ajouter des tests à deux onglets et de conflits avant toute migration active.
- Préserver les clés historiques et l'export V2 pendant la transition.

## Cycle 35 — Plan d'activation progressive IndexedDB

**Statut : proposition, pas activation.** Le test de redémarrage Chromium du cycle 34 doit d'abord réussir.

### Préconditions
1. CI Node et Chromium verte sur le commit candidat, avec test de profil persistant.
2. Validation stricte V3 partagée entre l'adaptateur et la migration.
3. Export V2 disponible et vérifié avant migration.
4. Aucun journal V0.5 en attente, et aucun état local corrompu.
5. Test de concurrence avec deux onglets, et simulation d'échec de quota et d'ouverture.
6. Test de migration sur données réelles anonymisées et représentatives, sans les publier.

### Phases
- **Phase 0 (actuelle)** : module IndexedDB isolé ; aucune lecture/écriture de l'interface.
- **Phase 1 (opt-in développeur)** : migration explicite, non destructive ; relecture et comparaison du snapshot ; les anciennes clés restent intactes.
- **Phase 2 (lecture contrôlée)** : choisir un stockage source de vérité unique par session, avec indicateur de migration ; ne jamais écrire simultanément dans les deux stockages sans protocole défini.
- **Phase 3 (déploiement limité)** : télémétrie respectueuse de la vie privée et contrôle des erreurs, sans collecte de réponses individuelles.
- **Phase 4 (généralisation)** : seulement après tests et procédure de retour arrière éprouvée.

### Retour arrière
- Avant bascule de la source de vérité, l'application continue de lire les clés V0.5.
- En cas d'échec de migration, ne pas modifier ces clés.
- Après des écritures dans IndexedDB, un retour à V0.5 n'est **pas** sûr sans export transactionnel et réconciliation ; il faut une procédure explicite de transfert inverse.
- Ne jamais effacer l'ancienne sauvegarde automatiquement pendant la période de transition.

### Risques ouverts
- Modifications de localStorage entre le snapshot et le commit IndexedDB.
- Reprise après échec du navigateur pendant la migration.
- Contradiction entre un état V0.5 modifié et un état IndexedDB plus récent.
- Quota réel et effacement de données par le navigateur.
- Contrôle de versions et compatibilité avec les anciennes sauvegardes.

**Décision : aucun branchement dans l'interface tant que ces risques n'ont pas de tests suffisants.**

## Cycle 39 — Protocole de basculement et onglets concurrents

Un test Playwright avec deux onglets actifs vérifie que l'inspection de basculement refuse un état devenu divergent après une écriture de l'autre onglet.

**Ce test ne prouve pas l'exclusion mutuelle.** Le code V0.5 actuel écrit toujours dans localStorage et ne consulte pas de verrou ou de marqueur IndexedDB.

### Conditions nécessaires à un vrai basculement
1. Centraliser toutes les écritures pédagogiques derrière une seule API de stockage.
2. Choisir une source de vérité unique et durable (IndexedDB) et éviter la double écriture implicite.
3. Empêcher les anciennes pages encore ouvertes d'écrire dans localStorage : une simple marque en localStorage ne suffit pas pour des pages qui ignorent ce protocole.
4. Prévoir une fermeture/recharge contrôlée des anciens onglets avant activation, avec vérification de divergence juste avant la transition.
5. Maintenir les anciennes données en sauvegarde en lecture seule ; un retour arrière après nouvelles tentatives exige une exportation inverse et une réconciliation.
6. Tester les collisions, redémarrages et échecs de migration sur une version de l'interface réellement intégrée.

**Décision :** ne pas activer IndexedDB dans l'interface tant que les écritures de l'ancien code ne sont pas coordonnées. Les anciens onglets non coopératifs restent un risque bloquant.
