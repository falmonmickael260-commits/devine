/**
 * ============================================================
 *  ÉCRAN 2 — CRÉER UNE PARTIE (uniquement si le pseudo est inconnu)
 * ============================================================
 * Le créateur devient automatiquement l'hôte ; le serveur génère le code.
 */
import { h } from '../core/dom.js';
import { go } from '../core/router.js';
import { play } from '../core/sound.js';
import { load, save } from '../core/storage.js';
import { createRoom } from '../core/session.js';
import { ICONS } from '../ui/icons.js';
import { NAME_MAX_LENGTH } from '../ui/sheets.js';
import { toast } from '../ui/toast.js';

export function createCreateScreen() {
  const input = h('input', {
    class: 'field__input',
    id: 'create-name',
    maxlength: NAME_MAX_LENGTH,
    autocomplete: 'nickname',
    enterkeyhint: 'go',
    placeholder: 'Ex. Mika',
    value: load('name', '') ?? '',
  });
  const submitButton = h('button', { class: 'btn btn--primary btn--xl btn--block', html: `${ICONS.gamepad}<span>Créer la salle</span>` });

  const refresh = () => {
    submitButton.disabled = input.value.trim().length === 0;
  };

  async function submit() {
    const name = input.value.trim();
    if (!name) return;
    play('click');
    submitButton.disabled = true;
    try {
      save('name', name);
      await createRoom(name); // → lobby dès que l'état arrive
    } catch (error) {
      toast(error.message, 'error');
      refresh();
    }
  }

  input.addEventListener('input', refresh);
  input.addEventListener('keydown', (event) => event.key === 'Enter' && submit());
  submitButton.addEventListener('click', submit);
  refresh();

  const el = h('section', { class: 'form-screen', 'aria-label': 'Créer une partie' },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Retour au menu', html: ICONS.back, onClick: () => go('menu') }),
    ),
    h('div', { class: 'form-screen__body' },
      h('div', {},
        h('h2', { class: 'form-screen__title' }, 'Créer une partie'),
        h('p', { class: 'form-screen__lead' }, 'Tu seras l’hôte : tu choisiras la catégorie et lanceras la partie.'),
      ),
      h('div', { class: 'field' },
        h('label', { class: 'field__label', for: 'create-name' }, 'Ton pseudo'),
        input,
      ),
      submitButton,
    ),
  );

  return { el, mounted: () => input.focus() };
}
