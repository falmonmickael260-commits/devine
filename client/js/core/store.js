/**
 * État global du client (très simple, sans librairie).
 *
 *   view      : dernière vue envoyée par le serveur (événement 'state'), ou null hors partie
 *   connected : socket connectée au serveur ?
 *   clockOffset : écart (ms) entre l'horloge du serveur et celle du téléphone
 *                 → chrono = turn.endsAt - (Date.now() + clockOffset)
 */
let state = {
  view: null,
  connected: false,
  clockOffset: 0,
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener(state);
}

/** Abonnement aux changements. Renvoie la fonction de désabonnement. */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Heure actuelle du serveur (estimée). */
export function serverNow() {
  return Date.now() + state.clockOffset;
}
