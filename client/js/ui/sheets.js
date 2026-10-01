/**
 * Fenêtres du jeu : règles, modification du pseudo.
 */
import { h } from '../core/dom.js';
import { load, save } from '../core/storage.js';
import { openSheet } from './sheet.js';

export const NAME_MAX_LENGTH = 20; // identique au serveur

/** Les 3 manches, affichées dans les règles et (plus tard) les transitions. */
export const ROUNDS_INFO = [
  { number: 1, title: 'Description', text: 'Fais deviner avec autant de mots que tu veux, sans dire le nom.' },
  { number: 2, title: 'Un seul mot', text: 'Un seul mot par carte. Les mêmes cartes reviennent : à vous de vous en souvenir.' },
  { number: 3, title: 'Dessin', text: 'Dessine sans écrire ni parler. Tes coéquipiers voient ton dessin en direct.' },
];

export function openRulesSheet() {
  openSheet({
    title: 'Comment jouer',
    content: h('div', { class: 'prose' },
      h('p', {}, 'Deux équipes s’affrontent avec ', h('strong', {}, 'le même paquet de cartes'), ' pendant trois manches. Chaque joueur fait deviner son équipe pendant 60 secondes, puis la main passe à l’équipe adverse.'),
      h('ol', { class: 'rounds' },
        ROUNDS_INFO.map((round) =>
          h('li', {},
            h('span', { class: 'rounds__num' }, round.number),
            h('div', {}, h('strong', {}, round.title), h('span', {}, round.text)),
          ),
        ),
      ),
      h('p', {}, h('strong', {}, 'Trouvé'), ' : la carte rapporte 1 point et disparaît pour la manche. ', h('strong', {}, 'Passer'), ' : elle repart sous la pile.'),
      h('p', {}, 'La manche se termine quand toutes les cartes ont été trouvées. L’équipe qui a le plus de points après les trois manches gagne.'),
    ),
  });
}

/** Fenêtre « Ton pseudo ». Appelle onSave(nom) après validation. */
export function openNameSheet({ onSave } = {}) {
  const input = h('input', {
    class: 'field__input',
    id: 'sheet-name',
    maxlength: NAME_MAX_LENGTH,
    autocomplete: 'nickname',
    enterkeyhint: 'done',
    value: load('name', '') ?? '',
    placeholder: 'Ex. Mika',
  });

  const submit = () => {
    const name = input.value.trim();
    if (!name) {
      input.focus();
      return;
    }
    save('name', name);
    close();
    onSave?.(name);
  };
  input.addEventListener('keydown', (event) => event.key === 'Enter' && submit());

  const close = openSheet({
    title: 'Ton pseudo',
    content: h('div', { class: 'field' },
      h('label', { class: 'field__label', for: 'sheet-name' }, 'Le nom affiché aux autres joueurs'),
      input,
      h('button', { class: 'btn btn--primary btn--block', style: { 'margin-top': '12px' }, onClick: submit }, 'Enregistrer'),
    ),
  });
  input.focus();
  input.select();
}
