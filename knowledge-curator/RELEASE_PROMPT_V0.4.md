# PROMPT DE LIVRAISON — KNOWLEDGE CURATOR V0.4

## Mission
Geler l'agent Ollama V0.5 comme outil d'expérimentation, sans lui donner de droit d'écriture. Développer dans Knowledge Curator un historique local et visible des tentatives, puis vérifier les compétences sur plusieurs exercices indépendants.

## Invariants
- Préserver Math Curator Community 1.0 et les autres branches.
- Respecter l'historique des tentatives existantes ; ne pas l'écraser lors d'une nouvelle réponse.
- Ne jamais déclarer une maîtrise provisoire après une seule réponse correcte.
- Garder une progression consultable sans compte et sans service externe.
- Ne jamais confondre tests logiciels réussis et validation scientifique de l'efficacité pédagogique.

## Critères d'acceptation
1. Les sept compétences ont chacune trois exercices différents.
2. Le calcul de maîtrise exige une réussite récente sur chaque identifiant d'exercice.
3. Une mauvaise réponse ultérieure retire la maîtrise provisoire concernée.
4. L'historique visible montre les trente dernières tentatives et les précédentes restent en stockage.
5. Un rafraîchissement de la page n'efface pas l'historique.
6. Les tests couvrent le rejet des dates invalides, la non-perte des tentatives et l'évaluation multi-exercices.
7. Le mode Ollama reste consultatif, figé en V0.5, sans écriture automatique ni dépense API.

## Limites
La vérification de trois réponses sur des exercices fixes n'est pas une preuve de rétention à long terme : répétition, indices, révision différée et tâches de transfert devront être étudiés ultérieurement. Les imports et exports demandent des tests supplémentaires pour garantir leur comportement avec les versions précédentes.
