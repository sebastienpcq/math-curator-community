# Math Curator Community

**Un filtre local et réversible pour travailler les mathématiques sur YouTube.**

Math Curator permet de choisir un niveau et des domaines, de filtrer les recommandations, de masquer les Shorts et d'enregistrer des vidéos. Sans compte Math Curator, clé API ni analyse distante.

> Candidat **1.0.1-rc1**, version du manifeste **1.0.1**. Aucune publication officielle de cette version n'a encore eu lieu. La release historique v1.0.0 reste inchangée.

## Installer le candidat

1. Dans [GitHub Actions](https://github.com/seblenonsaint/math-curator-community/actions/workflows/math-curator-v101.yml), ouvrir une exécution réussie de **Math Curator v1.0.1 candidate** correspondant à cette branche.
2. Télécharger l'artefact **math-curator-v1.0.1-rc1-evidence** (connexion GitHub éventuellement nécessaire ; conservation sept jours).
3. Décompresser l'artefact puis `release-candidate/math-curator-community-v1.0.1-rc1.zip`.
4. Conserver le dossier extrait dans un emplacement permanent ; il contient directement `manifest.json` et `src/`.
5. Ouvrir `chrome://extensions/`, activer le **mode développeur**, puis choisir **Charger l'extension non empaquetée** et sélectionner ce dossier.

L'ancienne archive `math-curator-community-v1.zip` n'est pas ce candidat.

Reconstruction depuis un clone possédant l'historique de référence, avec Git et Python 3 :

```bash
git switch release/prepare-math-curator-v1.0.1
python3 release-tools/build_v101.py
```

Le ZIP, son inventaire et `SHA256SUMS.txt` sont créés dans `release-candidate/`. Le script vérifie que les fichiers applicatifs sont identiques au commit validé, à l'exception de la version du manifeste.

## Utilisation

Le filtrage est **désactivé par défaut**. Dans la popup, activer **Filtrage actif**, choisir l'intensité (**Exploration**, **Équilibré**, **Strict**), le niveau et le seuil indicatif. Les cases permettent de masquer les Shorts et d'afficher les indices.

Ouvrir **Domaines et favoris** pour sélectionner des domaines, autoriser ou bloquer des chaînes (un nom par ligne, puis **Enregistrer les listes**).

Pour réafficher les vidéos : désactiver **Filtrage actif** ou cliquer sur **Tout réafficher**.

## Favoris

Activer le filtrage et **Afficher les indices**. Sur une vidéo restée visible, cliquer sur le badge **Math Curator**, puis **Enregistrer** dans les détails. L'accusé **Enregistrée** confirme l'opération. Les favoris et leurs boutons de suppression sont dans les options.

Une vidéo masquée ne propose pas de badge accessible. Préférences et favoris restent dans le stockage local de l'extension. Le redémarrage complet a été testé ; synchronisation, désinstallation et changement de profil ne sont pas couverts.

## Limites et confidentialité

Les indices reposent sur les titres et métadonnées visibles. Ils ne garantissent ni l'exactitude scientifique, ni la rigueur d'une démonstration, ni la qualité pédagogique. Le filtre peut masquer des contenus utiles ou conserver des contenus hors sujet.

Le traitement est local ; l'extension n'envoie pas les contenus analysés à un service distant. YouTube utilise normalement le réseau. Son DOM et ses restrictions peuvent évoluer.

Compatibilité effectivement vérifiée : Chromium 141.0.7390.37 sous Ubuntu avec sandbox active. Firefox, mobile et distribution Chrome Web Store ne sont pas validés.

## Traçabilité

Code comportemental issu de `d762095dfbf9c6b716acf6a75d903a1b8f5e79f8`. La version du manifeste passe de 1.0.0 à 1.0.1 ; aucune fonction ajoutée.
Les [tests réels de filtrage](https://github.com/seblenonsaint/math-curator-community/actions/runs/39016636655) et [de favoris persistants](https://github.com/seblenonsaint/math-curator-community/actions/runs/39017409363) concernent ce code source antérieur.
Les contrôles exécutés sur la branche 1.0.1 sont publiés dans son workflow dédié ; les résultats historiques ne sont pas présentés comme de nouveaux tests.

Voir [les notes de version](docs/release-v1.0.1/NOTES.md) et [le rapport de préparation](docs/release-v1.0.1/PREPARATION.md).

## Licence et publication

**MIT proposée, non adoptée.** Aucun fichier LICENSE officiel ajouté. Le [texte proposé](docs/release-v1.0.1/MIT-PROPOSED.txt) ne constitue pas l'octroi d'une licence.
L'approbation de la licence et l'identification du titulaire restent nécessaires. Aucune certification juridique exhaustive n'est revendiquée.

La PR est destinée à une revue humaine : aucune fusion, aucun tag ni aucune release ne sont autorisés automatiquement par les tests.

[Signaler un problème](https://github.com/seblenonsaint/math-curator-community/issues/new/choose) · [Contribuer](CONTRIBUTING.md)

Préciser navigateur, réglages et étapes de reproduction, sans données personnelles.

