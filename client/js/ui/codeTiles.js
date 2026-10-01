/**
 * Code de partie affiché en tuiles lumineuses (style tableau d'affichage).
 *   createCodeTiles('X7K9P', { animate: true })
 */
import { h } from '../core/dom.js';
import { play } from '../core/sound.js';

export function createCodeTiles(code, { animate = false } = {}) {
  const tiles = [...code].map((char, i) =>
    h('span', { class: `code-tile${animate ? ' is-flipping' : ''}`, style: { '--i': i } }, char),
  );

  // Petit « clic » mécanique à chaque lettre qui se retourne
  if (animate) tiles.forEach((_, i) => setTimeout(() => play('tick'), 120 + i * 90));

  return h('div', { class: 'code-tiles', role: 'img', 'aria-label': `Code de la partie : ${code.split('').join(' ')}` }, tiles);
}
