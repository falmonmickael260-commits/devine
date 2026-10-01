# DEVINE — contexte pour Claude Code

Jeu d'équipes en ligne, style « soirée » : 3 manches avec les MÊMES cartes
(1. Description, 2. Un seul mot, 3. Dessin). 4 à 8 joueurs, 2 équipes, 60 s par tour.
Jeu MOBILE d'abord, joué par un lien (navigateur). Une app Expo viendra plus tard.

## Commandes
- `npm install` puis `npm start` → jeu + serveur sur http://localhost:3000
- `npm test` → 25 tests (moteur + vraie partie à 4 clients Socket.IO) : doivent toujours passer
- `npm run simulate -- 4 mix` → partie simulée en console
- `npm run build:demo` → `dist/devine-demo.html` : version en un seul fichier, sans serveur
  (vrai moteur dans le navigateur, autres joueurs simulés)

## Architecture
- `src/engine/` : moteur pur (règles, paquet verrouillé, ordre A1→B1→A2→B2, chrono, scores, dessin)
- `src/multiplayer/` : salons privés + Socket.IO. Le serveur est la source de vérité ;
  la carte active n'est envoyée qu'au joueur actif.
- `src/data/cards/` : 400 cartes (80 par catégorie). Ajouter les cartes EN FIN de liste.
- `client/` : interface web sans framework ni compilation (modules JS natifs + CSS).
  - `client/css/tokens.css` : TOUTE l'identité visuelle (couleurs, polices, tailles)
  - `client/js/screens/` : un fichier par écran (menu, create, join, lobby, game)
  - `client/js/core/net.js` : réseau ; remplacé par `client/demo/net.demo.js` dans la démo
  - `client/images/categories/` : photos facultatives des catégories (voir LISEZMOI)
- Protocole réseau détaillé : README.md

## Règles de travail
- Code propre et commenté EN FRANÇAIS, facile à modifier.
- Mobile d'abord : vérifier chaque écran sur 320×568, 375×667, 390×844, 430×932,
  844×390 (paysage), 768×1024 et ordinateur. Aucun débordement horizontal,
  boutons et chrono toujours visibles, gros boutons tactiles.
- Direction artistique : jeu vidéo premium façon plateau télé (fond sombre profond,
  lumières, rayons, podium, particules), boutons épais avec contour encre,
  logo doré à relief. Pas de look « site web avec des boutons ».
- Pas de personnages protégés (Disney…) ni de photos de célébrités dans les visuels.
- Ne jamais envoyer la base de cartes au client (anti-triche).

## État d'avancement (ordre du cahier des charges)
1. Menu ✅  2. Créer ✅  3. Rejoindre ✅  4. Lobby ✅  5. Choix de catégorie ✅
6. Écran de jeu manche 1 ⏳ (l'écran actuel `client/js/screens/game.js` est PROVISOIRE)
7. Manche 2  8. Écran de dessin manche 3  9. Transitions  10. Scores  11. Écran de fin
12. Animations et finitions

## Questions ouvertes
- 80 cartes par catégorie = 5 joueurs max (sauf Mix). Proposition : passer à 120 par catégorie.
- Illustrations des cartes : une bibliothèque d'illustrations par thème (champ `illustration` à ajouter).
