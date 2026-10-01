/**
 * Codes de partie privée (ex : "K7M2X").
 * Alphabet sans caractères ambigus (pas de I, L, O, 0, 1) pour une saisie facile.
 */
import { randomInt } from 'node:crypto';

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;

/**
 * @param {number} length
 * @param {(max:number) => number} randomIndex  tirage d'un entier dans [0, max[ (crypto par défaut)
 */
export function generateRoomCode(length = ROOM_CODE_LENGTH, randomIndex = randomInt) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_ALPHABET[randomIndex(ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

/** Nettoie un code saisi par un joueur (" k7m-2x " → "K7M2X"). null si invalide. */
export function normalizeRoomCode(input) {
  if (typeof input !== 'string') return null;
  const code = input.trim().toUpperCase().replace(/[\s-]/g, '');
  return /^[A-Z0-9]{3,10}$/.test(code) ? code : null;
}
