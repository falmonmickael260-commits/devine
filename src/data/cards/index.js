/**
 * Point d'entrée de la base de données des cartes.
 * 5 catégories × 80 cartes = 400 cartes.
 */
import personnalites from './personnalites.js';
import filmsSeries from './films-series.js';
import sport from './sport.js';
import disney from './disney.js';
import mix from './mix.js';

/** Id de la catégorie « mélange ». */
export const MIX_CATEGORY_ID = 'mix';

/** Les 5 catégories, dans l'ordre d'affichage. */
export const CATEGORIES = Object.freeze([
  Object.freeze({ id: 'personnalites', label: 'Personnalités', emoji: '👤' }),
  Object.freeze({ id: 'films_series', label: 'Films & Séries', emoji: '🎬' }),
  Object.freeze({ id: 'sport', label: 'Sport', emoji: '⚽' }),
  Object.freeze({ id: 'disney', label: 'Disney', emoji: '🏰' }),
  Object.freeze({ id: MIX_CATEGORY_ID, label: 'Mix', emoji: '🎲' }),
]);

/** Thèmes que la catégorie MIX doit équilibrer. */
export const MIX_THEMES = Object.freeze(['personnalites', 'films_series', 'sport', 'disney']);

const CARDS_BY_CATEGORY = Object.freeze({
  personnalites,
  films_series: filmsSeries,
  sport,
  disney,
  mix,
});

/** Toutes les cartes de la base. */
export const ALL_CARDS = Object.freeze(Object.values(CARDS_BY_CATEGORY).flat());

const CARDS_BY_ID = new Map(ALL_CARDS.map((card) => [card.id, card]));

export function isValidCategory(categoryId) {
  return CATEGORIES.some((category) => category.id === categoryId);
}

/** Cartes « propres » d'une catégorie (80). */
export function getCardsByCategory(categoryId) {
  return CARDS_BY_CATEGORY[categoryId] ?? [];
}

export function getCardById(cardId) {
  return CARDS_BY_ID.get(cardId) ?? null;
}
