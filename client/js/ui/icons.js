/**
 * Icônes du jeu (SVG maison, trait arrondi, héritent de la couleur du texte).
 *   h('button', { html: ICONS.copy })
 */
const icon = (paths, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${paths}</svg>`;

export const ICONS = {
  // Manette (Créer une partie)
  gamepad: icon('<path d="M6.5 7h11a4.5 4.5 0 0 1 4.3 5.8l-1.2 4a2.6 2.6 0 0 1-4.4 1L14.5 16h-5l-1.7 1.8a2.6 2.6 0 0 1-4.4-1l-1.2-4A4.5 4.5 0 0 1 6.5 7Z"/><path d="M8 10.5v3M6.5 12h3"/><circle cx="15.5" cy="11" r=".6" fill="currentColor"/><circle cx="17.5" cy="13" r=".6" fill="currentColor"/>'),
  // Clé (Rejoindre)
  key: icon('<circle cx="8" cy="15" r="4.5"/><path d="m11.2 11.8 8.3-8.3M16.5 6.5l2.5 2.5M14 9l2 2"/>'),
  soundOn: icon('<path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>'),
  soundOff: icon('<path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>'),
  help: icon('<circle cx="12" cy="12" r="9.5"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.1-2.4 3.7"/><circle cx="12" cy="17.2" r=".7" fill="currentColor"/>'),
  edit: icon('<path d="M4 20h4L19.5 8.5a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>'),
  copy: icon('<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>'),
  share: icon('<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12"/>'),
  shuffle: icon('<path d="M3 7h3.5c4.5 0 6.5 10 11 10H21M3 17h3.5c1.6 0 2.8-1.3 3.8-3M14 10c1-1.7 2.2-3 3.5-3H21"/><path d="m18.5 4.5 2.5 2.5-2.5 2.5M18.5 14.5l2.5 2.5-2.5 2.5"/>'),
  swap: icon('<path d="M4 8h14.5M15 4.5 18.5 8 15 11.5M20 16H5.5M9 12.5 5.5 16 9 19.5"/>'),
  crown: icon('<path d="m3.5 8 4.5 4 4-7 4 7 4.5-4-2 10h-13l-2-10Z"/>'),
  back: icon('<path d="M15 5 8 12l7 7"/>'),
  check: icon('<path d="m4.5 12.5 5 5 10-11"/>', 'stroke-width="3"'),
  close: icon('<path d="M6 6l12 12M18 6 6 18"/>'),
  exit: icon('<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>'),
  play: icon('<path d="M7 4.8v14.4a1 1 0 0 0 1.5.9l11.3-7.2a1 1 0 0 0 0-1.8L8.5 3.9A1 1 0 0 0 7 4.8Z" fill="currentColor"/>'),
};
