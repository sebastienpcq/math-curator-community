# Math Curator Desktop — prototype expérimental

Ce prototype **ne filtre pas encore** YouTube dans sa fenêtre intégrée. Il permet de tester deux modes : ouverture dans le navigateur habituel (où l'extension doit être installée pour filtrer), ou ouverture dans une fenêtre Electron isolée (sans filtrage).

## Lancer localement

Prérequis : Node.js et npm. Depuis `desktop/` :

```sh
npm install
npm start
```

L'installation téléchargera Electron. Aucune application Windows/Linux prête à installer n'est encore publiée. Sur Chromebook, le lancement peut être possible via l'environnement Linux, selon le modèle et la configuration.

## Sécurité

La fenêtre YouTube utilise `sandbox: true`, `contextIsolation: true` et `nodeIntegration: false`. Le processus de rendu distant n'a pas accès à l'API IPC de l'application. Le filtrage demandera une intégration distincte soigneusement testée.

## Prochaines étapes

1. Isoler et tester les fonctions de classement et les préférences dans un module commun.
2. Adapter le filtrage au contenu rendu dans la fenêtre intégrée sans exposer Node à la page distante.
3. Mettre en place des tests d'intégration et construire des paquets Windows/Linux.
4. Documenter les limites de compatibilité Chromebook.
