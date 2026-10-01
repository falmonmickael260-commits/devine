/**
 * Logo DEVINE, style « jeu vidéo » :
 * lettres épaisses dorées, contour encre, relief 3D, reflet brillant.
 * Deux couches superposées : contour/relief derrière, remplissage devant.
 *
 *   createLogo()                → grand logo (menu)
 *   createLogo({ small: true }) → petit logo (barres du haut)
 */
import { h } from '../core/dom.js';

export function createLogo({ small = false } = {}) {
  const letters = [...'DEVINE'];
  const layer = (className) =>
    h('span', { class: className, 'aria-hidden': 'true' },
      letters.map((letter, i) => h('span', { class: 'logo__letter', style: { '--i': i } }, letter)),
    );

  const el = h('div', { class: `brand${small ? ' brand--small' : ''}` },
    h('h1', { class: 'logo' },
      h('span', { class: 'visually-hidden' }, 'DEVINE'),
      layer('logo__back'),
      layer('logo__front'),
    ),
    small ? null : h('span', { class: 'logo-qmark', 'aria-hidden': 'true' }, '?'),
  );

  // Compatibilité avec les écrans existants (rien à nettoyer ici)
  el.destroyLogo = () => {};
  return el;
}
