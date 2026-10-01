/**
 * ============================================================
 *  ÉCRAN 1 — MENU PRINCIPAL
 * ============================================================
 * Héros : éventail des 5 cartes du jeu qui se distribuent, puis le logo.
 * Deux actions seulement : CRÉER / REJOINDRE.
 * Options discrètes en haut : son, règles. Pseudo modifiable en bas.
 */
import { h } from '../core/dom.js';
import { go } from '../core/router.js';
import { play } from '../core/sound.js';
import { load } from '../core/storage.js';
import { createRoom } from '../core/session.js';
import { ICONS } from '../ui/icons.js';
import { createLogo } from '../ui/logo.js';
import { createCategoryVisual } from '../ui/categoryVisual.js';
import { createSoundToggle } from '../ui/soundToggle.js';
import { openNameSheet, openRulesSheet } from '../ui/sheets.js';
import { toast } from '../ui/toast.js';

/** Cartes de l'éventail (ordre de gauche à droite). */
const FAN_CARDS = [
  { id: 'sport', label: 'Sport' },
  { id: 'films_series', label: 'Films & Séries' },
  { id: 'personnalites', label: 'Personnalités' },
  { id: 'disney', label: 'Disney' },
  { id: 'mix', label: 'Mix' },
];

function createFan() {
  return h('div', { class: 'fan', 'aria-hidden': 'true' },
    FAN_CARDS.map((card, i) =>
      h('div', { class: 'fan__slot', style: { '--i': i, '--offset': i - 2, '--lift': Math.abs(i - 2) } },
        h('div', { class: 'fan-card', dataset: { cat: card.id } },
          h('span', { class: 'fan-card__corner' }, '?'),
          h('span', { class: 'fan-card__art' }, createCategoryVisual(card.id)),
          h('span', { class: 'fan-card__label' }, card.label),
        ),
      ),
    ),
  );
}

export function createMenuScreen() {
  const identity = h('div', { class: 'menu__identity' });

  const createButton = h('button', { class: 'btn btn--primary btn--xl btn--block', html: `${ICONS.gamepad}<span>Créer une partie</span>` });
  const joinButton = h('button', { class: 'btn btn--secondary btn--xl btn--block', html: `${ICONS.key}<span>Rejoindre une partie</span>` });

  // CRÉER : si le pseudo est connu, on crée la salle tout de suite.
  createButton.addEventListener('click', async () => {
    play('click');
    const name = load('name');
    if (!name) {
      go('create');
      return;
    }
    createButton.disabled = true;
    try {
      await createRoom(name);
      // L'état envoyé par le serveur amène automatiquement au lobby.
    } catch (error) {
      toast(error.message, 'error');
      createButton.disabled = false;
    }
  });

  joinButton.addEventListener('click', () => {
    play('click');
    go('join');
  });

  /** « Tu joues en tant que Mika ✎ » */
  function renderIdentity() {
    const name = load('name');
    identity.replaceChildren();
    if (!name) return;
    identity.append(
      h('span', {}, 'Tu joues en tant que'),
      h('button', { onClick: () => openNameSheet({ onSave: renderIdentity }), 'aria-label': 'Modifier ton pseudo' },
        h('span', {}, name),
        h('span', { html: ICONS.edit }),
      ),
    );
  }
  renderIdentity();

  const el = h('section', { class: 'menu', 'aria-label': 'Menu principal' },
    h('header', { class: 'topbar' },
      createSoundToggle(),
      h('button', { class: 'icon-btn', 'aria-label': 'Règles du jeu', html: ICONS.help, onClick: openRulesSheet }),
    ),
    h('div', { class: 'menu__hero' },
      createFan(),
      createLogo(),
      h('p', { class: 'menu__tagline' }, 'Décris, dis un seul mot, dessine.', h('br'), 'Les mêmes cartes pendant trois manches.'),
    ),
    h('div', { class: 'menu__actions' }, createButton, joinButton),
    identity,
  );

  return { el };
}
