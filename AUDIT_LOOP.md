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
