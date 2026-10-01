/**
 * ============================================================
 *  RÉSEAU — connexion temps réel au serveur DEVINE
 * ============================================================
 * Le client n'envoie que des intentions ; le serveur répond par un
 * accusé de réception { ok, ... } puis diffuse le nouvel état.
 *
 *   await request('room:join', { code, name })   // lève une erreur { code, message } si refus
 */
import { setState } from './store.js';

const REQUEST_TIMEOUT_MS = 8000;

// window.io est fourni par /socket.io/socket.io.js (servi par le serveur).
export const socket = window.io({
  transports: ['websocket', 'polling'],
  reconnectionDelay: 600,
  reconnectionDelayMax: 4000,
});

/** Envoie une requête et attend la réponse du serveur. */
export function request(event, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject({ code: 'OFFLINE', message: 'Pas de connexion au serveur. Nouvelle tentative en cours.' });
      return;
    }
    socket.timeout(REQUEST_TIMEOUT_MS).emit(event, payload, (timeoutError, response) => {
      if (timeoutError) {
        reject({ code: 'TIMEOUT', message: 'Le serveur ne répond pas. Vérifie ta connexion.' });
      } else if (!response?.ok) {
        reject(response?.error ?? { code: 'UNKNOWN', message: 'Action impossible.' });
      } else {
        resolve(response);
      }
    });
  });
}

/** Écoute un événement serveur. Renvoie la fonction pour arrêter d'écouter. */
export function on(event, handler) {
  socket.on(event, handler);
  return () => socket.off(event, handler);
}

// --- État de connexion ---
socket.on('connect', () => setState({ connected: true }));
socket.on('disconnect', () => setState({ connected: false }));

// --- Vue envoyée par le serveur ---
socket.on('state', (view) => {
  // Synchronisation d'horloge : le chrono affiché est identique sur tous les écrans.
  setState({ view, clockOffset: view.serverNow - Date.now() });
});
