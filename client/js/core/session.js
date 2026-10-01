/**
 * Entrée / sortie de partie (partagé par les écrans).
 * La session { code, token } est gardée en local pour revenir
 * automatiquement dans la partie après un rechargement ou une coupure.
 */
import { request } from './net.js';
import { load, save, remove } from './storage.js';
import { setState } from './store.js';

export async function createRoom(name) {
  const response = await request('room:create', { name });
  save('session', { code: response.roomCode, token: response.token });
  return response;
}

export async function joinRoom(code, name) {
  const response = await request('room:join', { code, name });
  save('session', { code: response.roomCode, token: response.token });
  return response;
}

/** Tente de revenir dans la partie enregistrée. Renvoie false si impossible. */
export async function resumeSession() {
  const session = load('session');
  if (!session) return false;
  try {
    await request('room:rejoin', { code: session.code, token: session.token });
    return true;
  } catch (error) {
    remove('session');
    throw error;
  }
}

export async function leaveRoom() {
  remove('session');
  try {
    await request('room:leave');
  } catch {
    /* déjà sorti côté serveur : sans importance */
  }
  setState({ view: null });
}

/** Oublie la session sans prévenir le serveur (ex. remplacée sur un autre appareil). */
export function forgetSession() {
  remove('session');
  setState({ view: null });
}
