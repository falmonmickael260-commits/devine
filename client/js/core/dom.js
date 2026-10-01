/**
 * Petits outils DOM, sans framework.
 *
 *   h('button', { class: 'btn', onClick: go }, 'Jouer')
 *
 * ⚠️ Les textes passés en enfants sont TOUJOURS insérés comme texte
 *    (jamais en HTML) : un pseudo comme "<b>" s'affiche tel quel.
 *    Seul l'attribut spécial `html` injecte du HTML : réservé aux SVG du jeu.
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style' && typeof value === 'object') {
      // setProperty gère aussi les variables CSS (--i, --team…)
      for (const [prop, val] of Object.entries(value)) el.style.setProperty(prop, String(val));
    }
    else if (key === 'html') el.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, value);
  }

  append(el, children);
  return el;
}

/** Ajoute des enfants (nœuds, textes, tableaux ; null et false ignorés). */
export function append(parent, children) {
  for (const child of [children].flat(Infinity)) {
    if (child == null || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

/** Transforme une chaîne SVG (du jeu, jamais de l'utilisateur) en élément. */
export function svg(markup) {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  return template.content.firstElementChild;
}

/** Relance une animation CSS en retirant puis remettant une classe. */
export function replayClass(el, className) {
  el.classList.remove(className);
  void el.offsetWidth; // force le navigateur à « oublier » l'animation précédente
  el.classList.add(className);
}

/** Vrai si l'utilisateur préfère réduire les animations. */
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
