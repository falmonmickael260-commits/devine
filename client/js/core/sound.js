/**
 * ============================================================
 *  SONS — synthétisés en direct (Web Audio), aucun fichier à charger
 * ============================================================
 *   play('join')   play('click')   play('select')   play('error') ...
 *
 * Les navigateurs bloquent le son tant que l'utilisateur n'a pas touché
 * l'écran : le contexte audio est créé au premier geste.
 */
import { load, save } from './storage.js';

let context = null;
let master = null;
let enabled = load('sound', true);

function ensureContext() {
  if (context) return context;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  context = new AudioContext();
  master = context.createGain();
  master.gain.value = 0.5;
  master.connect(context.destination);
  return context;
}

// Débloque l'audio au premier contact avec la page.
for (const eventName of ['pointerdown', 'keydown']) {
  window.addEventListener(eventName, () => ensureContext()?.resume(), { once: true, capture: true });
}

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(value) {
  enabled = Boolean(value);
  save('sound', enabled);
  if (enabled) play('select');
}

/**
 * Note simple.
 * @param {number} freq   fréquence de départ (Hz)
 * @param {number} start  décalage (s)
 * @param {number} length durée (s)
 * @param {object} [opt]  { type, to (glissando), volume }
 */
function tone(freq, start, length, { type = 'sine', to = null, volume = 0.3 } = {}) {
  const t0 = context.currentTime + start;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + length);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + length + 0.05);
}

/** Bibliothèque de sons du jeu. */
const SOUNDS = {
  click: () => tone(660, 0, 0.06, { type: 'triangle', volume: 0.15 }),
  select: () => {
    tone(880, 0, 0.08, { type: 'triangle', volume: 0.2 });
    tone(1320, 0.05, 0.1, { type: 'sine', volume: 0.15 });
  },
  // Arrivée d'un joueur : petit carillon montant
  join: () => {
    tone(523, 0, 0.16, { type: 'triangle', volume: 0.22 });
    tone(784, 0.08, 0.18, { type: 'triangle', volume: 0.22 });
    tone(1047, 0.16, 0.3, { type: 'sine', volume: 0.2 });
  },
  leave: () => {
    tone(587, 0, 0.14, { type: 'triangle', volume: 0.16 });
    tone(392, 0.09, 0.22, { type: 'triangle', volume: 0.14 });
  },
  error: () => {
    tone(196, 0, 0.12, { type: 'square', volume: 0.08 });
    tone(165, 0.1, 0.18, { type: 'square', volume: 0.08 });
  },
  // Lettre du code qui s'affiche
  tick: () => tone(1500, 0, 0.03, { type: 'square', volume: 0.04 }),
  // Lancement de partie : montée + accord
  start: () => {
    tone(220, 0, 0.5, { type: 'sawtooth', to: 880, volume: 0.07 });
    for (const [i, f] of [523, 659, 784, 1047].entries()) tone(f, 0.45 + i * 0.03, 0.6, { type: 'triangle', volume: 0.14 });
  },
};

export function play(name) {
  if (!enabled || !SOUNDS[name]) return;
  if (!ensureContext()) return;
  try {
    SOUNDS[name]();
  } catch {
    /* jamais bloquant */
  }
}
