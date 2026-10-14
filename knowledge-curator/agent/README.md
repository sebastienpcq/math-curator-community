# Agent local V0.2 — Knowledge Curator

Cet agent utilise uniquement Ollama sur `127.0.0.1:11434`, sans API payante. Il **ne modifie jamais les sources** et n'exécute pas le contenu généré.

## Changements par rapport à V0.1

- Une tâche précise et un seul extrait de fichier (2 800 caractères maximum) par cycle.
- Réponse JSON obligatoire, comportant objectif, fichier, changement, test et risque.
- Contrôles de forme avant conservation de la proposition (pas de garantie de justesse technique).
- Affichage de l'avancement, délai maximal configurable et rapport même après interruption.
- Trois cycles maximum par lancement.

## Sur Chromebook

Depuis le clone Git `~/knowledge-v03` :

```bash
git pull origin feature/knowledge-curator-v0.3
python3 knowledge-curator/agent/local_agent.py --model qwen2.5-coder:0.5b --iterations 1
```

Les rapports sont enregistrés sous `knowledge-curator/agent-reports/`, qui est ignoré par Git. Si l'agent refuse de démarrer à cause du statut Git, vérifier `git status --short` et préserver les modifications utiles.

Le modèle 0.5B peut proposer des changements incorrects même si le JSON est valide. Ne pas appliquer le résultat sans revue. Pour comparer V0.1 et V0.2, examiner les rapports des deux exécutions.

## Limites

Il ne s'agit pas encore d'une boucle capable de coder, corriger et vérifier seule. Une autonomie accrue demandera un environnement isolé et des tests plus complets.

## Diagnostics V0.4

L'agent effectue au maximum deux tentatives par cycle. Si une proposition est rejetée, sa réponse brute est enregistrée localement dans `agent-reports/` au format texte pour diagnostic ; **ne publiez pas ce dossier** et vérifiez qu'il ne contient pas de secrets avant de partager un rapport. La seconde tentative utilise une consigne réduite. La limite de génération est de 450 tokens. Une proposition acceptée n'est validée que sur sa structure, pas sur sa pertinence scientifique ou technique.

Commande : `python3 knowledge-curator/agent/local_agent.py --model qwen2.5-coder:0.5b --iterations 1`.
