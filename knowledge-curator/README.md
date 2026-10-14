# Knowledge Curator — Fondation expérimentale

Catalogue pédagogique indépendant, orienté vers la compréhension plutôt que le temps passé.

## Périmètre de la première version

- Métadonnées structurées, validation de chaque entrée et critères publics.
- Trois disciplines initiales : mathématiques, physique et histoire.
- Évaluation séparée de la fiabilité, de la pédagogie et de l'adéquation au public.
- Les neuf ressources pilotes sont référencées à partir de pages officielles, mais restent **non évaluées** : aucune note n'est inventée.
- L'URL de la ressource est un lien externe HTTPS ; aucune vidéo n'est téléchargée ni redistribuée.

## Utilisation

Depuis `knowledge-curator/` :

```bash
node --test tests/catalog.test.cjs
node cli.cjs list
node cli.cjs list mathematics
```

Pour l'interface web, depuis le dossier `knowledge-curator/` :

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Ouvrir ensuite `http://localhost:8765` dans le navigateur. Le serveur doit rester ouvert pendant la consultation. Le catalogue est local et ne nécessite pas de compte.

Node.js 20 ou ultérieur conseillé. Aucun compte ni service distant requis pour cette démonstration.

## Modèle de gouvernance

Un score numérique seul ne démontre pas la qualité d'un cours. Les évaluations doivent contenir une justification, une date, le nom ou l'identifiant de l'évaluateur et les limites observées. L'avis d'un spécialiste reste souhaitable avant une recommandation affirmant une validité scientifique.

## Prochaines étapes

1. Constituer une première sélection réelle et sourcée.
2. Organiser les concepts en parcours avec prérequis.
3. Créer une interface web accessible.
4. Expérimenter une évaluation de l'apprentissage et non du visionnage.

Ce dossier est indépendant de `src/` et `desktop/` : il ne modifie pas le fonctionnement de Math Curator.
