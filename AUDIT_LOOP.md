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
