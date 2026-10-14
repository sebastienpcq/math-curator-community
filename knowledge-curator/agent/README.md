# Agent local expérimental (gratuit)

Cet outil interroge **uniquement Ollama installé localement**, propose jusqu'à cinq améliorations successives, et produit un fichier Markdown non approuvé. **Il ne modifie jamais les sources, ne lance jamais le code généré et ne publie rien sur GitHub.** Ce n'est pas encore un agent de codage entièrement autonome.

## Préparer le Chromebook (Linux)

Vérifier Node.js, Python 3 et Ollama. Installer Ollama selon la documentation officielle si nécessaire, puis télécharger un modèle compatible avec la mémoire disponible, par exemple :

```bash
ollama pull qwen2.5-coder:3b
```

Le modèle utilise de l'espace disque, de la RAM et du calcul local. Sur un Chromebook peu puissant, il peut être lent ou impossible à charger.

## Exécution

Depuis la racine du clone de la branche `feature/knowledge-curator-v0.3`, avec Ollama lancé :

```bash
python3 knowledge-curator/agent/local_agent.py --iterations 1
```

Les propositions sont enregistrées dans `knowledge-curator/agent-reports/`, dossier ignoré par Git. Ne pas considérer le texte généré comme fiable sans revue humaine.

## Sécurité

- URL Ollama limitée à `127.0.0.1:11434`.
- Aucune clé API requise.
- Aucune écriture de code et aucune commande issue du modèle exécutée.
- Refus de démarrer si le dépôt a des modifications en attente.
- Tests avant chaque proposition ; arrêt en cas d'échec.
- L'agent lit certains fichiers du dépôt : ne jamais y placer de mots de passe ou de clés.

Une boucle de codage autonome réelle demanderait une sandbox isolée, un mécanisme d'application de patches, des tests d'intégration et une revue des modifications avant publication.
