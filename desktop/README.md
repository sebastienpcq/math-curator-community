# Math Curator Desktop — prototype expérimental

La version expérimentale 0.2 propose deux modes : ouverture dans le navigateur habituel (où l'extension doit être installée pour filtrer), ou ouverture dans une fenêtre Electron avec un **premier filtrage des recommandations** fondé sur le moteur de règles existant et le masquage des Shorts. Les paramètres sont encore fixes (débutant, équilibré), sans interface de configuration. Le classement ne vérifie pas la qualité mathématique du contenu.

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
