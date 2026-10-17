# Préparation de Math Curator v1.0.1

## Références et périmètre
Base main figée : 2ec5e83a330f2043b994029e75ac49c4a341cf54.
Source comportementale validée : d762095dfbf9c6b716acf6a75d903a1b8f5e79f8.
Recette réelle : 79be1f6a14913654b0546776d730469018cfab1b, run 39017409363.
La branche release/prepare-math-curator-v1.0.1 part de main, sans fusion des branches expérimentales.

Indispensables : les 11 fichiers de l'extension figurant dans package-manifest.json, identiques à la référence sauf manifest.version=1.0.1.
Tests/documentation/sécurité : tests/community.test.cjs, tests/storage-failure.test.cjs, release-tools/build_v101.py, release-tools/archive_smoke.cjs, .github/workflows/math-curator-v101.yml, README.md, docs/release-v1.0.1/*.
Exclus : desktop, knowledge-curator, src/video-intelligence, corpus, scripts d'audit récursif, workflows expérimentaux et leurs historiques.
Les fichiers déjà présents dans main sont conservés ; l'ancienne archive racine reste historique et n'est pas redistribuée comme candidat.

## Provenance et version
Le constructeur lit les objets Git du SHA candidat, vérifie chaque fichier contre d762095d et n'autorise qu'une différence de version du manifeste.
Le ZIP contient manifest.json à la racine et dix ressources d'extension.
Métadonnées ZIP fixes : chemins triés, date 1980, Unix 0644, ZIP_STORED. Deux constructions identiques et comparaison des octets extraits exigées.
La version v1.0.0 existe sous forme de tag, release et ancien manifeste. Aucune v1.0.1 trouvée à la préparation. Aucun tag créé.

## Licence et dépendances
Aucune licence explicite dans main ou le candidat applicatif. Recherche de copyright/licence/SPDX dans les fichiers sélectionnés sans mention différente trouvée.
Le ZIP n'embarque aucune dépendance npm ni bibliothèque tierce identifiée ; API chrome et DOM natifs uniquement. Node/Playwright/Gitleaks sont des outils de développement non distribués dans le ZIP.
Les auteurs Git visibles sur ces chemins sont sebnosaint et github-actions[bot] ; ceci ne démontre pas à lui seul la titularité juridique.
Aucune incompatibilité identifiée dans les fichiers examinés, mais la provenance complète et les droits des contributeurs ne sont pas certifiés juridiquement.
MIT-PROPOSED.txt est une proposition sans titulaire inventé ; aucun LICENSE officiel ajouté.
La confirmation du propriétaire doit couvrir l'adoption MIT et son habilitation sur les fichiers concernés.

## Validation
Résultats historiques sur d762095d : MV3, interfaces, préférences persistantes, filtrage/réversibilité réels, favoris réels persistants.
https://github.com/seblenonsaint/math-curator-community/actions/runs/39016636655
https://github.com/seblenonsaint/math-curator-community/actions/runs/39017409363
Contrôles nouveaux définis sur 1.0.1 : provenance exacte, manifeste/ressources, construction déterministe, tests Node critiques, Gitleaks du dossier distribué, Chromium sandboxé chargeant le ZIP extrait, popup/options/préférence.
Les résultats nouveaux et le SHA-256 sont fournis par le run du candidat, son package-manifest.json et le rapport final. Ce document de préparation ne prétend pas qu'un test en attente a réussi.
Aucun nouveau test YouTube réel nécessaire pour un simple changement de version ; portée historique explicitement conservée.
Pas d'audit général ni certification exhaustive.

## Relations des PR
PR4 : validation API vers agent/recursive-audit, hors livraison.
PR5 : client API vers agent/youtube-live-validation ; hors livraison serveur.
PR7 : corrections MV3 vers agent/youtube-client-hardening, reprises ici par fichiers depuis la référence validée.
PR8 : intégration vers agent/youtube-live-validation ; ouverte en brouillon lors de la vérification.
Aucune de ces PR n'est modifiée ni fusionnée. La nouvelle PR vise main et n'importe pas leurs composants hors périmètre.
Le patch de publication est construit sur main actuel : pas besoin de fusionner PR4/5/7/8 pour obtenir les seuls fichiers distribués.

## Décision
GO SOUS RESERVES si les contrôles du candidat réussissent : adoption officielle de la licence toujours en attente.
Aucune publication autorisée. Fusion, tag et release restent des décisions explicites séparées.

