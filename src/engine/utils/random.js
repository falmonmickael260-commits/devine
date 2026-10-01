/**
 * Utilitaires d'aléatoire.
 * Le moteur reçoit toujours une fonction `rng()` (0 <= n < 1) injectable :
 * - en production : Math.random
 * - en test / simulation : createSeededRng(seed) pour des parties reproductibles
 */

/**
 * Générateur pseudo-aléatoire déterministe (algorithme mulberry32).
 * @param {number} seed
 * @returns {() => number}
 */
export function createSeededRng(seed) {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mélange de Fisher-Yates. Ne modifie PAS le tableau d'origine.
 * @template T
 * @param {T[]} array
 * @param {() => number} rng
 * @returns {T[]}
 */
export function shuffle(array, rng = Math.random) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
