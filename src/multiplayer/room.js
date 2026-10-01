/**
 * ============================================================
 *  SALON PRIVÉ (lobby + partie)
 * ============================================================
 * Un salon :
 * - est créé par l'hôte et identifié par un code unique ;
 * - accueille les joueurs (4 minimum, 8 maximum) ;
 * - gère les équipes avant la partie (auto + ajustements de l'hôte) ;
 * - mémorise la catégorie choisie par l'hôte ;
 * - crée puis pilote une instance de Game.
 *
 * Cette classe ne connaît PAS Socket.IO : elle émet simplement
 *   'change'     → l'état a changé (le serveur renvoie l'état à chacun)
 *   'game-event' → événement de partie à diffuser (animations côté client)
 */
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { DEFAULT_RULES } from '../config/rules.js';
import { CATEGORIES, isValidCategory } from '../data/cards/index.js';
import { buildDeck, getMaxPlayersForCategory } from '../engine/deck.js';
import { Game, GAME_STATUS } from '../engine/game.js';
import { GameError, ERR } from '../engine/errors.js';
import { realClock } from '../engine/clock.js';
import {
  cloneTeams,
  createEmptyTeams,
  distributePlayers,
  findSmallestTeam,
  findTeamOfPlayer,
  rebalanceTeams,
} from '../engine/teams.js';

export const ROOM_STATUS = Object.freeze({
  LOBBY: 'lobby',
  IN_GAME: 'in_game',
});

export const PLAYER_NAME_MAX_LENGTH = 20;

/** Nettoie et valide un pseudo. */
export function sanitizePlayerName(rawName) {
  if (typeof rawName !== 'string') {
    throw new GameError(ERR.INVALID_NAME, 'Pseudo invalide.');
  }
  const name = rawName.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
  if (name.length === 0 || name.length > PLAYER_NAME_MAX_LENGTH) {
    throw new GameError(ERR.INVALID_NAME, `Le pseudo doit faire entre 1 et ${PLAYER_NAME_MAX_LENGTH} caractères.`);
  }
  return name;
}

export class Room extends EventEmitter {
  #rules;
  #clock;
  #rng;
  /** Joueurs dans l'ordre d'arrivée : id → { id, name, token, connected } */
  #players = new Map();
  #teams;
  #hostId = null;
  #categoryId = null;
  #status = ROOM_STATUS.LOBBY;
  /** @type {Game | null} */
  #game = null;

  constructor({ code, rules = DEFAULT_RULES, clock = realClock, rng = Math.random }) {
    super();
    this.code = code;
    this.#rules = rules;
    this.#clock = clock;
    this.#rng = rng;
    this.#teams = createEmptyTeams(rules.teamCount);
    this.createdAt = clock.now();
  }

  /* ================================================================
   *  LECTURE
   * ================================================================ */

  get status() { return this.#status; }
  get hostId() { return this.#hostId; }
  get categoryId() { return this.#categoryId; }
  get game() { return this.#game; }
  get playerCount() { return this.#players.size; }

  get connectedCount() {
    return [...this.#players.values()].filter((player) => player.connected).length;
  }

  /** Liste publique des joueurs (sans le jeton secret). */
  listPlayers() {
    return [...this.#players.values()].map(({ id, name, connected }) => ({ id, name, connected }));
  }

  getPlayer(playerId) {
    const player = this.#players.get(playerId);
    return player ? { id: player.id, name: player.name, connected: player.connected } : null;
  }

  /** Retrouve un joueur via son jeton de session (reconnexion). */
  findPlayerByToken(token) {
    if (typeof token !== 'string') return null;
    const player = [...this.#players.values()].find((p) => p.token === token);
    return player ? this.getPlayer(player.id) : null;
  }

  /* ================================================================
   *  JOUEURS
   * ================================================================ */

  /**
   * Ajoute un joueur au lobby. Le premier joueur devient l'hôte.
   * @returns {{id:string, name:string, token:string}} le jeton permet de se reconnecter
   */
  addPlayer(rawName) {
    if (this.#status !== ROOM_STATUS.LOBBY) {
      throw new GameError(ERR.GAME_IN_PROGRESS, 'La partie a déjà commencé.');
    }
    if (this.#players.size >= this.#rules.maxPlayers) {
      throw new GameError(ERR.ROOM_FULL, `La partie est complète (${this.#rules.maxPlayers} joueurs max).`);
    }
    const name = sanitizePlayerName(rawName);
    const nameTaken = [...this.#players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase());
    if (nameTaken) {
      throw new GameError(ERR.NAME_TAKEN, 'Ce pseudo est déjà utilisé dans cette partie.');
    }

    const player = { id: randomUUID(), name, token: randomUUID(), connected: true };
    this.#players.set(player.id, player);
    findSmallestTeam(this.#teams).playerIds.push(player.id); // répartition automatique
    if (!this.#hostId) this.#hostId = player.id;

    this.#changed();
    return { id: player.id, name: player.name, token: player.token };
  }

  /**
   * Départ volontaire.
   * - En lobby : le joueur est retiré.
   * - En partie : il est seulement marqué déconnecté (les équipes sont figées).
   */
  removePlayer(playerId) {
    if (!this.#players.has(playerId)) return;

    if (this.#status === ROOM_STATUS.IN_GAME) {
      this.setConnected(playerId, false);
      return;
    }
    this.#players.delete(playerId);
    const team = findTeamOfPlayer(this.#teams, playerId);
    if (team) team.playerIds = team.playerIds.filter((id) => id !== playerId);
    rebalanceTeams(this.#teams);
    this.#ensureHost();
    this.#changed();
  }

  setConnected(playerId, connected) {
    const player = this.#players.get(playerId);
    if (!player || player.connected === connected) return;
    player.connected = connected;
    this.#game?.setPlayerConnected(playerId, connected);
    this.#ensureHost();
    this.#changed();
  }

  /* ================================================================
   *  LOBBY (actions de l'hôte)
   * ================================================================ */

  setCategory(byPlayerId, categoryId) {
    this.#assertHost(byPlayerId);
    this.#assertLobby();
    if (!isValidCategory(categoryId)) {
      throw new GameError(ERR.UNKNOWN_CATEGORY, 'Catégorie inconnue.');
    }
    this.#categoryId = categoryId;
    this.#changed();
  }

  /** Mélange aléatoirement les équipes. */
  shuffleTeams(byPlayerId) {
    this.#assertHost(byPlayerId);
    this.#assertLobby();
    this.#teams = distributePlayers([...this.#players.keys()], this.#rules.teamCount, {
      shuffled: true,
      rng: this.#rng,
    });
    this.#changed();
  }

  /** Déplace un joueur dans une autre équipe. */
  movePlayer(byPlayerId, playerId, teamId) {
    this.#assertHost(byPlayerId);
    this.#assertLobby();
    if (!this.#players.has(playerId)) throw new GameError(ERR.PLAYER_NOT_FOUND, 'Joueur introuvable.');
    const target = this.#teams.find((team) => team.id === teamId);
    if (!target) throw new GameError(ERR.INVALID_TEAMS, 'Équipe introuvable.');

    const current = findTeamOfPlayer(this.#teams, playerId);
    if (current === target) return;
    current.playerIds = current.playerIds.filter((id) => id !== playerId);
    target.playerIds.push(playerId);
    this.#changed();
  }

  /** Raisons qui empêchent de lancer la partie (liste vide = prêt). */
  getStartBlockers() {
    const blockers = [];
    const count = this.#players.size;
    const { minPlayers, maxPlayers, minPlayersPerTeam } = this.#rules;

    if (count < minPlayers) {
      blockers.push({ code: ERR.NOT_ENOUGH_PLAYERS, message: `Il faut au moins ${minPlayers} joueurs (${count}/${minPlayers}).` });
    }
    if (count > maxPlayers) {
      blockers.push({ code: ERR.TOO_MANY_PLAYERS, message: `${maxPlayers} joueurs maximum.` });
    }
    if (!this.#categoryId) {
      blockers.push({ code: ERR.CATEGORY_REQUIRED, message: 'L’hôte doit choisir une catégorie.' });
    } else if (count >= minPlayers) {
      const maxForCategory = getMaxPlayersForCategory(this.#categoryId, this.#rules);
      if (count > maxForCategory) {
        blockers.push({
          code: ERR.NOT_ENOUGH_CARDS,
          message: `Cette catégorie permet de jouer à ${maxForCategory} joueurs maximum.`,
        });
      }
    }
    for (const team of this.#teams) {
      if (team.playerIds.length < minPlayersPerTeam) {
        blockers.push({ code: ERR.TEAM_TOO_SMALL, message: `${team.name} doit compter au moins ${minPlayersPerTeam} joueurs.` });
      }
    }
    const disconnected = [...this.#players.values()].filter((player) => !player.connected);
    if (disconnected.length > 0) {
      blockers.push({
        code: ERR.PLAYER_DISCONNECTED,
        message: `En attente de : ${disconnected.map((player) => player.name).join(', ')}.`,
      });
    }
    return blockers;
  }

  /** L'hôte lance la partie : le paquet est tiré et VERROUILLÉ ici. */
  startGame(byPlayerId) {
    this.#assertHost(byPlayerId);
    this.#assertLobby();
    const [firstBlocker] = this.getStartBlockers();
    if (firstBlocker) throw new GameError(firstBlocker.code, firstBlocker.message);

    const deck = buildDeck({
      categoryId: this.#categoryId,
      playerCount: this.#players.size,
      rules: this.#rules,
      rng: this.#rng,
    });

    const game = new Game({
      players: this.listPlayers(),
      teams: this.#teams,
      deck,
      rules: this.#rules,
      clock: this.#clock,
      rng: this.#rng,
    });
    game.on('event', (event) => {
      this.emit('game-event', event);
      this.#changed();
    });

    this.#game = game;
    this.#status = ROOM_STATUS.IN_GAME;
    game.start();
    this.#changed();
  }

  /* ================================================================
   *  PARTIE (actions déléguées au moteur)
   * ================================================================ */

  markFound(playerId) {
    return this.#requireGame().markFound(playerId);
  }

  passCard(playerId) {
    return this.#requireGame().passCard(playerId);
  }

  draw(playerId, action, data) {
    return this.#requireGame().draw(playerId, action, data ?? {});
  }

  getDrawingSnapshot() {
    return this.#game?.getDrawingSnapshot() ?? null;
  }

  /** Manche suivante manuelle (utile si rules.roundTransitionMs = null). */
  startNextRound(byPlayerId) {
    this.#assertHost(byPlayerId);
    this.#requireGame().startNextRound();
  }

  /** REJOUER : retour au lobby avec les mêmes joueurs, équipes et catégorie. */
  rematch(byPlayerId) {
    this.#assertHost(byPlayerId);
    const game = this.#requireGame();
    if (game.status !== GAME_STATUS.FINISHED) {
      throw new GameError(ERR.INVALID_STATE, 'La partie n’est pas terminée.');
    }
    game.destroy();
    this.#game = null;
    this.#status = ROOM_STATUS.LOBBY;

    // Les joueurs partis pendant la partie sont retirés du salon.
    for (const player of [...this.#players.values()]) {
      if (!player.connected) {
        this.#players.delete(player.id);
        const team = findTeamOfPlayer(this.#teams, player.id);
        if (team) team.playerIds = team.playerIds.filter((id) => id !== player.id);
      }
    }
    rebalanceTeams(this.#teams);
    this.#ensureHost();
    this.#changed();
  }

  /* ================================================================
   *  VUE ENVOYÉE À UN JOUEUR
   * ================================================================ */

  getViewFor(playerId) {
    const me = this.#players.get(playerId);
    const blockers = this.#status === ROOM_STATUS.LOBBY ? this.getStartBlockers() : [];

    return {
      serverNow: this.#clock.now(),
      you: me
        ? {
            id: me.id,
            name: me.name,
            isHost: this.#hostId === me.id,
            teamId: findTeamOfPlayer(this.#teams, me.id)?.id ?? null,
          }
        : null,
      room: {
        code: this.code,
        status: this.#status,
        hostId: this.#hostId,
        categoryId: this.#categoryId,
        players: [...this.#players.values()].map((player) => ({
          id: player.id,
          name: player.name,
          connected: player.connected,
          isHost: this.#hostId === player.id,
          teamId: findTeamOfPlayer(this.#teams, player.id)?.id ?? null,
        })),
        teams: cloneTeams(this.#teams),
        categories: CATEGORIES.map((category) => ({
          ...category,
          maxPlayers: getMaxPlayersForCategory(category.id, this.#rules),
        })),
        rules: {
          minPlayers: this.#rules.minPlayers,
          maxPlayers: this.#rules.maxPlayers,
          cardsPerPlayer: this.#rules.cardsPerPlayer,
          turnDurationMs: this.#rules.turnDurationMs,
          teamCount: this.#rules.teamCount,
        },
        deckSize: this.#players.size * this.#rules.cardsPerPlayer,
        canStart: this.#status === ROOM_STATUS.LOBBY && blockers.length === 0,
        startBlockers: blockers,
      },
      game: this.#game ? this.#game.getStateFor(playerId) : null,
    };
  }

  destroy() {
    this.#game?.destroy();
    this.#game = null;
    this.removeAllListeners();
  }

  /* ================================================================
   *  INTERNE
   * ================================================================ */

  /** L'hôte est transféré au premier joueur connecté s'il part ou se déconnecte. */
  #ensureHost() {
    const host = this.#players.get(this.#hostId);
    if (host?.connected) return;
    const replacement = [...this.#players.values()].find((player) => player.connected);
    if (replacement) this.#hostId = replacement.id;
    else if (!host) this.#hostId = this.#players.keys().next().value ?? null;
  }

  #assertHost(playerId) {
    if (playerId !== this.#hostId) {
      throw new GameError(ERR.NOT_HOST, 'Seul l’hôte peut faire cette action.');
    }
  }

  #assertLobby() {
    if (this.#status !== ROOM_STATUS.LOBBY) {
      throw new GameError(ERR.GAME_IN_PROGRESS, 'La partie a déjà commencé.');
    }
  }

  #requireGame() {
    if (!this.#game) throw new GameError(ERR.INVALID_STATE, 'Aucune partie en cours.');
    return this.#game;
  }

  #changed() {
    this.emit('change');
  }
}
