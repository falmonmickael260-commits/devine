/**
 * ============================================================
 *  DEVINE — RÈGLES OFFICIELLES
 * ============================================================
 * Toutes les valeurs réglables du jeu sont centralisées ici.
 * Pour modifier une règle (durée d'un tour, nombre de cartes...),
 * on change UNIQUEMENT ce fichier : le moteur s'adapte.
 */

/** Valeurs par défaut des règles. */
export const DEFAULT_RULES = Object.freeze({
  /** Nombre de cartes ajoutées au paquet pour chaque joueur. */
  cardsPerPlayer: 15,

  /** Nombre minimum / maximum de joueurs dans une partie. */
  minPlayers: 4,
  maxPlayers: 8,

  /** Nombre d'équipes (2 par défaut : A et B). Extensible jusqu'à 4. */
  teamCount: 2,

  /** Une équipe doit avoir au moins 2 joueurs (un qui fait deviner, un qui devine). */
  minPlayersPerTeam: 2,

  /** Durée d'un tour, en millisecondes (60 secondes). */
  turnDurationMs: 60_000,

  /** Points gagnés par carte trouvée. */
  pointsPerCard: 1,

  /**
   * Pause entre deux manches (affichage du récapitulatif), en millisecondes.
   * null = la manche suivante ne démarre que lorsque l'hôte la lance.
   */
  roundTransitionMs: 8_000,

  /**
   * false = la rotation continue d'une manche à l'autre (le joueur suivant
   *         dans l'ordre A1 → B1 → A2 → B2 commence la manche suivante) ;
   * true  = chaque manche recommence par A1.
   */
  restartTurnOrderEachRound: false,

  /** Si le joueur actif se déconnecte, son tour se termine immédiatement. */
  endTurnOnDisconnect: true,
});

/**
 * Fusionne des règles personnalisées avec les règles par défaut.
 * Refuse les clés inconnues pour éviter les fautes de frappe silencieuses.
 * @param {Partial<typeof DEFAULT_RULES>} overrides
 */
export function resolveRules(overrides = {}) {
  const unknownKeys = Object.keys(overrides).filter((key) => !(key in DEFAULT_RULES));
  if (unknownKeys.length > 0) {
    throw new Error(`Règles inconnues : ${unknownKeys.join(', ')}`);
  }
  return Object.freeze({ ...DEFAULT_RULES, ...overrides });
}

/**
 * Les 3 manches, dans l'ordre. Le paquet est STRICTEMENT le même pour les 3.
 * - drawingEnabled : active l'outil de dessin (manche 3 uniquement).
 */
export const ROUNDS = Object.freeze([
  Object.freeze({
    number: 1,
    id: 'description',
    label: 'Description',
    instruction: 'Fais deviner la carte à ton équipe en parlant librement, sans dire le mot affiché.',
    drawingEnabled: false,
  }),
  Object.freeze({
    number: 2,
    id: 'one_word',
    label: 'Un seul mot',
    instruction: 'Tu ne peux dire qu’un seul mot pour faire deviner la carte.',
    drawingEnabled: false,
  }),
  Object.freeze({
    number: 3,
    id: 'drawing',
    label: 'Dessin',
    instruction: 'Dessine la carte : ton équipe ne voit que ton dessin.',
    drawingEnabled: true,
  }),
]);
