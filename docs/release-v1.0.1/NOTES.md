# Math Curator 1.0.1 — candidat rc1

Aucune release publiée. Version interne : 1.0.1.

## Différences avec v1.0.0

- Correctifs de stockage déjà présents dans la source validée : mises à jour sérialisées par le service worker, modifications ciblées, sauvegarde atomique des listes de chaînes et détection de conflit.
- Réévaluation des cartes YouTube lors des changements de réglages et mutations du DOM.
- Normalisation Unicode des règles de reconnaissance mathématique issue du candidat validé.
- Documentation utilisateur, construction déterministe et contrôles de l'archive distribuée.
- Version du manifeste : 1.0.0 → 1.0.1. Aucun autre changement fonctionnel par rapport à d762095dfbf9c6b716acf6a75d903a1b8f5e79f8.

## Validation

Les parcours réels filtrage/réversibilité et favoris après redémarrage ont réussi sur la source d762095d. Ils sont hérités par identité des fichiers comportementaux et ne sont pas réexécutés sur 1.0.1.
La branche 1.0.1 contrôle le manifeste, les ressources, la provenance, la reproductibilité, les régressions Node critiques, les secrets du contenu distribué et le chargement du ZIP extrait avec popup/options et sauvegarde d'une préférence.
Les résultats exacts sont consignés dans le rapport final et GitHub Actions.

Compatibilité effectivement testée : Chromium 141.0.7390.37, Ubuntu, sandbox active.

## Limites

Classification fondée sur des métadonnées, sans garantie scientifique/pédagogique. Dépendance au DOM YouTube. Pas de validation Firefox, mobile ou Chrome Web Store.
MIT proposée mais non adoptée ; publication conditionnée à une décision explicite.
Les prototypes et outils serveur API YouTube ne font pas partie du candidat.

