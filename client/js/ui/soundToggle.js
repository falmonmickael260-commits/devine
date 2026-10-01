/** Bouton son activé / coupé (réutilisé sur plusieurs écrans). */
import { h } from '../core/dom.js';
import { isSoundEnabled, setSoundEnabled } from '../core/sound.js';
import { ICONS } from './icons.js';

export function createSoundToggle() {
  const button = h('button', { class: 'icon-btn' });
  const render = () => {
    const enabled = isSoundEnabled();
    button.innerHTML = enabled ? ICONS.soundOn : ICONS.soundOff;
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Couper le son' : 'Activer le son');
  };
  button.addEventListener('click', () => {
    setSoundEnabled(!isSoundEnabled());
    render();
  });
  render();
  return button;
}
