/**
 * Registre de tous les salons actifs du serveur.
 */
import { DEFAULT_RULES } from '../config/rules.js';
import { GameError, ERR } from '../engine/errors.js';
import { realClock } from '../engine/clock.js';
import { Room } from './room.js';
import { generateRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from './roomCodes.js';

export class RoomManager {
  /** @type {Map<string, Room>} */
  #rooms = new Map();
  #options;

  constructor({ rules = DEFAULT_RULES, clock = realClock, rng = Math.random, codeLength = ROOM_CODE_LENGTH } = {}) {
    this.#options = { rules, clock, rng, codeLength };
  }

  get size() {
    return this.#rooms.size;
  }

  /** Crée un salon avec un code unique. */
  createRoom() {
    let code;
    let attempts = 0;
    do {
      code = generateRoomCode(this.#options.codeLength);
      attempts += 1;
      if (attempts > 100) throw new Error('Impossible de générer un code de partie unique.');
    } while (this.#rooms.has(code));

    const { rules, clock, rng } = this.#options;
    const room = new Room({ code, rules, clock, rng });
    this.#rooms.set(code, room);
    return room;
  }

  getRoom(rawCode) {
    const code = normalizeRoomCode(rawCode);
    return code ? this.#rooms.get(code) ?? null : null;
  }

  /** Comme getRoom, mais lève une erreur lisible si le code est inconnu. */
  requireRoom(rawCode) {
    const room = this.getRoom(rawCode);
    if (!room) throw new GameError(ERR.ROOM_NOT_FOUND, 'Aucune partie ne correspond à ce code.');
    return room;
  }

  deleteRoom(code) {
    const room = this.#rooms.get(code);
    if (!room) return;
    room.destroy();
    this.#rooms.delete(code);
  }

  destroyAll() {
    for (const code of [...this.#rooms.keys()]) this.deleteRoom(code);
  }
}
