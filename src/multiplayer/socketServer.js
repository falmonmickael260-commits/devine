/**
 * ============================================================
 *  SERVEUR MULTIJOUEUR TEMPS RÉEL (Socket.IO)
 * ============================================================
 * Le serveur est la SOURCE DE VÉRITÉ :
 * - les clients n'envoient que des intentions (« j'ai trouvé », « je passe ») ;
 * - le serveur valide, applique, puis renvoie à chaque joueur SA vue de l'état ;
 * - la carte active n'est envoyée qu'au joueur actif.
 *
 * Toutes les requêtes client utilisent un accusé de réception (ack) :
 *   socket.emit('game:found', {}, (res) => res.ok ? ... : afficher(res.error.message))
 *
 * Voir README.md → « Protocole réseau » pour la liste complète des événements.
 */
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { resolveRules } from '../config/rules.js';
import { GameError, ERR } from '../engine/errors.js';
import { RoomManager } from './roomManager.js';
import { ROOM_STATUS, sanitizePlayerName } from './room.js';
import { createStaticHandler } from './staticFiles.js';

/**
 * @param {object} [options]
 * @param {object} [options.rules]                  Surcharge des règles (tests, variantes)
 * @param {string|string[]} [options.corsOrigin]    Origines autorisées
 * @param {number} [options.lobbyDisconnectGraceMs] Délai avant de retirer un joueur déconnecté du lobby
 * @param {number} [options.emptyRoomTtlMs]         Délai avant de supprimer un salon sans joueur connecté
 * @param {string|null} [options.clientDir]         Dossier de l'interface web à servir (null = aucune)
 * @param {object} [options.logger]
 */
export function createDevineServer(options = {}) {
  const {
    rules: ruleOverrides = {},
    corsOrigin = '*',
    lobbyDisconnectGraceMs = 30_000,
    emptyRoomTtlMs = 10 * 60_000,
    clientDir = null,
    logger = console,
  } = options;

  const rules = resolveRules(ruleOverrides);
  const rooms = new RoomManager({ rules });

  const serveStatic = clientDir ? createStaticHandler(clientDir) : null;

  const httpServer = createServer(async (req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }));
      return;
    }
    // Interface web (Socket.IO gère lui-même /socket.io/*)
    if (serveStatic && (await serveStatic(req, res))) return;
    res.writeHead(404);
    res.end();
  });
  const io = new Server(httpServer, { cors: { origin: corsOrigin } });

  /** socket.id → { code, playerId } */
  const sessions = new Map();
  /** playerId → socket.id (une seule connexion active par joueur) */
  const socketOfPlayer = new Map();
  /** playerId → timer de retrait du lobby */
  const graceTimers = new Map();
  /** code → timer de suppression du salon vide */
  const roomTtlTimers = new Map();
  /** code → événements en attente d'envoi (regroupés par micro-tâche) */
  const outbox = new Map();

  /* ---------------- Diffusion de l'état ---------------- */

  /** Abonne le serveur aux changements d'un salon. */
  function bindRoom(room) {
    room.on('game-event', (event) => queueFlush(room.code).events.push(event));
    room.on('change', () => queueFlush(room.code));
  }

  /**
   * Plusieurs changements dans le même cycle (ex : carte trouvée → fin de tour
   * → tour suivant) sont regroupés en UN seul envoi d'état par joueur.
   */
  function queueFlush(code) {
    let entry = outbox.get(code);
    if (!entry) {
      entry = { events: [] };
      outbox.set(code, entry);
      queueMicrotask(() => flush(code));
    }
    return entry;
  }

  function flush(code) {
    const entry = outbox.get(code);
    outbox.delete(code);
    const room = rooms.getRoom(code);
    if (!room || !entry) return;

    for (const event of entry.events) io.to(code).emit('game:event', event);
    for (const player of room.listPlayers()) {
      const socketId = socketOfPlayer.get(player.id);
      if (socketId) io.to(socketId).emit('state', room.getViewFor(player.id));
    }
  }

  /* ---------------- Sessions ---------------- */

  /** Associe une socket à un joueur d'un salon. */
  function attach(socket, room, playerId) {
    // Une socket = un seul salon à la fois.
    const previous = sessions.get(socket.id);
    if (previous && (previous.code !== room.code || previous.playerId !== playerId)) {
      detach(socket, { leaveRoom: false });
    }

    // Un joueur = une seule socket (reconnexion depuis un autre appareil / onglet).
    const oldSocketId = socketOfPlayer.get(playerId);
    if (oldSocketId && oldSocketId !== socket.id) {
      sessions.delete(oldSocketId);
      const oldSocket = io.sockets.sockets.get(oldSocketId);
      oldSocket?.leave(room.code);
      oldSocket?.emit('session:replaced');
    }

    sessions.set(socket.id, { code: room.code, playerId });
    socketOfPlayer.set(playerId, socket.id);
    socket.join(room.code);
    clearTimer(graceTimers, playerId);
    clearTimer(roomTtlTimers, room.code);

    room.setConnected(playerId, true);
    queueFlush(room.code); // garantit l'envoi de l'état au nouvel arrivant

    // Rattrapage du dessin en cours (manche 3).
    const snapshot = room.getDrawingSnapshot();
    if (snapshot) socket.emit('draw:snapshot', snapshot);
  }

  /**
   * Détache une socket de son joueur.
   * leaveRoom = true : départ volontaire (retiré du lobby immédiatement).
   */
  function detach(socket, { leaveRoom }) {
    const session = sessions.get(socket.id);
    if (!session) return;
    sessions.delete(socket.id);
    socket.leave(session.code);

    // La socket a déjà été remplacée par une autre connexion du même joueur.
    if (socketOfPlayer.get(session.playerId) !== socket.id) return;
    socketOfPlayer.delete(session.playerId);

    const room = rooms.getRoom(session.code);
    if (!room) return;

    if (leaveRoom) {
      room.removePlayer(session.playerId);
    } else {
      room.setConnected(session.playerId, false);
      // En lobby : on laisse un délai pour se reconnecter avant de libérer la place.
      if (room.status === ROOM_STATUS.LOBBY) {
        setTimer(graceTimers, session.playerId, lobbyDisconnectGraceMs, () => {
          const current = rooms.getRoom(session.code);
          if (current?.status === ROOM_STATUS.LOBBY && current.getPlayer(session.playerId)?.connected === false) {
            current.removePlayer(session.playerId);
            cleanupRoomIfEmpty(current);
          }
        });
      }
    }
    cleanupRoomIfEmpty(room);
  }

  /** Supprime un salon vide, ou programme sa suppression si plus personne n'est connecté. */
  function cleanupRoomIfEmpty(room) {
    if (room.playerCount === 0) {
      clearTimer(roomTtlTimers, room.code);
      rooms.deleteRoom(room.code);
      return;
    }
    if (room.connectedCount === 0 && !roomTtlTimers.has(room.code)) {
      setTimer(roomTtlTimers, room.code, emptyRoomTtlMs, () => {
        const current = rooms.getRoom(room.code);
        if (current && current.connectedCount === 0) rooms.deleteRoom(room.code);
      });
    }
  }

  function credentials(room, player) {
    return { roomCode: room.code, playerId: player.id, token: player.token };
  }

  /* ---------------- Événements client ---------------- */

  io.on('connection', (socket) => {
    /** Enregistre un gestionnaire avec validation + accusé de réception uniforme. */
    const on = (event, handler) => {
      socket.on(event, (payload, ack) => {
        if (typeof payload === 'function') {
          ack = payload;
          payload = {};
        }
        try {
          const safePayload = payload && typeof payload === 'object' ? payload : {};
          const result = handler(safePayload) ?? {};
          if (typeof ack === 'function') ack({ ok: true, ...result });
        } catch (error) {
          const clientError = toClientError(error, logger);
          if (typeof ack === 'function') ack({ ok: false, error: clientError });
          else socket.emit('game:error', clientError);
        }
      });
    };

    /** Salon + joueur associés à cette socket (sinon erreur). */
    const current = () => {
      const session = sessions.get(socket.id);
      if (!session) throw new GameError(ERR.NOT_IN_ROOM, 'Tu n’es dans aucune partie.');
      const room = rooms.getRoom(session.code);
      if (!room) {
        sessions.delete(socket.id);
        throw new GameError(ERR.ROOM_NOT_FOUND, 'Cette partie n’existe plus.');
      }
      return { room, playerId: session.playerId };
    };

    // --- Salons ---
    on('room:create', ({ name }) => {
      sanitizePlayerName(name); // valide AVANT de créer le salon
      const room = rooms.createRoom();
      bindRoom(room);
      const player = room.addPlayer(name);
      attach(socket, room, player.id);
      return credentials(room, player);
    });

    on('room:join', ({ code, name }) => {
      const room = rooms.requireRoom(code);
      const player = room.addPlayer(name);
      attach(socket, room, player.id);
      return credentials(room, player);
    });

    on('room:rejoin', ({ code, token }) => {
      const room = rooms.requireRoom(code);
      const player = room.findPlayerByToken(token);
      if (!player) throw new GameError(ERR.INVALID_SESSION, 'Session expirée : rejoins la partie avec le code.');
      attach(socket, room, player.id);
      return { roomCode: room.code, playerId: player.id };
    });

    on('room:leave', () => {
      current();
      detach(socket, { leaveRoom: true });
    });

    // --- Lobby (hôte) ---
    on('lobby:set-category', ({ categoryId }) => {
      const { room, playerId } = current();
      room.setCategory(playerId, categoryId);
    });

    on('lobby:shuffle-teams', () => {
      const { room, playerId } = current();
      room.shuffleTeams(playerId);
    });

    on('lobby:move-player', ({ playerId: targetId, teamId }) => {
      const { room, playerId } = current();
      room.movePlayer(playerId, targetId, teamId);
    });

    // --- Partie ---
    on('game:start', () => {
      const { room, playerId } = current();
      room.startGame(playerId);
    });

    on('game:found', () => {
      const { room, playerId } = current();
      return room.markFound(playerId);
    });

    on('game:pass', () => {
      const { room, playerId } = current();
      return room.passCard(playerId);
    });

    on('game:next-round', () => {
      const { room, playerId } = current();
      room.startNextRound(playerId);
    });

    on('game:rematch', () => {
      const { room, playerId } = current();
      room.rematch(playerId);
    });

    // --- Dessin (manche 3) : relais temps réel vers les AUTRES joueurs ---
    on('draw:action', ({ action, data }) => {
      const { room, playerId } = current();
      const message = room.draw(playerId, action, data);
      if (message) socket.to(room.code).emit('draw', message);
      return { cardSeq: message?.cardSeq ?? null };
    });

    on('draw:snapshot', () => {
      const { room } = current();
      return { snapshot: room.getDrawingSnapshot() };
    });

    socket.on('disconnect', () => detach(socket, { leaveRoom: false }));
  });

  /* ---------------- Cycle de vie ---------------- */

  return {
    io,
    httpServer,
    rooms,
    rules,

    /** Démarre l'écoute. Renvoie le port effectif (utile avec port 0 en test). */
    listen(port = 3000) {
      return new Promise((resolve) => {
        httpServer.listen(port, () => resolve(httpServer.address().port));
      });
    },

    /** Arrête proprement le serveur et toutes les parties. */
    close() {
      for (const timers of [graceTimers, roomTtlTimers]) {
        for (const handle of timers.values()) clearTimeout(handle);
        timers.clear();
      }
      rooms.destroyAll();
      return new Promise((resolve) => io.close(() => resolve()));
    },
  };
}

/* ---------------- Utilitaires ---------------- */

function setTimer(map, key, delayMs, callback) {
  clearTimer(map, key);
  const handle = setTimeout(() => {
    map.delete(key);
    callback();
  }, delayMs);
  handle.unref?.();
  map.set(key, handle);
}

function clearTimer(map, key) {
  const handle = map.get(key);
  if (handle) clearTimeout(handle);
  map.delete(key);
}

/** Convertit une erreur en message sûr pour le client (jamais de détails internes). */
function toClientError(error, logger) {
  if (error instanceof GameError) return { code: error.code, message: error.message };
  logger.error?.('[DEVINE] Erreur inattendue :', error);
  return { code: 'INTERNAL_ERROR', message: 'Une erreur inattendue est survenue.' };
}
