/**
 * Stockage local sécurisé (navigation privée, quotas : on ne plante jamais).
 * Clés utilisées :
 *   devine.name     → dernier pseudo saisi
 *   devine.session  → { code, token } pour revenir dans la partie après un rechargement
 *   devine.sound    → true / false
 */
const PREFIX = 'devine.';

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : le jeu fonctionne quand même */
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* rien */
  }
}
