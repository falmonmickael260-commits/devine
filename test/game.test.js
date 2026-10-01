/**
 * Tests du moteur de jeu, sans réseau.
 * FakeClock permet de simuler les 60 secondes instantanément.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, GAME_STATUS } from '../src/engine/game.js';
import { TurnOrder } from '../src/engine/turnOrder.js';
import { RoundPile } from '../src/engine/roundPile.js';
import { DrawingBoard } from '../src/engine/drawing.js';
import { buildDeck } from '../src/engine/deck.js';
import { FakeClock } from '../src/engine/clock.js';
import { resolveRules } from '../src/config/rules.js';
import { createSeededRng } from '../src/engine/utils/random.js';
import { ERR } from '../src/engine/errors.js';

const SECOND = 1000;

/** Crée une partie à 4 joueurs : A = [a1, a2], B = [b1, b2]. */
function createGame(ruleOverrides = {}) {
  const rules = resolveRules({ roundTransitionMs: null, ...ruleOverrides });
  const clock = new FakeClock();
  const rng = createSeededRng(42);
  const players = ['a1', 'b1', 'a2', 'b2'].map((id) => ({ id, name: id.toUpperCase() }));
  const teams = [
    { id: 'A', name: 'Équipe A', playerIds: ['a1', 'a2'] },
    { id: 'B', name: 'Équipe B', playerIds: ['b1', 'b2'] },
  ];
  const deck = buildDeck({ categoryId: 'personnalites', playerCount: 4, rules, rng });
  const game = new Game({ players, teams, deck, rules, clock, rng });
  const events = [];
  game.on('event', (event) => events.push(event));
  return { game, clock, deck, events, rules };
}

/** Le joueur actif trouve `count` cartes (ou toutes celles qui restent). */
function findCards(game, count = Infinity) {
  let found = 0;
  while (found < count && game.status === GAME_STATUS.PLAYING) {
    const before = game.getPublicState().round.index;
    game.markFound(game.activePlayerId);
    found += 1;
    if (game.getPublicState().round?.index !== before || game.status !== GAME_STATUS.PLAYING) break;
  }
  return found;
}

test('ordre des tours A1 → B1 → A2 → B2 → A1 (jamais A1 → A2)', () => {
  const { game, clock } = createGame();
  game.start();
  const sequence = [];
  for (let i = 0; i < 8; i++) {
    sequence.push(game.getPublicState().turn.slotLabel);
    clock.advance(60 * SECOND); // chrono à 0 → joueur suivant
  }
  assert.deepEqual(sequence, ['A1', 'B1', 'A2', 'B2', 'A1', 'B1', 'A2', 'B2']);
});

test('ordre avec équipes inégales (5 joueurs) : A1 B1 A2 B2 A3 B1 A1 B2', () => {
  const order = new TurnOrder([
    { id: 'A', playerIds: ['a1', 'a2', 'a3'] },
    { id: 'B', playerIds: ['b1', 'b2'] },
  ]);
  const labels = order.preview(8).map((slot) => slot.slotLabel);
  assert.deepEqual(labels, ['A1', 'B1', 'A2', 'B2', 'A3', 'B1', 'A1', 'B2']);
});

test('chrono : le tour se termine exactement à 60 s et le suivant démarre immédiatement', () => {
  const { game, clock, events } = createGame();
  game.start();
  clock.advance(59_999);
  assert.equal(game.getPublicState().turn.slotLabel, 'A1');
  assert.equal(game.getPublicState().turn.remainingMs, 1);
  clock.advance(1);
  const state = game.getPublicState();
  assert.equal(state.turn.slotLabel, 'B1');
  assert.equal(state.turn.endsAt, 120_000);
  assert.ok(events.some((e) => e.type === 'turn:end' && e.reason === 'timeout'));
});

test('TROUVÉ retire la carte ; PASSER la garde dans la manche', () => {
  const { game } = createGame();
  game.start();
  const player = game.activePlayerId;

  const firstCard = game.getStateFor(player).activeCard.id;
  game.passCard(player);
  let state = game.getPublicState();
  assert.equal(state.cardsRemaining, 60, 'une carte passée reste disponible');
  assert.notEqual(game.getStateFor(player).activeCard.id, firstCard, 'on passe immédiatement à la carte suivante');

  game.markFound(player);
  state = game.getPublicState();
  assert.equal(state.cardsRemaining, 59);
  assert.equal(state.teams.find((t) => t.id === 'A').score, 1);
});

test('une carte passée peut être rencontrée à nouveau pendant la manche', () => {
  const pile = new RoundPile(['c1', 'c2', 'c3'], createSeededRng(3));
  const passed = pile.passCurrent();
  pile.markCurrentFound();
  pile.markCurrentFound();
  assert.equal(pile.currentCardId, passed);
});

test('seul le joueur actif peut agir, et la carte n’est visible que par lui', () => {
  const { game } = createGame();
  game.start();
  const active = game.activePlayerId;
  for (const viewer of ['a1', 'b1', 'a2', 'b2']) {
    const view = game.getStateFor(viewer);
    if (viewer === active) assert.ok(view.activeCard?.title);
    else assert.equal(view.activeCard, null);
  }
  assert.throws(() => game.markFound('b1'), (e) => e.code === ERR.NOT_YOUR_TURN);
  assert.throws(() => game.passCard('a2'), (e) => e.code === ERR.NOT_YOUR_TURN);
});

test('action reçue après la fin du chrono : refusée', () => {
  const { game, clock } = createGame();
  game.start();
  // On simule un timer pas encore traité : on avance l'heure sans déclencher les timers.
  const realNow = clock.now.bind(clock);
  clock.now = () => realNow() + 60 * SECOND;
  assert.throws(() => game.markFound('a1'), (e) => e.code === ERR.TURN_OVER);
  clock.now = realNow;
});

test('les 3 manches utilisent EXACTEMENT le même paquet, sans nouvelle carte', () => {
  const { game, clock, deck } = createGame();
  const deckIds = new Set(deck.map((c) => c.id));
  const foundPerRound = [[], [], []];
  game.on('event', (e) => {
    if (e.type === 'card:found') foundPerRound[game.getPublicState().round.index].push(e.card.id);
  });
  game.start();

  for (let round = 0; round < 3; round++) {
    assert.equal(game.getPublicState().round.number, round + 1);
    // Chaque tour : 20 cartes max trouvées, puis le chrono arrive à 0.
    while (game.status === GAME_STATUS.PLAYING) {
      const turnNumber = game.getPublicState().turn.number;
      findCards(game, 20);
      if (game.status === GAME_STATUS.PLAYING && game.getPublicState().turn.number === turnNumber) {
        clock.advance(60 * SECOND);
      }
    }
    assert.equal(foundPerRound[round].length, 60, `manche ${round + 1} : 60 cartes trouvées`);
    assert.deepEqual(new Set(foundPerRound[round]), deckIds, `manche ${round + 1} : même paquet`);
    if (round < 2) {
      assert.equal(game.status, GAME_STATUS.ROUND_OVER);
      game.startNextRound();
    }
  }
  assert.equal(game.status, GAME_STATUS.FINISHED);
  assert.deepEqual(game.deck.map((c) => c.id), deck.map((c) => c.id), 'paquet initial inchangé');
});

test('partie complète : rotation multi-tours, scores, fin de partie', () => {
  const { game, clock, events } = createGame();
  game.start();

  const labels = [];
  game.on('event', (e) => {
    if (e.type === 'turn:start') labels.push(e.slotLabel);
  });
  labels.push(game.getPublicState().turn.slotLabel);

  // Chaque tour : 7 cartes trouvées, 1 passée, puis chrono à 0.
  while (game.status !== GAME_STATUS.FINISHED) {
    if (game.status === GAME_STATUS.ROUND_OVER) {
      game.startNextRound();
      continue;
    }
    const turnNumber = game.getPublicState().turn.number;
    findCards(game, 7);
    if (game.status === GAME_STATUS.PLAYING && game.getPublicState().turn.number === turnNumber) {
      game.passCard(game.activePlayerId);
      clock.advance(60 * SECOND);
    }
  }

  // La rotation continue d'une manche à l'autre (règle par défaut).
  assert.deepEqual(labels.slice(0, 6), ['A1', 'B1', 'A2', 'B2', 'A1', 'B1']);
  for (let i = 1; i < labels.length; i++) {
    assert.notEqual(labels[i][0], labels[i - 1][0], 'les équipes alternent à chaque tour');
  }

  const { results } = game;
  assert.equal(results.totals.cardsFound, 180, '60 cartes × 3 manches');
  assert.equal(results.ranking.reduce((sum, t) => sum + t.total, 0), 180);
  for (const round of results.rounds) {
    assert.equal(round.teams.reduce((sum, t) => sum + t.points, 0), 60);
  }
  assert.ok(results.winnerTeamIds.length >= 1);
  assert.ok(results.highlights.bestTurn.cardsFound >= 7);
  assert.ok(events.some((e) => e.type === 'game:end'));
});

test('restartTurnOrderEachRound = true : chaque manche recommence par A1', () => {
  const { game } = createGame({ restartTurnOrderEachRound: true });
  game.start();
  findCards(game); // A1 trouve tout en un tour
  game.startNextRound();
  assert.equal(game.getPublicState().turn.slotLabel, 'A1');
});

test('transition automatique entre les manches', () => {
  const { game, clock } = createGame({ roundTransitionMs: 5 * SECOND });
  game.start();
  findCards(game);
  assert.equal(game.status, GAME_STATUS.ROUND_OVER);
  assert.equal(game.getPublicState().nextRoundAt, clock.now() + 5 * SECOND);
  clock.advance(5 * SECOND);
  assert.equal(game.status, GAME_STATUS.PLAYING);
  assert.equal(game.getPublicState().round.number, 2);
});

test('joueur actif déconnecté : son tour s’arrête, il est sauté', () => {
  const { game } = createGame();
  game.start();
  game.setPlayerConnected('b1', false);
  game.setPlayerConnected('a1', false); // a1 est actif → fin de tour
  const state = game.getPublicState();
  assert.equal(state.turn.slotLabel, 'B2', 'b1 déconnecté est sauté');
});

test('dessin : interdit en manche 1, disponible en manche 3', () => {
  const { game } = createGame();
  game.start();
  const stroke = { strokeId: 's1', tool: 'pen', color: '#ff0000', size: 4, points: [[0.1, 0.1]] };
  assert.throws(() => game.draw(game.activePlayerId, 'stroke:begin', stroke), (e) => e.code === ERR.DRAWING_DISABLED);

  findCards(game);
  game.startNextRound();
  findCards(game);
  game.startNextRound();
  assert.equal(game.getPublicState().round.id, 'drawing');

  const drawer = game.activePlayerId;
  const other = ['a1', 'b1', 'a2', 'b2'].find((id) => id !== drawer);
  assert.throws(() => game.draw(other, 'stroke:begin', stroke), (e) => e.code === ERR.NOT_YOUR_TURN);

  const begin = game.draw(drawer, 'stroke:begin', stroke);
  assert.equal(begin.data.color, '#FF0000');
  game.draw(drawer, 'stroke:extend', { strokeId: 's1', points: [[0.2, 0.2], [1.5, -3]] });
  game.draw(drawer, 'stroke:end', { strokeId: 's1' });
  let snapshot = game.getDrawingSnapshot();
  assert.deepEqual(snapshot.strokes[0].points, [[0.1, 0.1], [0.2, 0.2], [1, 0]], 'points bornés entre 0 et 1');

  // Nouvelle carte → zone de dessin vidée.
  game.markFound(drawer);
  snapshot = game.getDrawingSnapshot();
  assert.equal(snapshot.strokes.length, 0);
});

test('outil de dessin : annuler, rétablir, effacer (annulable), gomme', () => {
  const board = new DrawingBoard();
  board.beginStroke({ strokeId: 'a', tool: 'pen', color: '#000000', size: 3, points: [[0, 0]] });
  board.beginStroke({ strokeId: 'b', tool: 'eraser', size: 20, points: [[0.5, 0.5]] });
  assert.equal(board.getVisibleStrokes().length, 2);
  assert.equal(board.getVisibleStrokes()[1].color, null);

  assert.ok(board.undo());
  assert.equal(board.getVisibleStrokes().length, 1);
  assert.ok(board.redo());
  assert.equal(board.getVisibleStrokes().length, 2);

  assert.ok(board.clear());
  assert.equal(board.getVisibleStrokes().length, 0);
  assert.ok(board.undo(), '« effacer tout » peut être annulé');
  assert.equal(board.getVisibleStrokes().length, 2);

  assert.throws(() => board.beginStroke({ strokeId: 'c', tool: 'pen', color: 'rouge', size: 3, points: [[0, 0]] }));
  assert.throws(() => board.beginStroke({ strokeId: 'd', tool: 'pinceau', size: 3, points: [[0, 0]] }));
});

test('validations de création de partie', () => {
  const rules = resolveRules();
  const deck = buildDeck({ categoryId: 'sport', playerCount: 4, rules });
  const three = ['a', 'b', 'c'].map((id) => ({ id, name: id }));
  assert.throws(() => new Game({ players: three, deck: deck.slice(0, 45), rules }), (e) => e.code === ERR.NOT_ENOUGH_PLAYERS);

  const four = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id }));
  assert.throws(() => new Game({ players: four, deck: deck.slice(0, 59), rules }), (e) => e.code === ERR.INVALID_DECK);
  assert.throws(
    () => new Game({ players: four, deck, rules, teams: [{ id: 'A', name: 'A', playerIds: ['a', 'b', 'c'] }, { id: 'B', name: 'B', playerIds: ['d'] }] }),
    (e) => e.code === ERR.TEAM_TOO_SMALL,
  );
});
