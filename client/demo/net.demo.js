/**
 * ============================================================
 *  VERSION DÉMO — « serveur » simulé dans le navigateur
 * ============================================================
 * Remplace core/net.js dans la version publiée en lien (sans serveur) :
 * - le VRAI moteur (Room + Game) tourne dans la page ;
 * - des joueurs simulés rejoignent la salle, choisissent, jouent leurs tours.
 * Même API que core/net.js : { socket, request, on } → aucun écran ne change.
 */
import { Room, sanitizePlayerName, ROOM_STATUS } from '../../src/multiplayer/room.js';
import { generateRoomCode, normalizeRoomCode } from '../../src/multiplayer/roomCodes.js';
import { resolveRules } from '../../src/config/rules.js';
import { GameError, ERR } from '../../src/engine/errors.js';
import { setState } from '../js/core/store.js';

const rules = resolveRules({});
const BOT_NAMES = ['Léa', 'Jean-Paul', 'Sofiane', 'Chloé', 'Hugo', 'Inès', 'Malik'];

/* ---------- Fausse socket (événements locaux) ---------- */
const handlers = new Map();
export const socket = {
  connected: true,
  on(event, fn) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event).add(fn);
  },
  off(event, fn) {
    handlers.get(event)?.delete(fn);
  },
};
function emitLocal(event, payload) {
  for (const fn of handlers.get(event) ?? []) fn(payload);
}
export function on(event, handler) {
  socket.on(event, handler);
  return () => socket.off(event, handler);
}

/* ---------- Salle de démo ---------- */
let room = null;
let you = null; // { playerId }
let timers = [];
const bots = new Set();
let pendingFlush = false;
let botTurnKey = null;

function later(ms, fn) {
  timers.push(setTimeout(fn, ms));
}

function closeRoom() {
  timers.forEach(clearTimeout);
  timers = [];
  bots.clear();
  room?.destroy();
  room = null;
  you = null;
}

function bindRoom(newRoom) {
  room = newRoom;
  room.on('game-event', (event) => emitLocal('game:event', event));
  room.on('change', () => {
    if (pendingFlush) return;
    pendingFlush = true;
    queueMicrotask(() => {
      pendingFlush = false;
      if (!room || !you) return;
      const view = room.getViewFor(you.playerId);
      setState({ view, clockOffset: view.serverNow - Date.now() });
      driveBots();
    });
  });
}

function addBot(name) {
  if (!room || room.playerCount >= rules.maxPlayers) return null;
  const player = room.addPlayer(name);
  bots.add(player.id);
  return player;
}

/** Les joueurs simulés jouent leur tour : trouvé (souvent) ou passer. */
function driveBots() {
  const game = room?.game;
  if (!game) return;
  const state = game.getPublicState();
  if (state.status !== 'playing' || !state.turn || !bots.has(state.turn.playerId)) return;

  const key = `${state.turn.number}:${state.turn.cardSeq}`;
  if (botTurnKey === key) return;
  botTurnKey = key;

  later(2200 + Math.random() * 4000, () => {
    try {
      if (Math.random() < 0.82) room.markFound(state.turn.playerId);
      else room.passCard(state.turn.playerId);
    } catch {
      /* tour terminé entre-temps */
    }
  });
}

/* ---------- Actions (mêmes noms que le vrai serveur) ---------- */
const actions = {
  'room:create': ({ name }) => {
    sanitizePlayerName(name);
    closeRoom();
    bindRoom(new Room({ code: generateRoomCode(), rules }));
    const player = room.addPlayer(name);
    you = { playerId: player.id };
    // Les amis arrivent un par un
    ['Léa', 'Jean-Paul', 'Sofiane'].forEach((botName, i) => later(1400 + i * 1300, () => addBot(botName)));
    return { roomCode: room.code, playerId: player.id, token: player.token };
  },

  'room:join': ({ code, name }) => {
    const normalized = normalizeRoomCode(code ?? '');
    if (!normalized || normalized.length !== 5) {
      throw new GameError(ERR.ROOM_NOT_FOUND, 'Aucune partie avec ce code.');
    }
    sanitizePlayerName(name);
    closeRoom();
    // Démo : n'importe quel code ouvre une salle déjà animée par un hôte simulé
    bindRoom(new Room({ code: normalized, rules }));
    const host = addBot('Léa');
    addBot('Sofiane');
    const player = room.addPlayer(name);
    you = { playerId: player.id };
    later(1500, () => addBot('Hugo'));
    later(3000, () => room?.setCategory(host.id, 'mix'));
    later(7000, () => {
      try {
        if (room?.status === ROOM_STATUS.LOBBY) room.startGame(host.id);
      } catch {
        /* conditions non réunies */
      }
    });
    return { roomCode: room.code, playerId: player.id, token: player.token };
  },

  'room:rejoin': () => {
    throw new GameError(ERR.INVALID_SESSION, 'Session expirée : rejoins la partie avec le code.');
  },

  'room:leave': () => {
    closeRoom();
    setState({ view: null });
  },

  'lobby:set-category': ({ categoryId }) => room.setCategory(you.playerId, categoryId),
  'lobby:shuffle-teams': () => room.shuffleTeams(you.playerId),
  'lobby:move-player': ({ playerId, teamId }) => room.movePlayer(you.playerId, playerId, teamId),
  'game:start': () => room.startGame(you.playerId),
  'game:found': () => room.markFound(you.playerId),
  'game:pass': () => room.passCard(you.playerId),
  'game:next-round': () => room.startNextRound(you.playerId),
  'game:rematch': () => room.rematch(you.playerId),
  'draw:action': () => ({ cardSeq: null }),
  'draw:snapshot': () => ({ snapshot: null }),
};

export function request(event, payload = {}) {
  return new Promise((resolve, reject) => {
    // Petit délai réaliste (réseau)
    setTimeout(() => {
      try {
        const action = actions[event];
        if (!action) throw new GameError(ERR.INVALID_ACTION, 'Action inconnue.');
        if (event !== 'room:create' && event !== 'room:join' && event !== 'room:rejoin' && !room) {
          throw new GameError(ERR.NOT_IN_ROOM, 'Tu n’es dans aucune partie.');
        }
        resolve({ ok: true, ...(action(payload ?? {}) ?? {}) });
      } catch (error) {
        reject({ code: error.code ?? 'UNKNOWN', message: error.message ?? 'Action impossible.' });
      }
    }, 120);
  });
}

/* ---------- Démarrage ---------- */
// Une salle de démo ne survit pas au rechargement : on oublie l'ancienne session.
try {
  localStorage.removeItem('devine.session');
} catch {
  /* rien */
}
setTimeout(() => {
  setState({ connected: true });
  emitLocal('connect');
}, 0);
