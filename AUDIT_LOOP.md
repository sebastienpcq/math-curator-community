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
