/**
 * ============================================================
 *  ÉCRAN 3 — REJOINDRE UNE PARTIE
 * ============================================================
 * Saisie du code en 5 tuiles + pseudo.
 * Le code peut arriver pré-rempli depuis un lien d'invitation (?code=X7K9P).
 */
import { h, replayClass } from '../core/dom.js';
import { go } from '../core/router.js';
import { play } from '../core/sound.js';
import { load, save } from '../core/storage.js';
import { joinRoom } from '../core/session.js';
import { ICONS } from '../ui/icons.js';
import { NAME_MAX_LENGTH } from '../ui/sheets.js';
import { toast } from '../ui/toast.js';

export const CODE_LENGTH = 5;

/** Ne garde que lettres et chiffres, en majuscules. */
export function cleanCode(raw = '') {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}

export function createJoinScreen({ code: initialCode = '' } = {}) {
  /* ---------- Code en tuiles ---------- */
  const tiles = Array.from({ length: CODE_LENGTH }, () => h('span', { class: 'code-tile code-tile--input' }));
  const codeInput = h('input', {
    class: 'code-entry__input',
    id: 'join-code',
    inputmode: 'text',
    autocapitalize: 'characters',
    autocomplete: 'off',
    spellcheck: 'false',
    maxlength: CODE_LENGTH,
    'aria-label': 'Code de la partie (5 caractères)',
    value: cleanCode(initialCode),
  });
  const codeEntry = h('div', { class: 'code-entry' },
    h('div', { class: 'code-tiles' }, tiles),
    codeInput,
  );

  /* ---------- Pseudo ---------- */
  const nameInput = h('input', {
    class: 'field__input',
    id: 'join-name',
    maxlength: NAME_MAX_LENGTH,
    autocomplete: 'nickname',
    enterkeyhint: 'go',
    placeholder: 'Ex. Mika',
    value: load('name', '') ?? '',
  });

  const submitButton = h('button', { class: 'btn btn--primary btn--xl btn--block', html: `${ICONS.key}<span>Rejoindre</span>` });

  let previousLength = 0;

  /** Affiche le code dans les tuiles + état du bouton. */
  function render() {
    const code = cleanCode(codeInput.value);
    if (codeInput.value !== code) codeInput.value = code;
    const focused = document.activeElement === codeInput;

    tiles.forEach((tile, i) => {
      const char = code[i] ?? '';
      if (tile.textContent !== char) {
        tile.textContent = char;
        if (char) replayClass(tile, 'is-filled');
      }
      tile.classList.toggle('is-filled', Boolean(char));
      tile.classList.toggle('is-active', focused && i === Math.min(code.length, CODE_LENGTH - 1) && (!char || code.length === CODE_LENGTH));
    });

    if (code.length > previousLength) play('tick');
    // Code complet : on passe au pseudo s'il est vide
    if (code.length === CODE_LENGTH && previousLength < CODE_LENGTH && !nameInput.value.trim() && focused) {
      nameInput.focus();
    }
    previousLength = code.length;
    submitButton.disabled = code.length !== CODE_LENGTH || !nameInput.value.trim();
  }

  async function submit() {
    if (submitButton.disabled) return;
    const code = cleanCode(codeInput.value);
    const name = nameInput.value.trim();
    play('click');
    submitButton.disabled = true;
    try {
      save('name', name);
      await joinRoom(code, name); // → lobby dès que l'état arrive
    } catch (error) {
      toast(error.message, 'error');
      if (error.code === 'ROOM_NOT_FOUND') replayClass(codeEntry, 'is-shaking');
      render();
    }
  }

  codeInput.addEventListener('input', render);
  codeInput.addEventListener('focus', render);
  codeInput.addEventListener('blur', render);
  nameInput.addEventListener('input', render);
  for (const input of [codeInput, nameInput]) {
    input.addEventListener('keydown', (event) => event.key === 'Enter' && submit());
  }
  submitButton.addEventListener('click', submit);
  render();

  const el = h('section', { class: 'form-screen', 'aria-label': 'Rejoindre une partie' },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Retour au menu', html: ICONS.back, onClick: () => go('menu') }),
    ),
    h('div', { class: 'form-screen__body' },
      h('div', {},
        h('h2', { class: 'form-screen__title' }, 'Entrer le code'),
        h('p', { class: 'form-screen__lead' }, 'Demande le code de 5 caractères à l’hôte de la partie.'),
      ),
      codeEntry,
      h('div', { class: 'field' },
        h('label', { class: 'field__label', for: 'join-name' }, 'Ton pseudo'),
        nameInput,
      ),
      submitButton,
    ),
  );

  return {
    el,
    mounted: () => (cleanCode(codeInput.value).length === CODE_LENGTH ? nameInput : codeInput).focus(),
  };
}
