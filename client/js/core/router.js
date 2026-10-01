/**
 * ============================================================
 *  ROUTEUR D'ÉCRANS (avec transitions)
 * ============================================================
 * Un écran = une fonction qui renvoie :
 *   { el, update?(state), mounted?(), destroy?() }
 *
 *   register('menu', createMenuScreen);
 *   go('menu');
 */
const app = document.getElementById('app');
const registry = new Map();
let current = null; // { name, screen }

export function register(name, factory) {
  registry.set(name, factory);
}

export function currentName() {
  return current?.name ?? null;
}

/** Met à jour l'écran affiché avec le nouvel état. */
export function updateCurrent(state) {
  current?.screen.update?.(state);
}

/**
 * Affiche un écran.
 * @param {string} name
 * @param {object} [params] paramètres transmis à la fabrique de l'écran
 */
export function go(name, params = {}) {
  if (current?.name === name && !params.force) return;
  const factory = registry.get(name);
  if (!factory) throw new Error(`Écran inconnu : ${name}`);

  // Sortie de l'écran précédent (petite animation puis suppression)
  if (current) {
    const old = current.screen;
    old.destroy?.();
    old.el.classList.add('is-leaving');
    setTimeout(() => old.el.remove(), 230);
  }

  const screen = factory(params);
  screen.el.classList.add('screen', 'is-entering');
  screen.el.addEventListener('animationend', function onEnd(event) {
    if (event.target !== screen.el) return; // ignore les animations des enfants
    screen.el.classList.remove('is-entering');
    screen.el.removeEventListener('animationend', onEnd);
  });
  app.append(screen.el);
  current = { name, screen };

  window.scrollTo(0, 0);
  screen.mounted?.();
}
