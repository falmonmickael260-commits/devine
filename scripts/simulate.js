/**
 * Simulation d'une partie complète dans la console (sans réseau, sans interface).
 *
 *   npm run simulate                       → 4 joueurs, catégorie Mix
 *   npm run simulate -- 5 sport 1234       → 5 joueurs, Sport, graine 1234
 *
 * Les « bots » trouvent une carte toutes les ~5 à 10 secondes simulées,
 * et passent parfois. Le temps est simulé : la partie dure < 1 seconde.
 */
import { Game, GAME_STATUS } from '../src/engine/game.js';
import { buildDeck } from '../src/engine/deck.js';
import { FakeClock } from '../src/engine/clock.js';
import { resolveRules } from '../src/config/rules.js';
import { createSeededRng } from '../src/engine/utils/random.js';
import { CATEGORIES } from '../src/data/cards/index.js';

const playerCount = Number(process.argv[2] ?? 4);
const categoryId = process.argv[3] ?? 'mix';
const seed = Number(process.argv[4] ?? Date.now() % 100_000);

const NAMES = ['Alice', 'Bruno', 'Chloé', 'David', 'Emma', 'Farid', 'Gaëlle', 'Hugo'];
const rules = resolveRules({ roundTransitionMs: 8_000 });
const clock = new FakeClock();
const rng = createSeededRng(seed);

const players = NAMES.slice(0, playerCount).map((name, i) => ({ id: `p${i + 1}`, name }));
const nameOf = (id) => players.find((p) => p.id === id).name;
const category = CATEGORIES.find((c) => c.id === categoryId);

// Paquet : on affiche une erreur lisible si la catégorie n'a pas assez de cartes
// (ex. 6 joueurs × 15 = 90 cartes > 80 disponibles dans une catégorie simple).
let deck;
try {
  deck = buildDeck({ categoryId, playerCount, rules, rng });
} catch (error) {
  console.error(`❌ ${error.message}`, error.details ?? '');
  process.exit(1);
}
const game = new Game({ players, deck, rules, clock, rng });

const time = () => `${String(Math.floor(clock.now() / 1000)).padStart(4)}s`;

game.on('event', (event) => {
  switch (event.type) {
    case 'round:start':
      console.log(`\n══════ MANCHE ${event.roundNumber} — ${event.label.toUpperCase()} ══════`);
      break;
    case 'turn:start':
      console.log(`${time()} ▶ ${event.slotLabel} ${nameOf(event.playerId)} (équipe ${event.teamId})`);
      break;
    case 'card:found':
      console.log(`${time()}    ✅ « ${event.card.title} » — reste ${event.cardsRemaining}`);
      break;
    case 'card:passed':
      console.log(`${time()}    ⏭  carte passée`);
      break;
    case 'turn:end':
      console.log(`${time()}    ⏱  fin du tour (${event.reason}) : ${event.foundCount} trouvée(s)`);
      break;
    case 'round:end':
      console.log(`\n   Scores après la manche ${event.roundNumber} :`,
        event.scores.map((s) => `${s.teamId} ${s.total} pts`).join(' | '));
      break;
    default:
  }
});

console.log(`DEVINE — simulation : ${playerCount} joueurs, ${category.emoji} ${category.label}, ${deck.length} cartes (graine ${seed})`);
for (const team of game.teams) {
  console.log(`  ${team.name} : ${team.playerIds.map(nameOf).join(', ')}`);
}

game.start();

// Boucle de simulation : chaque seconde simulée, le joueur actif a une chance d'agir.
while (game.status !== GAME_STATUS.FINISHED) {
  clock.advance(1_000);
  if (game.status !== GAME_STATUS.PLAYING || !game.activePlayerId) continue;
  const roll = rng();
  if (roll < 0.14) game.markFound(game.activePlayerId);
  else if (roll < 0.17) game.passCard(game.activePlayerId);
}

const { results } = game;
console.log('\n══════ FIN DE PARTIE ══════');
for (const team of results.ranking) {
  console.log(`  ${team.name} : ${team.total} pts (manches : ${team.roundScores.join(' / ')})`);
}
console.log(results.isDraw ? '  🤝 Égalité !' : `  🏆 Victoire : ${results.ranking[0].name}`);
console.log(`  Tours joués : ${results.totals.turns} — cartes passées : ${results.totals.passes}`);
if (results.highlights.bestTurn) {
  const { name, cardsFound, roundNumber } = results.highlights.bestTurn;
  console.log(`  Meilleur tour : ${name}, ${cardsFound} cartes (manche ${roundNumber})`);
}
