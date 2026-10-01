/**
 * ============================================================
 *  DEVINE — MOTEUR DE PARTIE
 * ============================================================
 * Orchestration d'une partie complète :
 *   Manche 1 (Description) → Manche 2 (Un seul mot) → Manche 3 (Dessin)
 *
 * Ce moteur ne connaît NI le réseau NI l'interface :
 * - il reçoit des actions (markFound, passCard, draw...) ;
 * - il émet des événements ('event', 'drawing') ;
 * - il expose un état sérialisable (getPublicState / getStateFor).
 *
 * Cycle de vie :
 *   created → playing ⇄ round_over → ... → finished
 *
 * Événements émis via game.on('event', (e) => ...) — e.type vaut :
 *   'round:start' | 'turn:start' | 'card:found' | 'card:passed' |
 *   'turn:end' | 'round:end' | 'game:end' | 'player:connection'
 * ⚠️ Aucun événement ne contient la carte active (anti-triche) :
 *    seule une carte TROUVÉE est révélée.
 */
import { EventEmitter } from 'node:events';
import { DEFAULT_RULES, ROUNDS } from '../config/rules.js';
import { GameError, ERR } from './errors.js';
import { realClock } from './clock.js';
import { TurnTimer } from './timer.js';
import { TurnOrder } from './turnOrder.js';
import { RoundPile } from './roundPile.js';
import { Scoreboard } from './scoring.js';
import { DrawingBoard } from './drawing.js';
import { cloneTeams, distributePlayers, validateTeams } from './teams.js';

export const GAME_STATUS = Object.freeze({
  CREATED: 'created',
  PLAYING: 'playing',
  ROUND_OVER: 'round_over',
  FINISHED: 'finished',
});

/** Raisons possibles de fin de tour. */
export const TURN_END_REASON = Object.freeze({
  TIMEOUT: 'timeout', // chrono à 0
  ROUND_COMPLETE: 'round_complete', // dernière carte trouvée
  PLAYER_DISCONNECTED: 'player_disconnected',
});

/** Actions de dessin acceptées par game.draw(). */
export const DRAW_ACTIONS = Object.freeze([
  'stroke:begin', 'stroke:extend', 'stroke:end', 'undo', 'redo', 'clear',
]);

export class Game extends EventEmitter {
  #rules;
  #clock;
  #rng;

  /** @type {Map<string, {id:string, name:string, teamId:string, connected:boolean}>} */
  #players;
  #teams;
  /** Paquet initial VERROUILLÉ pour toute la partie. */
  #deck;
  #cardsById;

  #turnOrder;
  #timer;
  #scoreboard;
  #drawing;

  #status = GAME_STATUS.CREATED;
  #roundIndex = -1;
  /** @type {RoundPile | null} */
  #pile = null;
  /** Tour en cours (null entre deux tours / manches). */
  #turn = null;
  #turnCounter = 0;
  /** Incrémenté à chaque nouvelle carte affichée : le client efface la zone de dessin quand il change. */
  #cardSeq = 0;
  #lastUnresolvedCardId = null;
  #roundStartedAt = null;
  #roundTimings = [];
  #transitionHandle = null;
  #nextRoundAt = null;
  #results = null;

  /**
   * @param {object} params
   * @param {{id:string, name:string, connected?:boolean}[]} params.players
   * @param {{id:string, name:string, playerIds:string[]}[]} [params.teams] Si absent : répartition automatique
   * @param {object[]} params.deck Paquet (voir engine/deck.js → buildDeck)
   * @param {object} [params.rules]
   * @param {object} [params.clock]
   * @param {() => number} [params.rng]
   */
  constructor({ players, teams = null, deck, rules = DEFAULT_RULES, clock = realClock, rng = Math.random }) {
    super();
    this.#rules = rules;
    this.#clock = clock;
    this.#rng = rng;

    // --- Joueurs ---
    if (!Array.isArray(players)) throw new GameError(ERR.INVALID_CONFIG, 'Liste de joueurs manquante.');
    if (players.length < rules.minPlayers) {
      throw new GameError(ERR.NOT_ENOUGH_PLAYERS, `Il faut au moins ${rules.minPlayers} joueurs.`);
    }
    if (players.length > rules.maxPlayers) {
      throw new GameError(ERR.TOO_MANY_PLAYERS, `${rules.maxPlayers} joueurs maximum.`);
    }
    const playerIds = players.map((player) => player.id);
    if (new Set(playerIds).size !== playerIds.length) {
      throw new GameError(ERR.INVALID_CONFIG, 'Deux joueurs ont le même identifiant.');
    }

    // --- Équipes ---
    this.#teams = teams
      ? cloneTeams(teams)
      : distributePlayers(playerIds, rules.teamCount, { shuffled: true, rng });
    validateTeams(this.#teams, playerIds, rules);
    const teamOfPlayer = new Map(this.#teams.flatMap((team) => team.playerIds.map((id) => [id, team.id])));

    this.#players = new Map(
      players.map((player) => [
        player.id,
        { id: player.id, name: player.name, teamId: teamOfPlayer.get(player.id), connected: player.connected ?? true },
      ]),
    );

    // --- Paquet : 15 cartes par joueur, sans doublon, gelé ---
    const expectedSize = players.length * rules.cardsPerPlayer;
    if (!Array.isArray(deck) || deck.length !== expectedSize) {
      throw new GameError(ERR.INVALID_DECK, `Le paquet doit contenir exactement ${expectedSize} cartes.`);
    }
    if (new Set(deck.map((card) => card.id)).size !== deck.length) {
      throw new GameError(ERR.INVALID_DECK, 'Le paquet contient des cartes en double.');
    }
    this.#deck = Object.freeze(deck.map((card) => Object.freeze({ ...card })));
    this.#cardsById = new Map(this.#deck.map((card) => [card.id, card]));

    // --- Modules ---
    this.#turnOrder = new TurnOrder(this.#teams);
    this.#timer = new TurnTimer(clock);
    this.#scoreboard = new Scoreboard({
      teams: this.#teams,
      players: [...this.#players.values()],
      roundsCount: ROUNDS.length,
      pointsPerCard: rules.pointsPerCard,
    });
    this.#drawing = new DrawingBoard();
  }

  /* ================================================================
   *  LECTURE
   * ================================================================ */

  get status() {
    return this.#status;
  }

  get currentRound() {
    return ROUNDS[this.#roundIndex] ?? null;
  }

  get activePlayerId() {
    return this.#turn?.playerId ?? null;
  }

  get teams() {
    return cloneTeams(this.#teams);
  }

  /** Copie du paquet initial (identique pour les 3 manches). */
  get deck() {
    return [...this.#deck];
  }

  get results() {
    return this.#results;
  }

  /* ================================================================
   *  DÉROULEMENT
   * ================================================================ */

  /** Lance la partie (manche 1, premier tour : A1). */
  start() {
    if (this.#status !== GAME_STATUS.CREATED) {
      throw new GameError(ERR.INVALID_STATE, 'La partie a déjà commencé.');
    }
    this.#startRound(0);
  }

  /** TROUVÉ — appelé par le joueur actif. */
  markFound(playerId) {
    this.#assertCanAct(playerId);
    const turn = this.#turn;

    const cardId = this.#pile.markCurrentFound();
    turn.found.push(cardId);
    this.#scoreboard.recordFound({ roundIndex: this.#roundIndex, playerId, teamId: turn.teamId, cardId });
    this.#drawing.reset();
    this.#cardSeq += 1;

    const card = this.#cardsById.get(cardId);
    this.#emitEvent('card:found', {
      playerId,
      teamId: turn.teamId,
      card: { id: card.id, title: card.title }, // une carte trouvée peut être révélée à tous
      cardsRemaining: this.#pile.remainingCount,
    });

    // Dernière carte trouvée → fin du tour ET de la manche.
    if (this.#pile.isEmpty) this.#endTurn(TURN_END_REASON.ROUND_COMPLETE);
    return { cardId, cardsRemaining: this.#pile?.remainingCount ?? 0 };
  }

  /** PASSER — la carte reste dans la manche et reviendra plus tard. */
  passCard(playerId) {
    this.#assertCanAct(playerId);
    const turn = this.#turn;

    this.#pile.passCurrent();
    turn.passed += 1;
    this.#scoreboard.recordPass({ playerId });
    this.#drawing.reset();
    this.#cardSeq += 1;

    // On NE révèle PAS la carte passée.
    this.#emitEvent('card:passed', { playerId, teamId: turn.teamId });
    return { cardsRemaining: this.#pile.remainingCount };
  }

  /**
   * Passe à la manche suivante.
   * Appelé automatiquement après rules.roundTransitionMs,
   * ou manuellement (par l'hôte) si roundTransitionMs = null.
   */
  startNextRound() {
    if (this.#status !== GAME_STATUS.ROUND_OVER) {
      throw new GameError(ERR.INVALID_STATE, 'La manche en cours n’est pas terminée.');
    }
    this.#clearTransition();
    this.#startRound(this.#roundIndex + 1);
  }

  /** Mise à jour de la connexion d'un joueur. */
  setPlayerConnected(playerId, connected) {
    const player = this.#players.get(playerId);
    if (!player || player.connected === connected) return;
    player.connected = connected;
    this.#emitEvent('player:connection', { playerId, connected });

    const isActive = this.#turn?.playerId === playerId;
    if (!connected && isActive && this.#rules.endTurnOnDisconnect && this.#status === GAME_STATUS.PLAYING) {
      this.#endTurn(TURN_END_REASON.PLAYER_DISCONNECTED);
    }
  }

  /** Arrête tous les timers (à appeler quand la partie est abandonnée). */
  destroy() {
    this.#timer.stop();
    this.#clearTransition();
    this.removeAllListeners();
  }

  /* ================================================================
   *  DESSIN (manche 3)
   * ================================================================ */

  /**
   * Action de dessin du joueur actif.
   * @param {string} playerId
   * @param {'stroke:begin'|'stroke:extend'|'stroke:end'|'undo'|'redo'|'clear'} action
   * @param {object} data
   * @returns {{action:string, data:object, cardSeq:number} | null} null = rien à relayer
   */
  draw(playerId, action, data = {}) {
    this.#assertCanAct(playerId);
    if (!this.currentRound.drawingEnabled) {
      throw new GameError(ERR.DRAWING_DISABLED, 'Le dessin n’est disponible qu’en manche 3.');
    }

    let result;
    switch (action) {
      case 'stroke:begin':
        result = this.#drawing.beginStroke(data);
        break;
      case 'stroke:extend':
        result = this.#drawing.extendStroke(data.strokeId, data.points);
        break;
      case 'stroke:end':
        result = this.#drawing.endStroke(data.strokeId);
        break;
      case 'undo':
        result = this.#drawing.undo() ? {} : null;
        break;
      case 'redo':
        result = this.#drawing.redo() ? {} : null;
        break;
      case 'clear':
        result = this.#drawing.clear() ? {} : null;
        break;
      default:
        throw new GameError(ERR.INVALID_ACTION, `Action de dessin inconnue : ${action}`);
    }
    if (result === null) return null;

    const message = { action, data: result, cardSeq: this.#cardSeq };
    this.emit('drawing', message);
    return message;
  }

  /** Dessin complet de la carte en cours (reconnexion d'un joueur). */
  getDrawingSnapshot() {
    if (this.#status !== GAME_STATUS.PLAYING || !this.currentRound?.drawingEnabled) return null;
    return { cardSeq: this.#cardSeq, ...this.#drawing.snapshot() };
  }

  /* ================================================================
   *  ÉTAT SÉRIALISABLE (envoyé aux clients)
   * ================================================================ */

  /** État visible par TOUS (ne contient jamais la carte active). */
  getPublicState() {
    const now = this.#clock.now();
    const round = this.currentRound;
    const scores = new Map(this.#scoreboard.getTeamScores().map((score) => [score.teamId, score]));
    const isConnected = (id) => this.#players.get(id).connected;

    return {
      status: this.#status,
      serverNow: now,
      round: round
        ? {
            index: this.#roundIndex,
            number: round.number,
            id: round.id,
            label: round.label,
            instruction: round.instruction,
            drawingEnabled: round.drawingEnabled,
          }
        : null,
      totalRounds: ROUNDS.length,
      deckSize: this.#deck.length,
      cardsRemaining: this.#status === GAME_STATUS.FINISHED ? 0 : this.#pile?.remainingCount ?? this.#deck.length,
      cardsFoundThisRound: this.#pile ? this.#pile.foundCount : 0,
      teams: this.#teams.map((team) => ({
        id: team.id,
        name: team.name,
        playerIds: [...team.playerIds],
        score: scores.get(team.id).total,
        roundScores: scores.get(team.id).roundScores,
      })),
      players: [...this.#players.values()].map((player) => ({ ...player })),
      turn: this.#turn
        ? {
            number: this.#turn.number,
            playerId: this.#turn.playerId,
            teamId: this.#turn.teamId,
            slotLabel: this.#turn.slotLabel,
            startedAt: this.#turn.startedAt,
            endsAt: this.#turn.endsAt,
            durationMs: this.#rules.turnDurationMs,
            remainingMs: this.#timer.remainingMs(),
            foundCount: this.#turn.found.length,
            passedCount: this.#turn.passed,
            cardSeq: this.#cardSeq,
          }
        : null,
      nextTurn: this.#status === GAME_STATUS.FINISHED ? null : this.#turnOrder.peek(isConnected),
      nextRoundAt: this.#status === GAME_STATUS.ROUND_OVER ? this.#nextRoundAt : null,
      results: this.#results,
    };
  }

  /**
   * État pour UN joueur.
   * La carte active n'est envoyée QU'AU joueur actif (manches 1, 2 et 3).
   */
  getStateFor(viewerId) {
    const state = this.getPublicState();
    const isActivePlayer = this.#status === GAME_STATUS.PLAYING && this.#turn?.playerId === viewerId;
    const card = isActivePlayer ? this.#cardsById.get(this.#pile.currentCardId) : null;

    return {
      ...state,
      isActivePlayer,
      activeCard: card ? { id: card.id, title: card.title, difficulty: card.difficulty, theme: card.theme } : null,
    };
  }

  /* ================================================================
   *  LOGIQUE INTERNE
   * ================================================================ */

  #startRound(roundIndex) {
    this.#roundIndex = roundIndex;
    this.#status = GAME_STATUS.PLAYING;
    this.#nextRoundAt = null;

    // ⚠️ On repart TOUJOURS du même paquet initial : aucune nouvelle carte.
    this.#pile = new RoundPile(this.#deck.map((card) => card.id), this.#rng);
    this.#lastUnresolvedCardId = null;
    this.#roundStartedAt = this.#clock.now();

    if (this.#rules.restartTurnOrderEachRound) this.#turnOrder.reset();

    this.#emitEvent('round:start', {
      roundIndex,
      roundNumber: this.currentRound.number,
      roundId: this.currentRound.id,
      label: this.currentRound.label,
    });
    this.#startNextTurn();
  }

  #startNextTurn() {
    const slot = this.#turnOrder.next((id) => this.#players.get(id).connected);

    this.#pile.shuffleRemaining({ avoidFirstId: this.#lastUnresolvedCardId });
    this.#lastUnresolvedCardId = null;
    this.#drawing.reset();
    this.#turnCounter += 1;
    this.#cardSeq += 1;

    const startedAt = this.#clock.now();
    this.#turn = {
      number: this.#turnCounter,
      roundIndex: this.#roundIndex,
      ...slot,
      startedAt,
      endsAt: startedAt + this.#rules.turnDurationMs,
      found: [],
      passed: 0,
    };
    this.#timer.start(this.#rules.turnDurationMs, () => this.#endTurn(TURN_END_REASON.TIMEOUT));

    this.#emitEvent('turn:start', {
      turnNumber: this.#turn.number,
      playerId: slot.playerId,
      teamId: slot.teamId,
      slotLabel: slot.slotLabel,
      endsAt: this.#turn.endsAt,
    });
  }

  #endTurn(reason) {
    const turn = this.#turn;
    if (!turn) return;

    this.#timer.stop();
    this.#turn = null;

    // La carte en main quand le tour s'arrête reste dans la manche.
    if (!this.#pile.isEmpty) this.#lastUnresolvedCardId = this.#pile.currentCardId;

    const durationMs = this.#clock.now() - turn.startedAt;
    this.#scoreboard.recordTurn({
      roundIndex: turn.roundIndex,
      turnNumber: turn.number,
      playerId: turn.playerId,
      teamId: turn.teamId,
      found: turn.found.length,
      passed: turn.passed,
      durationMs,
      reason,
    });

    this.#emitEvent('turn:end', {
      turnNumber: turn.number,
      playerId: turn.playerId,
      teamId: turn.teamId,
      slotLabel: turn.slotLabel,
      reason,
      foundCount: turn.found.length,
      passedCount: turn.passed,
      durationMs,
    });

    // La rotation continue jusqu'à ce que toutes les cartes soient trouvées.
    if (this.#pile.isEmpty) this.#endRound();
    else this.#startNextTurn();
  }

  #endRound() {
    this.#status = GAME_STATUS.ROUND_OVER;
    this.#roundTimings[this.#roundIndex] = { startedAt: this.#roundStartedAt, endedAt: this.#clock.now() };

    const isLastRound = this.#roundIndex === ROUNDS.length - 1;
    this.#emitEvent('round:end', {
      roundIndex: this.#roundIndex,
      roundNumber: this.currentRound.number,
      isLastRound,
      summary: this.#scoreboard.getRoundSummary(this.#roundIndex, this.#cardsById),
      scores: this.#scoreboard.getTeamScores(),
    });

    if (isLastRound) {
      this.#finish();
      return;
    }

    if (this.#rules.roundTransitionMs !== null) {
      this.#nextRoundAt = this.#clock.now() + this.#rules.roundTransitionMs;
      this.#transitionHandle = this.#clock.setTimeout(() => {
        this.#transitionHandle = null;
        this.startNextRound();
      }, this.#rules.roundTransitionMs);
    }
  }

  #finish() {
    this.#status = GAME_STATUS.FINISHED;
    this.#pile = null;
    this.#results = this.#scoreboard.buildResults({
      teams: this.#teams,
      rounds: ROUNDS,
      cardsById: this.#cardsById,
      deck: this.#deck,
      roundTimings: this.#roundTimings,
    });
    this.#emitEvent('game:end', { results: this.#results });
  }

  /** Seul le joueur actif peut agir, et seulement pendant son chrono. */
  #assertCanAct(playerId) {
    if (this.#status !== GAME_STATUS.PLAYING || !this.#turn) {
      throw new GameError(ERR.INVALID_STATE, 'Aucun tour en cours.');
    }
    if (this.#turn.playerId !== playerId) {
      throw new GameError(ERR.NOT_YOUR_TURN, 'Ce n’est pas ton tour.');
    }
    // Sécurité : une action arrivée après la fin du chrono est refusée,
    // même si le timer n'a pas encore été traité par la boucle d'événements.
    if (this.#clock.now() >= this.#turn.endsAt) {
      this.#endTurn(TURN_END_REASON.TIMEOUT);
      throw new GameError(ERR.TURN_OVER, 'Temps écoulé !');
    }
  }

  #clearTransition() {
    if (this.#transitionHandle !== null) this.#clock.clearTimeout(this.#transitionHandle);
    this.#transitionHandle = null;
    this.#nextRoundAt = null;
  }

  #emitEvent(type, data) {
    this.emit('event', { type, at: this.#clock.now(), ...data });
  }
}
