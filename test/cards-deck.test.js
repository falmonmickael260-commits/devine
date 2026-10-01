import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_CARDS, CATEGORIES, MIX_THEMES, getCardsByCategory } from '../src/data/cards/index.js';
import { buildDeck, normalizeTitle } from '../src/engine/deck.js';
import { DEFAULT_RULES } from '../src/config/rules.js';
import { createSeededRng } from '../src/engine/utils/random.js';
import { ERR } from '../src/engine/errors.js';

test('la base contient 5 catégories × 80 cartes = 400 cartes', () => {
  assert.equal(CATEGORIES.length, 5);
  for (const category of CATEGORIES) {
    assert.equal(getCardsByCategory(category.id).length, 80, category.id);
  }
  assert.equal(ALL_CARDS.length, 400);
});

test('chaque carte a un id unique, une catégorie, un titre et une difficulté valide', () => {
  const ids = new Set();
  for (const card of ALL_CARDS) {
    assert.ok(!ids.has(card.id), `id en double : ${card.id}`);
    ids.add(card.id);
    assert.ok(card.title.length > 0);
    assert.ok(['facile', 'moyen', 'difficile'].includes(card.difficulty));
    assert.ok(CATEGORIES.some((c) => c.id === card.category));
  }
});

test('aucun titre en double dans toute la base (y compris MIX)', () => {
  const seen = new Map();
  for (const card of ALL_CARDS) {
    const key = normalizeTitle(card.title);
    assert.ok(!seen.has(key), `"${card.title}" (${card.id}) existe déjà (${seen.get(key)})`);
    seen.set(key, card.id);
  }
});

test('les cartes MIX sont réparties 20 / 20 / 20 / 20 entre les 4 thèmes', () => {
  const mix = getCardsByCategory('mix');
  for (const theme of MIX_THEMES) {
    assert.equal(mix.filter((card) => card.theme === theme).length, 20, theme);
  }
});

test('le paquet = 15 cartes par joueur, sans doublon', () => {
  for (const players of [4, 5]) {
    const deck = buildDeck({ categoryId: 'sport', playerCount: players, rng: createSeededRng(1) });
    assert.equal(deck.length, players * 15);
    assert.equal(new Set(deck.map((c) => c.id)).size, deck.length);
    assert.ok(deck.every((card) => card.category === 'sport'));
    assert.ok(Object.isFrozen(deck), 'le paquet doit être verrouillé');
  }
});

test('MIX : 4 à 8 joueurs, paquet équilibré entre les thèmes', () => {
  for (let players = 4; players <= 8; players++) {
    const deck = buildDeck({ categoryId: 'mix', playerCount: players, rng: createSeededRng(players) });
    assert.equal(deck.length, players * 15);
    assert.equal(new Set(deck.map((c) => normalizeTitle(c.title))).size, deck.length);
    const perTheme = MIX_THEMES.map((theme) => deck.filter((c) => c.theme === theme).length);
    assert.ok(Math.max(...perTheme) - Math.min(...perTheme) <= 1, `déséquilibre : ${perTheme}`);
  }
});

test('catégorie simple : erreur claire au-delà de 5 joueurs (80 cartes / 15)', () => {
  assert.throws(
    () => buildDeck({ categoryId: 'disney', playerCount: 6, rules: DEFAULT_RULES }),
    (error) => error.code === ERR.NOT_ENOUGH_CARDS,
  );
});

test('catégorie inconnue refusée', () => {
  assert.throws(() => buildDeck({ categoryId: 'cuisine', playerCount: 4 }), (e) => e.code === ERR.UNKNOWN_CATEGORY);
});
