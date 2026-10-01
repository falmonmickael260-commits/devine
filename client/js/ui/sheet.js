/**
 * Fenêtre qui monte du bas de l'écran (centrée sur ordinateur).
 *   const close = openSheet({ title: 'Règles', content: element });
 */
import { h } from '../core/dom.js';
import { ICONS } from './icons.js';

export function openSheet({ title, content, onClose }) {
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
    onClose?.();
  };
  const onKey = (event) => {
    if (event.key === 'Escape') close();
  };

  const sheet = h(
    'div',
    { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'sheet__head' },
      h('h2', { class: 'sheet__title' }, title),
      h('button', { class: 'icon-btn', 'aria-label': 'Fermer', html: ICONS.close, onClick: close }),
    ),
    content,
  );
  const backdrop = h('div', { class: 'sheet-backdrop', onClick: (event) => event.target === backdrop && close() }, sheet);

  document.body.append(backdrop);
  document.addEventListener('keydown', onKey);
  sheet.querySelector('input, button:not(.icon-btn)')?.focus();
  return close;
}
