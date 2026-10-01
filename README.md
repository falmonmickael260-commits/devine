# DEVINE — Jeu en ligne (moteur + serveur + interface web)

- **Phase 1 (terminée)** : moteur de jeu, règles, cartes, salons privés, temps réel.
- **Phase 2 (en cours)** : interface web jouable par lien. Étapes 1 à 5 terminées (menu, créer, rejoindre, lobby, choix de catégorie). L'écran de jeu actuel est provisoire (étape 6 à venir).

## Démarrage rapide

```bash
npm install
npm test                          # 25 tests (moteur + vraie partie à 4 clients Socket.IO)
npm run simulate                  # partie complète simulée en console (4 joueurs, Mix)
npm run simulate -- 8 mix 1234    # 8 joueurs, Mix, graine 1234
npm start                         # jeu + serveur sur http://localhost:3000 (GET /health)
```

Version démo en un seul fichier (sans serveur, autres joueurs simulés, vrai moteur dans le navigateur) : `npm run build:demo` → `dist/devine-demo.html`.

Photos des catégories : déposer `personnalites.jpg`, `films_series.jpg`, `sport.jpg`, `disney.jpg`, `mix.jpg` dans `client/images/categories/` (voir le LISEZMOI du dossier). Sans photo, l'illustration s'affiche.

Pour tester à plusieurs sur le même Wi-Fi : ouvrir `http://<ip-de-ton-ordinateur>:3000` sur chaque téléphone. Pour jouer en ligne depuis n'importe où : déployer le dossier sur un hébergeur Node qui accepte les WebSockets (Render, Railway, Fly.io…), commande de démarrage `npm start`.

## Interface web (dossier `client/`)

Servie par le même serveur que le jeu, sans étape de compilation (JavaScript natif en modules, CSS pur).

```
client/
├── index.html            Page unique + couches du décor
├── fonts/                Unbounded (titres) et Bricolage Grotesque (texte), auto-hébergées, licence OFL
├── css/
│   ├── tokens.css        ← identité visuelle : couleurs, polices, tailles, durées (tout se règle ici)
│   ├── base.css          Reset, accessibilité
│   ├── stage.css         Décor du plateau (halos, arche LED, projecteurs, sol, particules)
│   ├── components.css    Boutons, logo, tuiles de code, panneaux joueurs, cartes de catégorie…
│   └── screens.css       Mise en page des écrans (mobile d'abord)
└── js/
    ├── main.js           Démarrage + choix de l'écran selon l'état du serveur
    ├── stage.js          Animation du décor (en pause si l'onglet est caché)
    ├── core/             Réseau, état, routeur d'écrans, sons synthétisés, stockage, session
    ├── ui/               Logo, icônes, tuiles de code, visuels de catégorie (photo ou illustration), messages, fenêtres
    ├── art/categories.js Illustrations vectorielles originales des 5 catégories
    └── screens/          menu, create, join, lobby, game (provisoire)
```

Fonctionnement : le client n'envoie que des actions ; à chaque changement le serveur renvoie l'état, et `main.js` affiche l'écran correspondant (lobby, jeu) puis le met à jour. La session (code + jeton) est gardée dans le navigateur : un rechargement ou une coupure ramène automatiquement dans la partie. Lien d'invitation : `/?code=X7K9P`.

Variables d'environnement : `PORT`, `CORS_ORIGIN`. Node ≥ 18.17.

## Architecture

```
src/
├── config/rules.js          Règles centralisées (15 cartes/joueur, 60 s, 4–8 joueurs…) + définition des 3 manches
├── data/cards/              Base de 400 cartes (80 par catégorie) — un fichier par catégorie
├── engine/                  MOTEUR PUR (aucune dépendance réseau, testable seul)
│   ├── deck.js              Sélection du paquet (sans doublon, verrouillé pour la partie, Mix équilibré)
│   ├── roundPile.js         Pile d'une manche : trouvée = retirée, passée = remise en fin de pile
│   ├── teams.js             Répartition automatique / manuelle des équipes
│   ├── turnOrder.js         Ordre A1 → B1 → A2 → B2 (alternance stricte entre équipes)
│   ├── timer.js / clock.js  Chrono de tour (horodatage absolu) + horloge simulable pour les tests
│   ├── drawing.js           Tableau de dessin (manche 3) : traits, gomme, annuler/rétablir, effacer
│   ├── scoring.js           Scores par manche, stats joueurs, résultats finaux
│   ├── game.js              Orchestrateur d'une partie (3 manches)
│   └── errors.js            Codes d'erreur + messages français
└── multiplayer/             COUCHE RÉSEAU (Socket.IO)
    ├── roomCodes.js         Codes de partie (5 caractères, sans I/L/O/0/1)
    ├── room.js              Salon privé : lobby, hôte, catégorie, lancement, revanche
    ├── roomManager.js       Registre des salons
    └── socketServer.js      Protocole temps réel
```

Principe clé : **le serveur est la source de vérité**. Le client n'envoie que des intentions (« trouvé », « passer », un trait de dessin) ; le serveur valide, applique et renvoie à chaque joueur *sa* vue de l'état.

## Règles implémentées

**Paquet.** 15 cartes × nombre de joueurs, tirées au lancement, sans doublon, gelées. Les 3 manches repartent toujours de ce même paquet : aucune carte n'est jamais ajoutée ou remplacée.

**Manche.** Une carte trouvée est retirée pour la manche ; une carte passée retourne en fin de pile. Au début de chaque tour, la pile restante est re-mélangée (en évitant de redonner tout de suite la carte sur laquelle le joueur précédent a fini). La manche se termine quand la pile est vide, les points sont enregistrés, puis la manche suivante démarre avec le paquet complet après une pause récapitulative de 8 s (`roundTransitionMs`, ou `null` pour un passage manuel par l'hôte).

**Ordre des tours.** A1 → B1 → A2 → B2 → A1… Avec des équipes inégales (5 ou 7 joueurs), l'alternance A/B est conservée et chaque équipe fait tourner ses propres joueurs. Les joueurs déconnectés sont sautés. Par défaut la rotation continue d'une manche à l'autre (option `restartTurnOrderEachRound`).

**Chrono.** 60 s par tour, porté par le serveur via un horodatage `endsAt`. À 0 : fin de tour automatique, joueur suivant immédiatement. Une action reçue après `endsAt` est refusée (`TURN_OVER`).

**Manches.** 1 Description, 2 Un seul mot, 3 Dessin (dessin activé uniquement en manche 3). Le moteur ne peut pas vérifier oralement le respect de la consigne : c'est le joueur actif qui valide TROUVÉ.

**Score.** 1 point par carte trouvée pour l'équipe du joueur actif. Résultats finaux : total et détail par manche, classement, égalité éventuelle, stats par joueur, meilleur tour, meilleur faiseur-deviner, liste des cartes.

## Cartes

| Catégorie | id | Facile | Moyen | Difficile |
|---|---|---|---|---|
| 👤 Personnalités | `personnalites` | 30 | 30 | 20 |
| 🎬 Films & Séries | `films_series` | 30 | 35 | 15 |
| ⚽ Sport | `sport` | 30 | 38 | 12 |
| 🏰 Disney | `disney` | 30 | 30 | 20 |
| 🎲 Mix | `mix` | 18 | 36 | 26 |

Format : `{ id: "pers_001", category: "personnalites", title: "Michael Jackson", difficulty: "facile" }` (+ `theme` pour Mix).
Mix = 80 cartes exclusives (20 par thème) **plus** les cartes des 4 autres catégories ; le tirage se fait en tourniquet par thème pour rester équilibré.

Pour ajouter des cartes : les ajouter **en fin de liste** dans le fichier de la catégorie (les ids restent stables).

⚠️ **Limite actuelle** : 80 cartes ÷ 15 = **5 joueurs maximum** pour Personnalités, Films & Séries, Sport et Disney. Le lobby l'indique (`maxPlayers` par catégorie, blocage `NOT_ENOUGH_CARDS`). Mix supporte 8 joueurs et plus.

## Protocole réseau (Socket.IO)

Toutes les requêtes client prennent un accusé de réception :

```js
socket.emit('game:found', {}, (res) => {
  if (!res.ok) afficherErreur(res.error.message); // res.error = { code, message }
});
```

### Client → serveur

| Événement | Payload | Qui | Réponse |
|---|---|---|---|
| `room:create` | `{ name }` | tous | `{ roomCode, playerId, token }` |
| `room:join` | `{ code, name }` | tous | `{ roomCode, playerId, token }` |
| `room:rejoin` | `{ code, token }` | tous | `{ roomCode, playerId }` |
| `room:leave` | – | joueur | – |
| `lobby:set-category` | `{ categoryId }` | hôte | – |
| `lobby:shuffle-teams` | – | hôte | – |
| `lobby:move-player` | `{ playerId, teamId }` | hôte | – |
| `game:start` | – | hôte | – |
| `game:found` | – | joueur actif | – |
| `game:pass` | – | joueur actif | – |
| `game:next-round` | – | hôte (mode manuel) | – |
| `game:rematch` | – | hôte | – |
| `draw:action` | `{ action, data }` | joueur actif, manche 3 | `{ cardSeq }` |
| `draw:snapshot` | – | tous | `{ snapshot }` |

Conserver `token` côté client (AsyncStorage) pour `room:rejoin` après une coupure réseau ou un redémarrage d'app.

### Serveur → client

| Événement | Contenu |
|---|---|
| `state` | Vue complète et personnelle : `{ serverNow, you, room, game }`. Envoyée après chaque changement. `game.activeCard` n'est rempli que pour le joueur actif. |
| `game:event` | Événements ponctuels pour animations/sons : `round:start`, `turn:start`, `card:found`, `card:passed`, `turn:end`, `round:end`, `game:end`, `player:connection`. Ne révèle jamais la carte en cours ni une carte passée. |
| `draw` | Action de dessin relayée aux autres joueurs : `{ action, data, cardSeq }`. |
| `draw:snapshot` | Dessin complet, envoyé à la reconnexion. |
| `session:replaced` | Le même joueur s'est reconnecté sur un autre appareil. |
| `game:error` | Erreur si aucune fonction d'ack n'a été fournie. |

## Intégration client (phase 2)

**Chrono synchronisé.** Ne jamais décompter localement depuis 60 : calculer `offset = state.serverNow - Date.now()` à chaque `state`, puis afficher `game.turn.endsAt - (Date.now() + offset)`. Tous les écrans affichent ainsi la même valeur.

**Dessin.** Coordonnées normalisées entre 0 et 1 (`x = 0.5` = milieu) → indépendant de la taille d'écran.
- `stroke:begin` → `{ strokeId, tool: 'pen'|'eraser', color: '#RRGGBB', size: 1–80, points: [[x, y], ...] }`
- `stroke:extend` → `{ strokeId, points }` (paquets de 400 points max, envoyer toutes les ~30–50 ms)
- `stroke:end` → `{ strokeId }` ; `undo`, `redo`, `clear` → `{}`

« Recommencer » = `clear` (lui-même annulable). La palette suggérée est exportée (`DEFAULT_PALETTE`). Le canvas est remis à zéro à chaque nouvelle carte : quand `game.turn.cardSeq` change, vider l'affichage et ignorer tout message `draw` portant un ancien `cardSeq`.

**Anti-triche.** Le client ne doit pas embarquer la base de cartes : il n'affiche que `activeCard` reçue du serveur.

## Choix faits — à valider

1. **Limite de 80 cartes par catégorie** (voir plus haut) : proposition de passer à 120 cartes par catégorie (600 au total) pour jouer à 8 joueurs partout.
2. 2 équipes par défaut (`teamCount` configurable) ; à 5 et 7 joueurs, équipes inégales.
3. Rotation continue entre les manches (le joueur suivant ouvre la nouvelle manche).
4. Pause récapitulative de 8 s entre les manches.
5. Une carte affichée à la fin du chrono retourne dans la pile (pas de point).
6. Seul le joueur actif voit la carte, dans les 3 manches, et c'est lui qui valide TROUVÉ.
7. Joueur actif déconnecté → fin de son tour, il est sauté jusqu'à son retour.
8. JavaScript + JSDoc (migration TypeScript possible sans changer l'architecture).

## Prochaines étapes

- Étape 6 et suivantes : vrai écran de jeu (grande carte illustrée, chrono, animations TROUVÉ/PASSER), manche 2, écran de dessin, transitions, scores, écran de fin.
- Illustrations des cartes : une bibliothèque d'illustrations par thème (pas de personnages protégés ni de vraies personnes).
- Plus tard : application Expo réutilisant le même serveur et le même protocole.
- Plus tard : persistance (Redis) pour redémarrer le serveur sans perdre les parties, plusieurs instances.
