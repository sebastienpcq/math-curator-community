# Math Curator Community

**Filtrer YouTube pour se concentrer sur les mathématiques.**

J’ai créé Math Curator parce que je passais trop de temps à faire le tri entre les cours de maths, les recommandations hors sujet et les Shorts. L’objectif : garder un environnement plus propice au travail, avec des réglages simples et un filtrage réversible.

Math Curator est une extension Chromium Manifest V3. Elle fonctionne localement, sans compte Math Curator, sans service d’analyse distant et sans clé API à configurer.

## Fonctionnalités

- Choisir un niveau et des domaines mathématiques.
- Régler l’intensité du filtrage : **Exploration**, **Équilibré** ou **Strict**.
- Masquer les Shorts et certaines distractions.
- Autoriser ou bloquer des chaînes.
- Consulter les indices textuels utilisés pour classer une vidéo.
- Enregistrer des vidéos dans les favoris et les retrouver dans les options.
- Désactiver le filtrage pour réafficher les éléments masqués.

**Les indices reposent sur les titres et les métadonnées visibles. Ils ne vérifient ni les démonstrations, ni l’exactitude scientifique, ni la qualité pédagogique d’un cours.**

## État de cette branche

Cette branche prépare un **candidat de publication**, sans nouvelle release officielle.

Le code de l’extension provient du commit :

```text
d762095dfbf9c6b716acf6a75d903a1b8f5e79f8
```

Le manifeste conserve la version `1.0.0`. Une [release historique v1.0.0](https://github.com/seblenonsaint/math-curator-community/releases/tag/v1.0.0) existe déjà : elle ne doit pas être confondue avec ce candidat.

Le nom `math-curator-community-v1.0.0-rc1.zip` identifie le candidat préparé. Le numéro de la prochaine publication officielle reste à décider.

## Installation du candidat

1. Ouvrez l’[exécution de vérification du candidat](https://github.com/seblenonsaint/math-curator-community/actions/runs/39017831501).
2. Dans **Artifacts**, téléchargez `math-curator-rc1-package-evidence`. GitHub peut demander une connexion pour télécharger cet artefact.
3. Décompressez l’artefact, puis l’archive `release-candidate/math-curator-community-v1.0.0-rc1.zip` qu’il contient.
4. Conservez le dossier extrait dans un emplacement permanent. Il doit contenir directement `manifest.json` et le dossier `src`.
5. Ouvrez `chrome://extensions/`.
6. Activez le **mode développeur**.
7. Cliquez sur **Charger l’extension non empaquetée** et sélectionnez le dossier contenant `manifest.json`.

Les artefacts de cette exécution sont conservés **sept jours**. S’ils ne sont plus disponibles, le candidat peut être reconstruit depuis un clone du dépôt :

```bash
git switch agent/prepublication-v1-rc1-20261017
python3 release-tools/build_rc.py
```

Le script nécessite Python 3, Git et la présence du commit source dans l’historique local. Il produit l’archive dans `release-candidate/`.

**SHA-256 du ZIP candidat :**

```text
f2a681f6abd7e161c0aa48ee41e50c0531feb13c157623cf5689255feb37a396
```

L’ancienne archive `math-curator-community-v1.zip` du dépôt n’est pas le livrable de cette recette.

## Utilisation

### Activer et régler le filtrage

Ouvrez YouTube, puis la popup de l’extension. Le filtrage est **désactivé par défaut**.

Activez **Filtrage actif**, puis choisissez l’intensité, le niveau et le seuil indicatif. Les cases permettent de masquer les Shorts et d’afficher les indices.

Le bouton **Domaines et favoris** ouvre les options. Vous pouvez y choisir les domaines et saisir un nom de chaîne par ligne dans les listes d’autorisation ou de blocage. Cliquez sur **Enregistrer les listes** pour les appliquer.

### Tout réafficher

Décochez **Filtrage actif** ou cliquez sur **Tout réafficher** dans la popup.

### Enregistrer un favori

1. Activez le filtrage et **Afficher les indices**.
2. Sur une vidéo qui reste visible, cliquez sur son badge **Math Curator**.
3. Dans la fenêtre de détails, cliquez sur **Enregistrer**.
4. Attendez l’accusé **Enregistrée**.
5. Retrouvez la vidéo dans **Domaines et favoris**.

Une vidéo masquée ne propose pas de badge accessible. Les options permettent de retirer un favori ou de tous les effacer.

## Données et confidentialité

Les préférences et les favoris sont conservés dans le stockage local de l’extension. Leur persistance après fermeture complète et relancement du navigateur a été vérifiée.

L’extension ne transmet pas les contenus analysés à un service distant. YouTube conserve son fonctionnement réseau habituel.

Aucune synchronisation entre appareils n’est proposée. La désinstallation, le changement de profil et la conservation des données dans ces situations ne sont pas couverts par la recette.

## Vérifications réalisées

Les scénarios suivants ont réussi dans **Chromium 141.0.7390.37 sous Ubuntu, sandbox active**, sans compte Google :

| Scénario | Résultat |
| --- | --- |
| Chargement MV3, popup et options | Validé |
| Préférences conservées après redémarrage | Validé |
| Masquage d’un résultat vidéo réel puis réapparition du même élément | Validé |
| Ajout d’un favori réel, contrôle des métadonnées et conservation après redémarrage | Validé |
| Chargement du ZIP extrait et sauvegarde d’une préférence | Validé |

Preuves :

- [Filtrage réel et réversibilité](https://github.com/seblenonsaint/math-curator-community/actions/runs/39016636655) — ces scénarios réussissent ; l’exécution globale échoue sur un favori alors bloqué.
- [Recette ciblée des favoris réussie](https://github.com/seblenonsaint/math-curator-community/actions/runs/39017409363).
- [Construction reproductible et contrôle du ZIP extrait réussis](https://github.com/seblenonsaint/math-curator-community/actions/runs/39017831501).

Les contrôles existants Node.js, Playwright MV3, Gitleaks et YouTube simulé sont également rattachés au commit de référence. Ces validations concernent les scénarios exécutés et ne constituent pas une certification exhaustive.

## Limites connues

- Le filtrage peut masquer une vidéo pertinente ou conserver une vidéo hors sujet.
- Les changements du DOM ou les restrictions de YouTube peuvent affecter le fonctionnement.
- Firefox, les navigateurs mobiles et la distribution Chrome Web Store ne sont pas validés.
- Le ZIP contient uniquement l’extension : les prototypes desktop, Knowledge Curator et les outils serveur YouTube Data API en sont exclus.
- Aucun défaut applicatif bloquant n’a été démontré dans le périmètre contrôlé.

## Publication et licence

La préparation du candidat est terminée avec un **GO sous réserves** : choix du prochain numéro de version, clarification de la licence et approbation du périmètre d’intégration.

Aucun fichier de licence explicite n’a été trouvé dans le commit candidat. Cette documentation n’accorde pas de droits de réutilisation supplémentaires et ne remplace pas une licence.

Aucune fusion, aucun tag et aucune nouvelle release n’ont été effectués dans le cadre de cette préparation.

## Signaler un problème

[Ouvrir un signalement](https://github.com/seblenonsaint/math-curator-community/issues/new/choose) en précisant la version du navigateur, la page concernée, les réglages utilisés et les étapes de reproduction. Évitez de joindre des informations personnelles.

[Contribuer](CONTRIBUTING.md) · [Historique des versions](https://github.com/seblenonsaint/math-curator-community/releases)
