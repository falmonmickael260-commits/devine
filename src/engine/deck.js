/**
 * ============================================================
 *  GESTION DU PAQUET (sélection des cartes de la partie)
 * ============================================================
 * Règles :
 * - 15 cartes par joueur (rules.cardsPerPlayer) ;
 * - aucune carte en double dans le paquet ;
 * - le paquet est construit UNE SEULE FOIS au lancement de la partie,
 *   puis verrouillé (gelé) pour les 3 manches.
 */
import {
  ALL_CARDS,
  MIX_CATEGORY_ID,
  MIX_THEMES,
  getCardsByCategory,
  isValidCategory,
} from '../data/cards/index.js';
import { DEFAULT_RULES } from '../config/rules.js';
import { GameError, ERR } from './errors.js';
import { shuffle } from './utils/random.js';

/**
 * Normalise un titre pour détecter les doublons
 * ("Le Roi Lion" == "le roi lion" == "Le Roi-Lion").
 */
export function normalizeTitle(title) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Retire les cartes dont le titre normalisé apparaît déjà. */
function dedupeByTitle(cards) {
  const seen = new Set();
  return cards.filter((card) => {
    const key = normalizeTitle(card.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Réserve de cartes disponible pour une catégorie.
 * - Catégorie classique : ses 80 cartes.
 * - MIX : ses 80 cartes exclusives + toutes les cartes des 4 autres catégories.
 */
export function getCardPool(categoryId) {
  if (!isValidCategory(categoryId)) {
    throw new GameError(ERR.UNKNOWN_CATEGORY, `Catégorie inconnue : ${categoryId}`);
  }
  if (categoryId === MIX_CATEGORY_ID) return dedupeByTitle(ALL_CARDS);
  return [...getCardsByCategory(categoryId)];
}

/** Nombre de cartes nécessaires pour N joueurs. */
export function getRequiredCardCount(playerCount, rules = DEFAULT_RULES) {
  return playerCount * rules.cardsPerPlayer;
}

/** Nombre maximum de joueurs supporté par une catégorie (taille de la réserve / 15). */
export function getMaxPlayersForCategory(categoryId, rules = DEFAULT_RULES) {
  return Math.floor(getCardPool(categoryId).length / rules.cardsPerPlayer);
}

/**
 * Construit le paquet de la partie.
 * @returns {ReadonlyArray<object>} cartes (gelées), sans doublon
 */
export function buildDeck({ categoryId, playerCount, rules = DEFAULT_RULES, rng = Math.random }) {
  const needed = getRequiredCardCount(playerCount, rules);
  const pool = getCardPool(categoryId);

  if (pool.length < needed) {
    throw new GameError(
      ERR.NOT_ENOUGH_CARDS,
      `La catégorie contient ${pool.length} cartes : impossible de jouer à ${playerCount} joueurs ` +
        `(${needed} cartes nécessaires). Maximum : ${Math.floor(pool.length / rules.cardsPerPlayer)} joueurs.`,
      { available: pool.length, needed },
    );
  }

  const picked =
    categoryId === MIX_CATEGORY_ID
      ? pickBalancedByTheme(pool, needed, rng)
      : shuffle(pool, rng).slice(0, needed);

  return Object.freeze(shuffle(picked, rng));
}

/**
 * MIX : tirage équilibré entre les 4 thèmes (tourniquet).
 * Avec 60 cartes → 15 par thème. Si un thème venait à manquer de cartes,
 * les autres thèmes complètent automatiquement.
 */
function pickBalancedByTheme(pool, needed, rng) {
  const buckets = MIX_THEMES.map((theme) =>
    shuffle(pool.filter((card) => card.theme === theme), rng),
  );
  const picked = [];
  let themeIndex = 0;

  while (picked.length < needed && buckets.some((bucket) => bucket.length > 0)) {
    const bucket = buckets[themeIndex % buckets.length];
    if (bucket.length > 0) picked.push(bucket.pop());
    themeIndex += 1;
  }
  return picked;
}
