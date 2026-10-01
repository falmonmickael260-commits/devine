/**
 * Messages courts en haut de l'écran.
 *   toast('Code copié', 'success')     toast(error.message, 'error')
 */
import { h } from '../core/dom.js';
import { play } from '../core/sound.js';

const container = document.getElementById('toasts');
const DURATION_MS = 3200;

export function toast(message, type = 'info') {
  const el = h('div', { class: `toast toast--${type}` }, message);
  container.append(el);
  if (type === 'error') play('error');

  // On garde au maximum 3 messages à l'écran
  while (container.children.length > 3) container.firstElementChild.remove();

  setTimeout(() => {
    el.classList.add('is-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, DURATION_MS);
}
