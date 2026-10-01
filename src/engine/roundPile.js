/**
 * ============================================================
 *  PILE D'UNE MANCHE
 * ============================================================
 * À chaque manche, on crée une nouvelle pile À PARTIR DU MÊME PAQUET INITIAL.
 * Le paquet lui-même n'est jamais modifié ni remplacé.
 *
 * Fonctionnement (file d'attente) :
 * - la carte active est toujours la première de la file ;
 * - TROUVÉ  → la carte sort de la file (retirée pour la manche) ;
 * - PASSER  → la carte repart en fin de file (elle reviendra plus tard) ;
 * - au début de chaque tour, les cartes restantes sont re-mélangées.
 */
import { GameError, ERR } from './errors.js';
import { shuffle } from './utils/random.js';

export class RoundPile {
  /** @type {string[]} ids des cartes restant à trouver (index 0 = carte active) */
  #queue;
  /** @type {string[]} ids des cartes trouvées, dans l'ordre */
  #found = [];
  #rng;

  /**
   * @param {string[]} cardIds Ids du paquet initial
   * @param {() => number} rng
   */
  constructor(cardIds, rng = Math.random) {
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      throw new GameError(ERR.INVALID_DECK, 'Une manche ne peut pas commencer sans cartes.');
    }
    this.#rng = rng;
    this.#queue = shuffle(cardIds, rng);
  }

  /** Id de la carte actuellement affichée au joueur actif (null si manche finie). */
  get currentCardId() {
    return this.#queue[0] ?? null;
  }

  get remainingCount() {
    return this.#queue.length;
  }

  get foundCount() {
    return this.#found.length;
  }

  get foundCardIds() {
    return [...this.#found];
  }

  get isEmpty() {
    return this.#queue.length === 0;
  }

  /** TROUVÉ : retire la carte active de la manche. */
  markCurrentFound() {
    this.#assertNotEmpty();
    const cardId = this.#queue.shift();
    this.#found.push(cardId);
    return cardId;
  }

  /** PASSER : la carte active reste disponible, elle repart en fin de file. */
  passCurrent() {
    this.#assertNotEmpty();
    const cardId = this.#queue.shift();
    this.#queue.push(cardId);
    return cardId;
  }

  /**
   * Re-mélange les cartes restantes (début de tour).
   * avoidFirstId : évite de redonner en premier la carte que le joueur
   * précédent avait en main quand son chrono s'est terminé.
   */
  shuffleRemaining({ avoidFirstId = null } = {}) {
    this.#queue = shuffle(this.#queue, this.#rng);
    if (avoidFirstId && this.#queue.length > 1 && this.#queue[0] === avoidFirstId) {
      this.#queue.push(this.#queue.shift());
    }
  }

  #assertNotEmpty() {
    if (this.isEmpty) {
      throw new GameError(ERR.INVALID_STATE, 'Toutes les cartes de la manche ont été trouvées.');
    }
  }
}
