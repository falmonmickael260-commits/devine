/**
 * ============================================================
 *  DEVINE — POINT D'ENTRÉE DU CLIENT WEB
 * ============================================================
 * 1. Démarre le décor animé.
 * 2. Enregistre les écrans.
 * 3. Choisit l'écran selon l'état reçu du serveur :
 *      salle en lobby   → Lobby
 *      partie en cours  → Jeu
 *      hors partie      → Menu / Créer / Rejoindre (navigation locale)
 * 4. Revient automatiquement dans la partie après un rechargement.
 */
import { startStage } from './stage.js';
import { register, go, currentName, updateCurrent } from './core/router.js';
import { subscribe, getState } from './core/store.js';
import { socket, on } from './core/net.js';
import { resumeSession, forgetSession } from './core/session.js';
import { load } from './core/storage.js';
import { toast } from './ui/toast.js';
import { createMenuScreen } from './screens/menu.js';
import { createCreateScreen } from './screens/create.js';
import { createJoinScreen, cleanCode } from './screens/join.js';
import { createLobbyScreen } from './screens/lobby.js';
import { createGameScreen } from './screens/game.js';

startStage();

register('menu', createMenuScreen);
register('create', createCreateScreen);
register('join', createJoinScreen);
register('lobby', createLobbyScreen);
register('game', createGameScreen);

/* ---------- Écran selon l'état ---------- */
const ROOM_SCREENS = new Set(['lobby', 'game']);

function route(state) {
  const status = state.view?.room?.status;
  if (status === 'lobby') go('lobby');
  else if (status === 'in_game') go('game');
  else if (ROOM_SCREENS.has(currentName())) go('menu');
}

/* ---------- Bannière de connexion ---------- */
const banner = document.getElementById('net-banner');
let bannerTimer = null;
function renderBanner(connected) {
  clearTimeout(bannerTimer);
  if (connected) {
    banner.hidden = true;
  } else {
    // Petit délai : pas de bannière pour une micro-coupure
    bannerTimer = setTimeout(() => (banner.hidden = false), 1200);
  }
}

let wasConnected = false;
subscribe((state) => {
  route(state);
  updateCurrent(state);
  if (state.connected !== wasConnected) {
    wasConnected = state.connected;
    renderBanner(state.connected);
  }
});
renderBanner(false);

/* ---------- Retour automatique dans la partie ---------- */
socket.on('connect', async () => {
  if (!load('session')) return;
  try {
    await resumeSession();
  } catch (error) {
    // Partie terminée ou place libérée : on revient au menu en le signalant.
    if (ROOM_SCREENS.has(currentName())) forgetSession();
    toast(error.message, 'error');
  }
});

on('session:replaced', () => {
  forgetSession();
  toast('Ta partie a été ouverte sur un autre appareil.');
});

/* ---------- Premier écran ---------- */
// Lien d'invitation : https://…/?code=X7K9P
const invitedCode = cleanCode(new URLSearchParams(location.search).get('code') ?? '');
if (invitedCode) history.replaceState(null, '', location.pathname);

if (invitedCode && invitedCode !== load('session')?.code) {
  go('join', { code: invitedCode });
} else {
  go('menu');
}
route(getState());
