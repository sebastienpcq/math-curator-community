# Journal de l'audit récursif

## Cycle 1 — 2026-10-15

- Branche créée depuis `fix/knowledge-curator-v0.5-integration`.
- Source examinée : `learning-ui.js`, `attempts.cjs`, `review.cjs`, `mastery.cjs`, tests V0.5 et navigateur.
- Défaut P1 démontré par lecture de code : réaffectation d'une variable `const` pendant l'import de progression V2, avec mutation antérieure du stockage.
- Correctif limité au gestionnaire d'import.
- Ajout d'un scénario de non-régression Playwright.
- Tests en navigateur non exécutés dans cette session ; attente de CI.

## Cycle 2 — à reprendre

Contrôler les résultats CI et traiter les anomalies de planification des révisions.

## Cycle 2 — Révisions espacées

- Défaut P1 : une erreur après une réussite conservait une date future de révision issue de la réussite précédente.
- Correctif : annuler la date et le statut de révision échue après une erreur ; repartir sur un intervalle d'un jour à la réussite suivante.
- Tests ajoutés : succès-erreur-succès, bornes [1,3,7,14,30] jours, ordre chronologique.
- Exécution CI à confirmer.

## Cycle 3 — Résilience du stockage et horodatages identiques

- Les deux workflows du cycle 2 ont conclu avec succès (Node V0.5 et Playwright).
- Cas P1 : si la restauration de l'historique échoue pendant l'import, le gestionnaire signale désormais explicitement le risque de perte et évite de présenter l'échec comme un simple fichier invalide.
- Convention de tri explicitée : à horodatage identique, l'ordre d'enregistrement est conservé par le tri stable de JavaScript.
- Deux tests ajoutés : événements simultanés et refus d'un historique invalide.
- La simulation d'échec de stockage dans l'interface et la vérification des tests de ce cycle restent à effectuer.

## Cycle 4 — Injection de fautes localStorage

- CI cycle 3 : Node et navigateur réussis.
- Deux tests Playwright ajoutés : échec de la seconde écriture (progression), et échec de la restauration de l'historique.
- Les tests capturent l'état initial et vérifient sa conservation, ou l'alerte explicite en cas de restauration impossible.
- Exécution CI du cycle 4 à confirmer ; aucune garantie transactionnelle multi-clé n'est revendiquée.

## Cycle 5 — Journal de récupération

- GitHub Actions du cycle 4 : Node et Chromium réussis.
- Implémentation d'un journal de pré-import contenant les deux valeurs de stockage antérieures.
- Au chargement suivant, un journal en attente déclenche une restauration avant lecture de la progression.
- Test Playwright ajouté : interruption simulée après écriture partielle, puis rechargement et restauration.
- Limite : localStorage n'offre pas de transaction multi-clé ; ce mécanisme vise la récupérabilité, pas une atomicité absolue.
- CI du cycle 5 en attente de confirmation.

## Cycle 6 — Validation du journal corrompu

- Vérification de la CI du cycle 5 : contrôle général réussi, navigateur encore en cours au moment du relevé.
- Correctif : valider types, JSON et schémas de progression/historique avant de restaurer un journal.
- Test Chromium ajouté : journal corrompu, historique existant inchangé après rechargement.
- Risque résiduel : récupération multi-clé non atomique et indisponibilité persistante du stockage.
- Attendre les résultats CI de ce cycle avant validation.

## Cycle 7 — Analyse des échecs CI

- CI cycle 6 : 5 tests navigateur réussis, 2 échoués. Logs analysés : les assertions attendaient des messages antérieurs au mécanisme de journal ; l'injection permanente empêchait aussi la restauration immédiate.
- Scénario corrigé : constater le journal conservé, lever la panne simulée, recharger, puis comparer exactement les deux valeurs antérieures.
- Défaut supplémentaire : journal corrompu au démarrage pouvait être suivi d'une sauvegarde automatique écrasant la progression. Initialisation désormais interrompue sans écriture si la récupération échoue.
- Tests du cycle 7 à confirmer sur GitHub Actions.

## Cycle 8 — Redémarrages répétés avec journal invalide

- Contrôle général du cycle 7 réussi ; navigateur en cours au relevé.
- Nouveau test Playwright : trois rechargements successifs avec journal de récupération invalide, comparaison exacte de la progression et du journal avant/après.
- Critère : aucune écriture automatique ne doit effacer le journal ni altérer la progression tant que la récupération est impossible.
- CI du cycle 8 à vérifier ; aucune validation anticipée.

## Cycle 9 — Réinitialisation sécurisée

- CI cycle 8 : Node et Chromium réussis.
- Défaut P1 : la réinitialisation supprimait l'historique avant de confirmer la sauvegarde de la progression, sans retour arrière sûr.
- Correction : journal de récupération partagé, refus si récupération en attente, rollback et alerte en cas d'échec.
- Test Playwright : panne simulée pendant reset, comparaison des valeurs avant/après, puis rechargement.
- Validation cycle 9 en attente de CI.

## Cycle 10 — Export sûr

- CI cycle 9 : Node et Playwright réussis.
- Risque P1 : export fondé sur un état mémoire pouvant diverger du stockage, ou export pendant récupération incomplète.
- Correctif : lecture et validation des deux valeurs persistées, refus si journal de récupération présent ; aucun fichier exporté en cas d'erreur.
- Deux tests Chromium ajoutés : historique JSON corrompu et journal de récupération en attente.
- Résultats CI du cycle 10 à confirmer.

## Cycle 11 — Export/import aller-retour

- CI cycle 10 : Node et Chromium réussis.
- Test Playwright ajouté : réponse incorrecte, export JSON réel, comparaison avec le stockage, réinitialisation, réimportation et rechargement.
- Vérifie l'égalité exacte des tentatives et de la progression avant/après l'aller-retour.
- Résultat CI du cycle 11 à confirmer.

## Cycle 12 — Compatibilité des imports V1/V2

- CI cycle 11 : contrôle général réussi ; navigateur en cours lors du relevé.
- Défaut P1 : un import V1 ne contient pas l'historique ; l'appliquer avec un historique récent pouvait créer une progression incohérente.
- Mesure conservatrice : refuser l'import V1 lorsque des tentatives existent déjà, avec indication d'export préalable.
- Test Playwright ajouté : historique existant, import V1, refus et conservation exacte des deux clés.
- CI du cycle 12 à confirmer.

## Cycle 13 — Import V1 sur installation vierge

- CI cycle 12 : contrôles généraux et navigateur réussis.
- Nouveau test Playwright : importer un fichier V1 valide sans historique existant, recharger, vérifier la compétence en cours et l'absence de tentatives artificielles.
- Compatibilité historique vérifiée uniquement si le nouveau test passe en CI.
- Suite : tester V1 avec progression de maîtrise ancienne sans preuves d'exercices.

## Cycle 14 — Maîtrise historique sans preuves

- Contrôle général du cycle 13 réussi ; navigateur encore en cours au relevé.
- Décision conservatrice : une maîtrise V1 sans historique de tentatives est importée comme `in_progress`, non comme `demonstrated`.
- Même traitement pour l'ancien statut `consolidate` non vérifiable.
- Test Playwright ajouté : importer un V1 `demonstrated`, recharger, vérifier le statut `in_progress` et l'absence de maîtrise démontrée.
- Risque résiduel : cette migration perd la distinction de l'ancien statut dans l'état actif ; documenter avant diffusion.
- CI du cycle 14 à confirmer.

## Cycle 15 — Archivage V1

- CI cycle 14 : Node et Playwright réussis.
- L'ancien statut V1 est conservé dans une archive séparée, non utilisée comme preuve de maîtrise.
- Le statut actif reste `in_progress` lorsqu'aucune tentative ne démontre la maîtrise.
- Test Playwright ajouté pour vérifier archive et état actif.
- Risque : écriture de l'archive après validation active, dont l'échec est signalé mais n'annule pas l'import.
- CI cycle 15 à confirmer.

## Cycle 16 — Échec d'archivage V1

- Le statut d'import réussi ne doit pas être annoncé si l'archive V1 obligatoire ne peut pas être enregistrée.
- L'écriture d'archive est maintenant effectuée avant suppression du journal de récupération ; un échec déclenche la restauration des deux clés principales.
- Test Playwright ajouté : panne ciblée sur l'archive V1, refus d'import et absence de journal résiduel.
- Limite : une archive V1 antérieure peut encore être remplacée lors d'une nouvelle importation ; stratégie de conservation multi-versions à auditer.
- CI du cycle 16 à confirmer.

## Cycle 17 — Rollback de l'archive antérieure

- L'import V1 sauvegarde maintenant la valeur de l'archive existante et la restaure lors d'un rollback, afin de ne pas écraser silencieusement une archive plus ancienne.
- Le journal ne capture toujours que progression et tentatives : interruption brutale entre écriture d'archive et suppression du journal à analyser avant toute validation finale.
- Aucune fusion ; prochaine priorité : cohérence des trois clés après interruption.

## Cycle 18 — Récupération cohérente de trois clés

- CI cycle 17 : contrôles Node et navigateur réussis.
- Défaut résiduel confirmé par inspection : le journal ne sauvegardait pas l'archive V1 alors que l'import la modifiait.
- Correction : journal enrichi de `legacyArchive` et restauration de cette troisième clé au démarrage. Compatibilité maintenue avec les anciens journaux sans ce champ.
- Test Chromium ajouté : interruption simulée, archive et progression modifiées, rechargement, comparaison exacte des trois clés et suppression du journal.
- Validation CI du cycle 18 en attente. Limite : la restauration multi-clé n'est pas atomique en cas de pannes répétées.

## Cycle 19 — Panne transitoire pendant la récupération

- CI cycle 18 : contrôles généraux et navigateur réussis.
- Test Playwright ajouté : journal trois clés, première reprise échouée par injection de faute, deuxième page sans panne, restauration exacte et suppression du journal.
- Aucun changement du moteur métier ; vérification ciblée de récupérabilité après panne transitoire.
- CI cycle 19 en attente ; ne pas considérer le stockage multi-clé comme atomique.

## Cycle 20 — Prototype de stockage versionné

- CI cycle 19 : contrôles Node et Chromium réussis.
- Comparaison documentée entre journal multi-clé, enregistrement unique localStorage et IndexedDB.
- Prototype opt-in `state-v3.cjs` sans branchement dans l'interface : lecture et migration non destructive des trois clés héritées.
- Quatre tests Node : conservation, idempotence, refus de JSON invalide, panne d'écriture.
- Workflow CI étendu pour exécuter ces tests.
- Le prototype n'est pas activé en production ; aucune migration utilisateur n'est effectuée.
- Validation CI du cycle 20 en attente.

## Cycle 21 — Validation du prototype V3

- Contrôle général cycle 20 réussi ; navigateur en cours au moment de la vérification.
- Anomalie : l'archive V1 était acceptée comme simple chaîne sans validation JSON ni structure.
- Correctif : validation de la version, de la date d'archivage et de la progression de l'archive.
- Trois tests Node ajoutés : archive invalide, migration idempotente après corruption du format hérité, état canonique invalide conservé sans remplacement silencieux.
- Module toujours expérimental et non connecté à l'interface.
- CI cycle 21 à confirmer.

## Cycle 22 — Quota et échecs répétés de migration V3

- CI cycle 21 : Node et Chromium réussis.
- Trois tests Node ajoutés au prototype V3 : quota dépassé sans écriture canonique, reprise après échec transitoire, lecture canonique indépendante des clés héritées.
- Aucun branchement du prototype à l'interface ; les données réelles ne sont pas migrées.
- CI cycle 22 à confirmer ; ensuite auditer la concurrence entre onglets et le contrôle des écritures.

## Cycle 23 — Concurrence et mises à jour perdues

- CI cycle 22 : tests Node et Chromium réussis.
- Test Node ajouté : deux instantanés V3 obsolètes, deux écritures successives, perte démontrable de la première tentative.
- Ce test est une reproduction volontaire du défaut, pas une correction ; la CI doit le confirmer.
- Décision : ne pas activer V3 ; préparer un module IndexedDB transactionnel et des tests de concurrence avant migration.
- Aucun changement des données utilisateurs ni de l'interface.

## Cycle 24 — Prototype transactionnel IndexedDB

- CI cycle 23 : Node et Chromium réussis.
- Nouveau module expérimental IndexedDB avec transaction `readwrite` de lecture-modification-écriture ; non chargé par l'interface.
- Test Chromium ajouté : deux modifications concurrentes dans le même magasin, conservation de la tentative et de la progression.
- Le test utilise IndexedDB natif pour établir la propriété de transaction ; l'intégration du module expérimental et la migration V3 restent non vérifiées.
- CI cycle 24 à confirmer.

## Cycle 25 — Tests directs de l'adaptateur IndexedDB

- CI cycle 24 : contrôle général réussi ; navigateur en cours au relevé.
- Amélioration : conserver l'erreur du callback transactionnel lors d'un abort.
- Deux tests Playwright supplémentaires chargent réellement `indexeddb-experimental.cjs` : transactions concurrentes sur le même état et rejet sans commit d'un état invalide.
- La migration depuis localStorage n'est toujours pas branchée dans l'interface.
- CI cycle 25 à confirmer.

## Cycle 26 — Migration expérimentale vers IndexedDB

- CI cycle 25 : tests Node et Chromium réussis.
- Adaptateur expérimental enrichi de lecture et migration non destructive depuis les clés V0.5 via `state-v3.cjs`.
- Tests Playwright ajoutés : conservation des clés héritées, idempotence et refus de données invalides.
- Migration non activée dans l'interface, sans suppression des données existantes.
- CI cycle 26 à confirmer ; prochain audit : concurrence des migrations et validation du schéma complet.

## Cycle 27 — Migration concurrente IndexedDB

- CI cycle 26 : contrôle général réussi ; navigateur encore en cours au relevé.
- Défaut identifié : une valeur canonique existante mais vide pouvait être confondue avec une absence de valeur lors de migrations simultanées.
- Correction : vérification explicite de présence et de validité au sein de la transaction `readwrite` ; aucune migration ne remplace un enregistrement déjà présent.
- Test Chromium ajouté : deux migrations concurrentes depuis des instantanés différents doivent produire un seul état canonique identique pour les deux appels.
- CI cycle 27 à confirmer. Aucun changement de l'interface active.

## Cycle 28 — Migration depuis deux onglets réels

- CI cycle 27 : Node et Chromium réussis.
- Test Playwright ajouté : deux pages du même contexte Chromium démarrent une migration IndexedDB simultanée avec deux états hérités distincts.
- Invariant : les deux appels et la relecture finale retournent le même enregistrement ; aucune migration concurrente ne remplace la première valeur.
- CI cycle 28 en attente. Le stockage expérimental reste inactif dans l'interface.

## Cycle 29 — Ouverture IndexedDB bloquée

- CI cycle 28 : Node et Chromium réussis.
- Gestion explicite de `onblocked` dans l'ouverture de l'adaptateur expérimental.
- Test Playwright : une connexion ouverte bloque une mise à niveau de version, puis sa fermeture permet la reprise.
- Limite : le test d'upgrade valide le comportement natif IndexedDB ; les erreurs quota et abort de l'adaptateur restent à tester directement.
- CI cycle 29 à confirmer ; aucune activation du stockage expérimental.

## Cycle 30 — Abort et quota IndexedDB

- CI cycle 29 : Node et Chromium réussis.
- Trois tests Playwright supplémentaires sur l'adaptateur réel : exception du callback, état invalide après commit antérieur, exception simulée `QuotaExceededError`.
- Invariants : rejet explicite et aucune modification de l'état précédemment validé.
- Le test de quota simule l'exception dans le callback ; il ne reproduit pas un véritable quota disque épuisé dans Chromium.
- CI cycle 30 à confirmer ; module non activé en production.

## Cycle 31 — Synthèse et garde-fou migration

- CI cycle 30 : Node et Playwright réussis (runs 38665780038 et 38665780092).
- Inspection du module expérimental : migration possible malgré un journal de récupération V0.5 en attente, source potentiellement partiellement écrite.
- Correction : refuser la migration tant que le journal est présent.
- Test Playwright ajouté ; validation CI en attente.
- `TEST_RESULTS.md` et `NEXT_ITERATION.md` réactualisés : les risques non vérifiés sont explicités.
- Aucun branchement du stockage expérimental à l'interface, aucune modification de main.

## Cycle 32 — Validation profonde des transactions IndexedDB

- CI cycle 31 : contrôle général réussi ; navigateur en cours au relevé.
- Défaut : `transact` n'examinait que version, présence de tableau et objet de progression, sans contrôler les tentatives ni leurs dates.
- Correctif : vérification approfondie des champs de progression, tentatives et archive avant commit.
- Test Playwright : tentative incorrectement typée rejetée sans écriture.
- Limite : le validateur local doit être unifié avec `state-v3.cjs` pour éviter une divergence de schéma.
- CI cycle 32 à confirmer.

## Cycle 33 — Validation de schéma unifiée

- Contrôle général cycle 32 réussi ; navigateur en cours au relevé.
- Le validateur local IndexedDB était divergent du schéma canonique V3 (notamment archives historiques).
- `transact` utilise désormais `KnowledgeStateV3.validate` comme source unique de validation.
- Tests Chromium adaptés pour charger explicitement `state-v3.cjs` avant l'adaptateur ; scénario ajouté sur archive V1 malformée.
- CI cycle 33 à confirmer ; aucune activation du module expérimental.

## Cycle 34 — Persistance après redémarrage complet de Chromium

- CI cycle 33 : contrôle général réussi ; navigateur encore en cours au relevé.
- Un contexte Playwright éphémère ne convient pas pour tester la persistance inter-session : utilisation d'un profil Chromium persistant.
- Nouveau script `tests/indexeddb-persistence.cjs` : ouvrir Chromium avec un profil temporaire, écrire via l'adaptateur, fermer le navigateur, rouvrir le même profil et comparer les données.
- Workflow navigateur étendu pour lancer ce scénario.
- Résultats CI du cycle 34 en attente ; aucun changement du stockage de production.

## Cycle 35 — Stratégie de déploiement progressif

- CI cycle 34 : contrôle général réussi ; test navigateur avec profil persistant encore en cours au relevé.
- Plan de déploiement par phases documenté dans `STORAGE_ARCHITECTURE.md` : expérimentation, opt-in, lecture contrôlée, déploiement limité, généralisation.
- Critères de migration, sauvegarde et rollback explicites ; avertissement sur le retour arrière après nouvelles écritures IndexedDB.
- Aucune activation, migration réelle ou suppression de clés héritées.
- Attendre la validation CI du cycle 34 avant de développer le basculement.

## Cycle 36 — Prévisualisation et confirmation volontaire de migration

- CI cycle 35 : contrôle général réussi ; navigateur en cours au relevé.
- API expérimentale `prepareMigration` / `confirmMigration` : prévisualisation sans écriture et confirmation explicite par l'appelant.
- Garde-fou : comparaison du snapshot V0.5 entre prévisualisation et confirmation ; refus si les données ont changé.
- Deux tests Playwright ajoutés : migration opt-in non destructive et refus si les données héritées ont changé.
- Limite : la comparaison n'est pas un verrou atomique contre les écritures concurrentes de localStorage.
- Aucune activation dans l'interface, aucune migration utilisateur.

## Cycle 37 — Confirmation de migration et snapshot approuvé

- CI cycle 36 : contrôle général réussi ; navigateur en cours au relevé.
- Défaut de cohérence : la confirmation vérifiait un snapshot puis relisait les anciennes clés via `migrateFromLegacy`, autorisant une nouvelle version non prévisualisée à être engagée.
- Correctif : la transaction IndexedDB enregistre exclusivement `prepared.snapshot` après contrôle préalable, sans nouvelle lecture de l'ancien stockage pendant la transaction.
- Test Playwright ajouté pour vérifier l'égalité exacte du snapshot prévisualisé et de l'état engagé.
- Limite persistante : aucune exclusion mutuelle atomique avec les écritures de localStorage ; phase 1 reste expérimentale.
- CI cycle 37 à confirmer.

## Cycle 38 — Préconditions de basculement

- CI cycle 37 : contrôle général réussi ; navigateur en cours au relevé.
- Ajout d'une inspection en lecture seule `inspectCutover` : refus si journal en attente, état canonique absent/invalide, état hérité invalide ou divergence.
- Test Playwright ajouté : les états égaux sont détectés et une modification de localStorage après migration interdit le basculement.
- La vérification n'est pas un verrou transactionnel ; aucune activation de l'interface ni migration réelle.
- CI cycle 38 à confirmer.

## Cycle 39 — Deux onglets actifs pendant le basculement

- CI cycle 38 : contrôle général réussi ; navigateur encore en cours au relevé.
- Test Playwright ajouté : un deuxième onglet écrit dans localStorage après migration, le premier détecte la divergence et refuse le basculement.
- Protocole de basculement documenté : API de stockage centralisée, source unique de vérité, traitement des anciens onglets non coopératifs et retour arrière explicite.
- Aucune activation IndexedDB dans l'interface ; ce test démontre une détection, pas un verrouillage.
- CI cycle 39 à confirmer.

## Cycle 40 — Frontière de stockage commune

- CI cycle 39 : contrôle général réussi ; navigateur en cours au relevé.
- Ajout d'un module `storage-boundary.cjs` centralisant la lecture/écriture de progression et des tentatives héritées, avec refus d'écriture si récupération en attente.
- Trois tests Node ajoutés et intégrés au workflow CI.
- Ce module n'est pas encore branché à `learning-ui.js` ; il prépare la refactorisation sans modifier le comportement de production.
- Les anciens onglets non coopératifs restent un risque bloquant pour le basculement.
- CI cycle 40 à confirmer.

## Cycle 41 — Première intégration de la frontière de stockage

- CI cycle 40 : contrôle général réussi ; navigateur en cours au relevé.
- `index.html` charge désormais `storage-boundary.cjs` avant `learning-ui.js`.
- `persist()` et `readHistory()` passent par l'interface centralisée.
- Les opérations de reset, import et append ne sont pas encore migrées vers cette frontière ; la transition est partielle.
- Risque : le garde-fou journal doit être validé dans les tests d'import et de récupération existants.
- CI cycle 41 à confirmer ; IndexedDB reste désactivé.

## Cycle 42 — Écriture des tentatives centralisée

- CI cycle 41 : contrôles généraux réussis ; navigateur encore en cours au relevé.
- Les deux écritures d'exercices et de révisions passent maintenant par `KnowledgeStorage.appendAttempt`.
- Deux tests Node ajoutés : délégation de l'écriture et refus si un journal de récupération existe.
- Les imports et resets continuent d'utiliser des opérations directes pour leur séquence de restauration ; leur refactorisation doit conserver les invariants existants.
- CI cycle 42 à confirmer. IndexedDB reste désactivé.

## Cycle 43 — Régression import / journal de récupération

- Contrôle général cycle 42 réussi ; navigateur en cours lors de l'inspection.
- Défaut P1 identifié par analyse du code : `persist()` utilisait la frontière qui refuse toute écriture en présence du journal, alors que l'import doit écrire avant suppression du journal.
- Correction : opération `writeDuringRecovery` réservée au code transactionnel, avec validation et exigence d'un journal présent ; l'import utilise cette opération.
- Deux tests Node ajoutés : écriture autorisée dans la récupération, écriture ordinaire toujours bloquée, et refus sans journal.
- Limite : un journal présent ne prouve pas l'identité de son propriétaire ; cette API reste interne et doit être remplacée lors du passage à IndexedDB.
- CI cycle 43 à confirmer.

## Cycle 44 — Validation intégrée après frontière de stockage

- CI cycle 43 : contrôles Node réussis ; navigateur en cours au relevé.
- Deux tests Playwright ajoutés : import V2 suivi d'un rechargement avec comparaison de progression/historique, et refus d'enregistrer une tentative si un journal de récupération est présent.
- Les tests couvrent l'interaction entre `storage-boundary.cjs` et `learning-ui.js`.
- CI cycle 44 à confirmer ; aucune migration IndexedDB active.

## Cycle 45 — Coordinateur transactionnel hérité

- CI cycle 44 : contrôles généraux réussis ; navigateur en cours au relevé.
- Nouveau `KnowledgeStorage.transaction` : snapshot de progression/tentatives/archive, validation avant écriture, journal, commit et rollback en cas d'erreur.
- Deux tests Node ajoutés : commit cohérent et restauration après panne d'écriture.
- Le coordinateur n'est pas encore branché aux handlers d'import/reset ; le risque de divergence est limité en conservant l'ancien comportement pendant validation.
- CI cycle 45 à confirmer. Les opérations localStorage multi-clés ne sont toujours pas atomiques.

## Cycle 46 — Réinitialisation via coordinateur commun

- CI cycle 45 : contrôles généraux réussis ; navigateur en cours au relevé.
- Handler `progress-reset` migré vers `KnowledgeStorage.transaction` : progression et tentatives vidées ensemble, archive V1 conservée, journal et rollback centralisés.
- Test Playwright ajouté : reset réussi, journal absent, tentatives vides, archive préservée.
- Tests historiques d'échec de reset restent indispensables pour la validation.
- CI cycle 46 à confirmer ; import encore sur le mécanisme existant.

## Cycle 47 — Import V1/V2 via coordinateur commun

- CI cycle 46 : contrôles généraux réussis ; navigateur encore en cours au relevé.
- Handler d'import refactorisé pour utiliser `KnowledgeStorage.transaction` (validation, journal, rollback).
- Les imports V1 conservent la déclaration historique en archive et rétrogradent les maîtrises non prouvées ; V2 restaure l'historique importé.
- Test Playwright V1 ajouté ; tests V2, import invalide et injection de pannes existants servent de non-régression.
- CI cycle 47 à confirmer ; IndexedDB demeure expérimental.

## Cycle 48 — Non-régression globale

- CI cycle 47 : contrôles généraux réussis ; navigateur en cours au relevé.
- Nouveau test Playwright de bout en bout : erreur enregistrée, compétence à consolider, import V2, rechargement, comparaison des données et export JSON.
- Les tests existants couvrent séparément reset, rollback, révisions espacées, migration V1 et stockage IndexedDB expérimental.
- CI cycle 48 à confirmer ; aucune déclaration de stabilité avant validation.

## Cycle 48 — Résultat CI du cycle 47 et correction

- CI cycle 47 : Node réussi, navigateur 41/42 réussi, 1 échec.
- Échec exact : le test V1 vierge attendait `null` pour la clé de tentatives, mais le coordinateur transactionnel écrit désormais explicitement `[]`.
- La sémantique reste un historique vide ; assertion modifiée pour comparer le tableau décodé à `[]`.
- Le scénario de non-régression global ajouté dans ce cycle doit encore être exécuté.
- Aucune preuve de corruption ou perte de données dans cet échec ; CI du dernier commit en attente.

## Cycle 49 — Vérification de la CI et rollback du coordinateur

- CI du commit 3af6bb2 : contrôles Node réussis ; Chromium encore en cours au premier relevé.
- Deux tests Node ajoutés au coordinateur : refus d'un historique préexistant corrompu avant création du journal ; panne de restauration conservant le journal et signalant `Rollback failed`.
- Aucun changement de code métier ni d'activation IndexedDB.
- Validation des nouveaux tests et de la CI navigateur à confirmer avant toute qualification de stabilité.

## Cycle 50 — Restauration répétée et archive V1 invalide

- CI cycle 49 : contrôles Node réussis ; navigateur encore en cours au relevé.
- Défaut identifié par inspection : la restauration du journal vérifiait la version et la progression de l'archive V1, mais pas son horodatage `importedAt`.
- Correction : validation de l'horodatage avant toute restauration des trois clés.
- Deux tests Playwright ajoutés : archive invalide sans mutation partielle ; deux reprises échouées puis restauration après levée de la panne.
- CI cycle 50 à confirmer ; IndexedDB non activé.

## Cycle 51 — Validation des archives avant transaction

- CI cycle 50 : contrôles Node réussis ; Chromium encore en cours lors du relevé.
- Défaut confirmé par inspection : `KnowledgeStorage.transaction` acceptait une archive V1 arbitraire dès lors qu'elle était une chaîne, contrairement au validateur de récupération au démarrage.
- Correctif : valider JSON, version, horodatage et progression de l'archive existante et de l'archive cible avant création du journal.
- Deux tests Node ajoutés : archive antérieure malformée et archive cible malformée ; dans les deux cas aucune écriture de journal.
- CI cycle 51 à confirmer. Aucun changement direct de `main` et IndexedDB non activé.

## Cycle 52 — Schéma d'archive partagé

- CI cycle 51 : contrôle général réussi ; navigateur en cours au relevé.
- `state-v3.cjs` expose désormais `validLegacyArchive`; `storage-boundary.cjs` réutilise ce validateur quand il est chargé, en conservant la restriction des compétences de l'interface.
- `index.html` charge le schéma avant la frontière de stockage.
- Test Node ajouté : une archive avec identifiant de compétence invalide est refusée avant journal.
- Limite : un validateur de secours reste présent pour les usages autonomes de la frontière ; le supprimer exige de modifier tous les consommateurs.
- CI cycle 52 à confirmer.

## Cycle 53 — Validation canonique à la récupération

- CI cycle 52 : Node et Chromium réussis.
- `learning-ui.js` réutilise désormais `KnowledgeStateV3.validLegacyArchive` avant de restaurer un journal, en conservant le contrôle des compétences du parcours actif.
- Test Playwright ajouté : archive contenant un identifiant de compétence interdit, refus de restauration, conservation des trois valeurs et du journal.
- Le validateur de secours de `storage-boundary.cjs` demeure pour compatibilité autonome ; son retrait demande une migration explicite des tests/consommateurs.
- CI cycle 53 à confirmer. Aucun merge, aucune activation IndexedDB.

## Cycle 54 — Suppression du validateur de secours

- CI cycle 53 : contrôles Node et Chromium réussis.
- `storage-boundary.cjs` exige maintenant `KnowledgeStateV3.validLegacyArchive` ; le validateur de secours dupliqué a été retiré.
- Les tests Node chargent explicitement le schéma canonique. Test ajouté : en l'absence du validateur, la transaction échoue avant toute écriture.
- `index.html` charge déjà le schéma V3 avant la frontière de stockage.
- CI cycle 54 à confirmer ; aucune migration IndexedDB active.

## Cycle 55 — Réparation CI du validateur canonique

- CI cycle 54 : les deux workflows ont échoué sur le même test `missing canonical validator fails closed before transaction writes` (erreur `Missing expected exception`).
- Cause : une archive `null` contournait la vérification de dépendance dans `validArchive` ; la transaction pouvait réussir sans schéma chargé.
- Correctif : imposer la disponibilité de `KnowledgeStateV3.validLegacyArchive` au début de toute transaction, avant journal ou écriture.
- CI cycle 55 à confirmer ; aucun merge et aucun basculement IndexedDB.

## Cycle 56 — Récupération centralisée

- CI cycle 55 : contrôles Node et Chromium réussis.
- Nouvelle API `KnowledgeStorage.recover` : validation préalable du journal, des tentatives et de l'archive V1, restauration des trois clés puis suppression du journal.
- `learning-ui.js` délègue maintenant la récupération au démarrage à cette API.
- Deux tests Node ajoutés : restauration cohérente et refus d'une archive malformée sans mutation.
- La restauration demeure multi-clé et non atomique ; en cas de panne, le journal est conservé pour une reprise.
- CI cycle 56 à confirmer ; IndexedDB non activé.

## Cycle 57 — Compatibilité journaux historiques et reprise répétée

- CI cycle 56 : Node et Chromium réussis.
- Deux tests Node ajoutés à `storage-boundary.test.cjs` : récupération d'un ancien journal à deux clés sans toucher à l'archive V1, et deux échecs successifs suivis d'une récupération réussie.
- Aucun changement du code de production ; les invariants de récupération sont vérifiés par tests.
- CI cycle 57 à confirmer. IndexedDB reste expérimental et désactivé.

## Cycle 58 — Centralisation des lectures de stockage

- CI cycle 57 : contrôle général réussi ; navigateur en cours au relevé.
- `learning-ui.js` passe désormais par `KnowledgeStorage.readProgress`, `readAttempts`, `readArchive` et `pending` pour ses lectures ordinaires.
- Nouvelle API `readArchive` valide l'archive V1 avant retour et refuse toute lecture si une récupération est en attente.
- Deux tests Node ajoutés : archive absente/corrompue et journal de récupération présent.
- Le code d'import et de reset reste coordonné par `transaction` ; IndexedDB n'est pas activé.
- CI cycle 58 à confirmer.

## Cycle 59 — Fidélité import/export V2

- CI cycle 58 : contrôles Node et Chromium réussis.
- Suppression d'une sérialisation/désérialisation inutile lors de l'export de progression.
- Deux tests Playwright ajoutés : export V2 puis réimport et rechargement avec comparaison de progression et historique ; import V2 invalide refusé sans modification des trois clés ni journal résiduel.
- CI cycle 59 à confirmer ; aucun changement de format et IndexedDB toujours désactivé.

## Cycle 60 — Consolidation des preuves et décision de déploiement

- CI cycle 59 : workflows Node (38670136663) et Chromium (38670136562) réussis sur le commit `a856e75`.
- Relecture des modules `storage-boundary.cjs`, `state-v3.cjs` et `indexeddb-experimental.cjs` : le stockage historique demeure actif ; IndexedDB est expérimental et non chargé dans l'interface.
- `TEST_RESULTS.md` et `NEXT_ITERATION.md` actualisés pour remplacer les points de contrôle obsolètes du cycle 31.
- Décision NO-GO pour activation IndexedDB : concurrence avec anciens onglets, quota réel, réconciliation et retour arrière non démontrés.
- Aucune modification fonctionnelle ; CI cycle 60 à confirmer. Critère d'arrêt temporaire : pas de correctif P0/P1 nouveau démontré à cette étape, priorité aux validations de release.

## Cycle 61 — Smoke test de l'extension Chrome Manifest V3

- CI cycle 60 : contrôles Node et Chromium réussis.
- Inspection du manifeste racine : MV3, permission `storage`, content scripts sur `https://www.youtube.com/*`, service worker `src/background.js`.
- Ajout de `knowledge-curator/tests/extension-mv3.spec.cjs` : lancement d'un Chromium avec extension chargée, page YouTube simulée localement, contrôle du mode désactivé par défaut, activation du filtre puis désactivation.
- Workflow navigateur étendu pour exécuter ce test. Le test n'utilise pas le site YouTube réel et ne couvre pas ses changements de DOM.
- CI cycle 61 à confirmer ; aucun changement de `main`, aucune activation IndexedDB.

## Cycle 62 — Shorts et recommandations dynamiques en MV3

- CI cycle 61 : contrôles Node et Chromium réussis, y compris le chargement réel de l'extension MV3.
- Nouveau test Playwright avec extension réellement chargée : masquage d'un Short, ajout dynamique d'une recommandation hors sujet, puis réapparition des éléments à la désactivation.
- Le scénario exerce MutationObserver et la synchronisation des réglages Chrome Storage.
- Limite : le DOM est simulé ; aucun test sur le site YouTube en direct.
- CI cycle 62 à confirmer ; IndexedDB demeure expérimental.

## Cycle 63 — Navigation SPA et préférences en direct

- CI cycle 62 : contrôles Node réussis ; navigateur encore en cours au relevé.
- Test Playwright MV3 ajouté : navigation interne simulée sans rechargement, nouveau contenu filtré, modification de la liste d'autorisation en session puis réapplication du filtrage.
- Le scénario couvre `yt-navigate-finish` et `chrome.storage.onChanged` dans Chromium avec l'extension chargée.
- CI cycle 63 à confirmer. Les pages sont simulées et ne remplacent pas une validation sur YouTube réel.

## Cycle 64 — Priorité blocage explicite / autorisation

- CI cycle 63 : Node et Chromium réussis.
- Défaut fonctionnel confirmé par lecture de `src/content.js` : une vidéo Shorts présente simultanément dans `allowVideos` et `blockVideos` pouvait rester visible, car l'exception Shorts écrasait la décision de blocage.
- Correctif : une entrée explicite `blockVideos` conserve la priorité, y compris pour les Shorts ; le masquage Shorts par défaut est préservé.
- Test Playwright MV3 ajouté : conflit allow/block sur vidéo classique et Short, puis levée du blocage.
- CI cycle 64 à confirmer ; aucune activation IndexedDB.

## Cycle 65 — Matrice de priorité vidéo / chaîne / mode strict

- CI cycle 64 : contrôles Node et Chromium réussis.
- Inspection de `MathScoring.decide` : blocage vidéo > autorisation vidéo > blocage chaîne > autorisation chaîne > règles pédagogiques. Le correctif Shorts du cycle 64 préserve le blocage explicite.
- Test Chromium MV3 ajouté pour vérifier ces priorités sur une page YouTube simulée, y compris le retour au filtrage strict lorsque les exceptions sont retirées.
- Aucun changement de logique métier faute d'anomalie supplémentaire démontrée ; CI cycle 65 à confirmer.
