/**
 * PHASE 12 — Partie complète à 4 joueurs via le vrai serveur Socket.IO.
 * Chrono réduit à 700 ms pour que le test soit rapide.
 *
 * Scénario :
 * - création du salon, 3 joueurs rejoignent avec le code ;
 * - vérifications du lobby (minimum 4 joueurs, hôte, catégorie) ;
 * - Tour 1 : le joueur ne fait rien → le chrono expire → joueur suivant ;
 * - ensuite chaque joueur passe 1 carte puis en trouve 25 max par tour ;
 * - manche 3 : un trait est dessiné et relayé aux autres joueurs ;
 * - fin de partie, résultats, puis « rejouer ».
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';
import { createDevineServer } from '../src/multiplayer/socketServer.js';

const silentLogger = { error() {} };

function request(socket, event, payload = {}) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

function waitFor(predicate, timeoutMs = 20_000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      const value = predicate();
      if (value) return resolve(value);
      if (Date.now() - started > timeoutMs) return reject(new Error('Délai dépassé'));
      setTimeout(check, 10);
    };
    check();
  });
}

test('partie complète à 4 joueurs en temps réel', { timeout: 30_000 }, async () => {
  const server = createDevineServer({
    rules: { turnDurationMs: 700, roundTransitionMs: 100 },
    logger: silentLogger,
  });
  const port = await server.listen(0);
  const url = `http://localhost:${port}`;
  const names = ['Alice', 'Bruno', 'Chloé', 'David'];
  const clients = names.map(() => connect(url, { transports: ['websocket'], forceNew: true }));

  try {
    await Promise.all(clients.map((c) => new Promise((resolve) => c.on('connect', resolve))));

    /* ---------- Suivi des états reçus ---------- */
    const latest = new Map();
    const turnLabels = [];
    const drawReceivedBy = new Set();
    const leaks = [];

    clients.forEach((client, index) => {
      client.on('state', (state) => {
        latest.set(index, state);
        const game = state.game;
        // Anti-triche : un joueur non actif ne doit JAMAIS recevoir la carte.
        if (game && !game.isActivePlayer && game.activeCard) leaks.push(names[index]);
        if (index === 0 && game?.turn && turnLabels.at(-1)?.number !== game.turn.number) {
          turnLabels.push({ number: game.turn.number, label: game.turn.slotLabel, round: game.round.number });
        }
      });
      client.on('draw', () => drawReceivedBy.add(index));
    });

    /* ---------- Lobby ---------- */
    const [host, ...others] = clients;
    const created = await request(host, 'room:create', { name: 'Alice' });
    assert.ok(created.ok, JSON.stringify(created));
    assert.match(created.roomCode, /^[A-Z2-9]{5}$/);

    const tooEarly = await request(host, 'game:start');
    assert.equal(tooEarly.ok, false);

    const badCode = await request(others[0], 'room:join', { code: 'ZZZZZ', name: 'Bruno' });
    assert.equal(badCode.error.code, 'ROOM_NOT_FOUND');

    for (const [i, client] of others.entries()) {
      // Le code est accepté en minuscules, avec espaces.
      const joined = await request(client, 'room:join', { code: ` ${created.roomCode.toLowerCase()} `, name: names[i + 1] });
      assert.ok(joined.ok, JSON.stringify(joined));
    }

    const duplicate = connect(url, { transports: ['websocket'], forceNew: true });
    const sameName = await request(duplicate, 'room:join', { code: created.roomCode, name: 'alice' });
    assert.equal(sameName.error.code, 'NAME_TAKEN');
    duplicate.close();

    const notHost = await request(others[0], 'lobby:set-category', { categoryId: 'sport' });
    assert.equal(notHost.error.code, 'NOT_HOST');

    await waitFor(() => latest.get(0)?.room.players.length === 4);
    assert.ok(latest.get(0).room.startBlockers.some((b) => b.code === 'CATEGORY_REQUIRED'));

    assert.ok((await request(host, 'lobby:set-category', { categoryId: 'personnalites' })).ok);
    await waitFor(() => latest.get(0)?.room.canStart);

    // Répartition auto : Alice A, Bruno B, Chloé A, David B.
    assert.deepEqual(
      latest.get(0).room.teams.map((t) => t.playerIds.length),
      [2, 2],
    );

    /* ---------- Bots ---------- */
    let firstTurnSkipped = false;
    let drawnThisRound3 = false;
    const busy = new Set();
    const foundInTurn = new Map();

    async function play(index) {
      const state = latest.get(index);
      const game = state?.game;
      if (!game || game.status !== 'playing' || !game.isActivePlayer || !game.activeCard) return;
      if (busy.has(index)) return;

      // Tour 1 : on ne fait rien pour laisser expirer le chrono.
      if (game.turn.number === 1) {
        firstTurnSkipped = true;
        return;
      }
      const key = game.turn.number;
      const count = foundInTurn.get(key) ?? 0;
      if (count >= 25) return; // on attend la fin du chrono

      busy.add(index);
      const client = clients[index];
      try {
        if (game.round.drawingEnabled && !drawnThisRound3) {
          drawnThisRound3 = true;
          const stroke = { strokeId: 'trait-1', tool: 'pen', color: '#1E88E5', size: 4, points: [[0.1, 0.2]] };
          assert.ok((await request(client, 'draw:action', { action: 'stroke:begin', data: stroke })).ok);
          await request(client, 'draw:action', { action: 'stroke:extend', data: { strokeId: 'trait-1', points: [[0.3, 0.4]] } });
          await request(client, 'draw:action', { action: 'stroke:end', data: { strokeId: 'trait-1' } });
        }
        if (count === 0 && game.turn.passedCount === 0) {
          await request(client, 'game:pass');
        }
        const res = await request(client, 'game:found');
        if (res.ok) foundInTurn.set(key, count + 1);
      } finally {
        busy.delete(index);
        // L'état suivant a pu arriver pendant qu'on attendait la réponse : on rejoue.
        setImmediate(() => play(index));
      }
    }
    clients.forEach((client, index) => client.on('state', () => play(index)));

    /* ---------- Partie ---------- */
    assert.ok((await request(host, 'game:start')).ok);
    // Un non-actif qui tente TROUVÉ est refusé.
    await waitFor(() => latest.get(1)?.game);
    assert.equal((await request(clients[1], 'game:found')).error.code, 'NOT_YOUR_TURN');

    const finalState = await waitFor(() => {
      const state = latest.get(0);
      return state?.game?.status === 'finished' ? state : null;
    });

    /* ---------- Vérifications ---------- */
    assert.ok(firstTurnSkipped, 'le premier tour a expiré');
    assert.deepEqual(leaks, [], 'aucune carte envoyée à un joueur non actif');

    const labels = turnLabels.map((t) => t.label);
    assert.deepEqual(labels.slice(0, 4), ['A1', 'B1', 'A2', 'B2']);
    for (let i = 1; i < labels.length; i++) {
      assert.notEqual(labels[i][0], labels[i - 1][0], `alternance des équipes (${labels.join(' ')})`);
    }

    const { results } = finalState.game;
    assert.equal(results.totals.cardsInDeck, 60);
    assert.equal(results.totals.cardsFound, 180);
    assert.equal(results.rounds.length, 3);
    for (const round of results.rounds) {
      assert.equal(round.teams.reduce((sum, t) => sum + t.points, 0), 60);
    }

    // Le dessin a été reçu par les 3 autres joueurs, pas par le dessinateur.
    assert.equal(drawReceivedBy.size, 3);

    /* ---------- Rejouer ---------- */
    assert.ok((await request(host, 'game:rematch')).ok);
    await waitFor(() => latest.get(0)?.room.status === 'lobby');
    assert.equal(latest.get(0).room.players.length, 4);
  } finally {
    clients.forEach((client) => client.close());
    await server.close();
  }
});

test('reconnexion avec le jeton de session', { timeout: 10_000 }, async () => {
  const server = createDevineServer({ logger: silentLogger, lobbyDisconnectGraceMs: 5_000 });
  const port = await server.listen(0);
  const url = `http://localhost:${port}`;
  const first = connect(url, { transports: ['websocket'], forceNew: true });
  let second;

  try {
    const created = await request(first, 'room:create', { name: 'Hôte' });
    first.close();

    second = connect(url, { transports: ['websocket'], forceNew: true });
    const rejoined = await request(second, 'room:rejoin', { code: created.roomCode, token: created.token });
    assert.ok(rejoined.ok);
    assert.equal(rejoined.playerId, created.playerId);

    const wrongToken = await request(second, 'room:rejoin', { code: created.roomCode, token: 'faux' });
    assert.equal(wrongToken.error.code, 'INVALID_SESSION');
  } finally {
    second?.close();
    await server.close();
  }
});
