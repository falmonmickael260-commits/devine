/**
 * Erreurs « métier » du jeu.
 * Chaque erreur a un code stable (pour la logique côté client)
 * et un message en français (affichable directement dans l'interface).
 */

export const ERR = Object.freeze({
  // Configuration / joueurs / équipes
  INVALID_CONFIG: 'INVALID_CONFIG',
  NOT_ENOUGH_PLAYERS: 'NOT_ENOUGH_PLAYERS',
  TOO_MANY_PLAYERS: 'TOO_MANY_PLAYERS',
  INVALID_TEAMS: 'INVALID_TEAMS',
  TEAM_TOO_SMALL: 'TEAM_TOO_SMALL',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  PLAYER_DISCONNECTED: 'PLAYER_DISCONNECTED',

  // Cartes
  UNKNOWN_CATEGORY: 'UNKNOWN_CATEGORY',
  CATEGORY_REQUIRED: 'CATEGORY_REQUIRED',
  NOT_ENOUGH_CARDS: 'NOT_ENOUGH_CARDS',
  INVALID_DECK: 'INVALID_DECK',

  // Déroulement
  INVALID_STATE: 'INVALID_STATE',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  TURN_OVER: 'TURN_OVER',
  INVALID_ACTION: 'INVALID_ACTION',

  // Dessin
  DRAWING_DISABLED: 'DRAWING_DISABLED',
  INVALID_DRAWING: 'INVALID_DRAWING',
  DRAWING_LIMIT: 'DRAWING_LIMIT',

  // Salons
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  GAME_IN_PROGRESS: 'GAME_IN_PROGRESS',
  NAME_TAKEN: 'NAME_TAKEN',
  INVALID_NAME: 'INVALID_NAME',
  NOT_HOST: 'NOT_HOST',
  NOT_IN_ROOM: 'NOT_IN_ROOM',
  INVALID_SESSION: 'INVALID_SESSION',
});

export class GameError extends Error {
  /**
   * @param {string} code    Un des codes de ERR
   * @param {string} message Message lisible en français
   * @param {object} [details] Infos complémentaires (optionnel)
   */
  constructor(code, message, details = undefined) {
    super(message);
    this.name = 'GameError';
    this.code = code;
    this.details = details;
  }
}
