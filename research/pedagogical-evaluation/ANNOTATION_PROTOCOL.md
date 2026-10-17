# Protocole d'annotation pédagogique — v1 (pré-enregistré)

## Statut et objectif

**Protocole proposé, aucune nouvelle annotation effectuée.** L'objectif est d'évaluer la pertinence mathématique et l'adéquation pédagogique des vidéos, sans prétendre vérifier leur exactitude à partir des seuls titres.

## Unité d'observation et sources

Une unité = une vidéo YouTube identifiable par un ID unique de 11 caractères. Enregistrer URL, titre, chaîne, langue déclarée et vérifiée, durée, date de collecte, disponibilité, provenance des métadonnées et niveau de preuve (titre seul / titre + description / visionnage / transcription consultée). Ne pas reproduire de transcriptions intégrales.

Les données antérieures (10 vidéos positives, 3 négatives réelles provisoires, 14 exemples textuels synthétiques) sont **réservées au développement** : elles ne constituent pas un test indépendant.

## Plan de collecte initial (objectif, pas échantillon existant)

120 vidéos réelles : 60 candidates mathématiques, 30 hors sujet et 30 ambiguës. Échantillonnage par quotas de domaine (12 domaines), niveau (débutant/intermédiaire/avancé), langue et format. Répartir les 60 positives à raison d'au moins 5 candidates par domaine, puis équilibrer les niveaux dans la mesure possible. Conserver les quotas non remplis comme lacunes explicites. Les quotas artificiels ne donnent pas une estimation représentative de la prévalence réelle sur YouTube.

Éviter les doublons, les playlists non identifiables, les vidéos privées et les exemples déjà employés pour modifier le moteur. Enregistrer les raisons d'exclusion. Fixer les critères avant collecte et garder un ensemble final gelé, non utilisé pour optimiser les règles.

## Variables annotées

- `relevance` : `relevant`, `irrelevant`, `uncertain`. Est pertinente une vidéo dont l'objectif principal est l'apprentissage d'une notion mathématique, pas la seule présence d'un mot-clé.
- `domains` : liste parmi les douze clés de `MathConfig.DOMAINS`; multi-étiquette autorisée.
- `level` : `beginner`, `intermediate`, `advanced`, `unknown`; niveau cible estimé, pas niveau du spectateur.
- `format` : `lesson`, `exercise`, `proof`, `intuition`, `other`, `unknown`.
- `pedagogical_suitability` : `suitable`, `unsuitable`, `uncertain`, à définir pour un public et un objectif explicités ; non inférable automatiquement du titre.
- `mathematical_correctness` : `verified`, `issues_found`, `not_assessed` ; `verified` exige une revue mathématique de passages pertinents et une justification.
- `confidence` : `low`, `medium`, `high`, plus justification courte et références aux preuves consultées.

## Double annotation et arbitrage

Deux annotateurs indépendants sur au moins 30 vidéos (25 %), sans accès aux prédictions du moteur. Annoter d'abord séparément, puis mesurer accord brut et Cohen kappa pour pertinence, avec matrice des désaccords. Si les catégories sont très déséquilibrées, compléter par un indicateur robuste à la prévalence et examiner les désaccords plutôt que s'en tenir à un coefficient.

Arbitrage documenté par un tiers compétent ou discussion contradictoire avec conservation des étiquettes initiales. Sans second annotateur humain, déclarer l'absence de double annotation et ne pas qualifier les labels d'indépendamment validés.

## Plan d'analyse pré-spécifié

Sur le corpus final tenu à l'écart du développement : TP, FP, TN, FN, précision, rappel, F1, spécificité, taux d'abstention et matrice de confusion. Définir avant mesure si `unknown` est abstention ou erreur selon la question étudiée. Fournir effectifs et intervalles de confiance adaptés (Wilson pour proportions binaires), sans surinterpréter les petites strates.

Comparer titre seul, titre + extrait, et baseline lexicale simple sur exactement les mêmes vidéos et la même politique d'abstention. Ne pas utiliser les étiquettes finales pour ajuster les règles. Publier les performances par domaine et niveau seulement avec les effectifs correspondants.

## Critères de passage et limites

Le passage à une amélioration du classificateur exige : corpus traçable, schéma validé, labels indépendants suffisants, politique d'abstention définie, baseline reproductible, et absence de régression importante sur les cas difficiles. Aucun objectif numérique de performance ne doit être annoncé sans justification de l'usage et du coût des faux positifs/faux négatifs.

Le score du moteur reste un indice de métadonnées, non une note de vérité mathématique. Aucun accès à des données personnelles, aucune requête API avec secret et aucune modification du moteur de production.
