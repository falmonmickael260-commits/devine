/**
 * API publique du package DEVINE.
 * Tout ce dont l'interface (phase 2) ou d'autres outils peuvent avoir besoin.
 */

// Règles
export { DEFAULT_RULES, ROUNDS, resolveRules } from './config/rules.js';

// Cartes
export {
  CATEGORIES, MIX_CATEGORY_ID, MIX_THEMES, ALL_CARDS,
  getCardsByCategory, getCardById, isValidCategory,
} from './data/cards/index.js';

// Moteur
export { Game, GAME_STATUS, TURN_END_REASON, DRAW_ACTIONS } from './engine/game.js';
export { buildDeck, getCardPool, getMaxPlayersForCategory, getRequiredCardCount } from './engine/deck.js';
export { RoundPile } from './engine/roundPile.js';
export { TurnOrder } from './engine/turnOrder.js';
export { TurnTimer } from './engine/timer.js';
export { Scoreboard } from './engine/scoring.js';
export { DrawingBoard, DRAWING_TOOLS, DRAWING_LIMITS, DEFAULT_PALETTE } from './engine/drawing.js';
export { distributePlayers, validateTeams, TEAM_PRESETS } from './engine/teams.js';
export { realClock, FakeClock } from './engine/clock.js';
export { createSeededRng, shuffle } from './engine/utils/random.js';
export { GameError, ERR } from './engine/errors.js';

// Multijoueur
export { Room, ROOM_STATUS } from './multiplayer/room.js';
export { RoomManager } from './multiplayer/roomManager.js';
export { createDevineServer } from './multiplayer/socketServer.js';
