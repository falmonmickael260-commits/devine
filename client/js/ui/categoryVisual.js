/**
 * ============================================================
 *  VISUEL D'UNE CATÉGORIE : PHOTO SI DISPONIBLE, SINON ILLUSTRATION
 * ============================================================
 * Pour mettre de vraies photos : déposer les fichiers dans
 *   client/images/categories/<id>.jpg
 *   (personnalites, films_series, sport, disney, mix)
 * Format conseillé : 900 × 600 px, JPG ou WebP, < 200 Ko.
 * ⚠️ Utiliser des photos dont tu as les droits (banques libres type
 *    Unsplash / Pexels, ou achetées). Pas de personnages Disney ni de
 *    photos de célébrités sans licence.
 *
 * L'illustration s'affiche d'abord ; la photo la remplace dès qu'elle est
 * chargée (pas d'image cassée si le fichier n'existe pas).
 */
import { h, svg } from '../core/dom.js';
import { CATEGORY_ART } from '../art/categories.js';

const PHOTO_EXTENSIONS = ['jpg', 'webp'];

export function createCategoryVisual(categoryId) {
  const holder = h('span', { class: 'cat-visual' }, svg(CATEGORY_ART[categoryId] ?? CATEGORY_ART.mix));

  // La version démo (lien publié) n'a pas de dossier d'images.
  if (!window.DEVINE_DEMO) tryPhoto(holder, categoryId, 0);
  return holder;
}

function tryPhoto(holder, categoryId, index) {
  const extension = PHOTO_EXTENSIONS[index];
  if (!extension) return;
  const image = new Image();
  image.alt = '';
  image.decoding = 'async';
  image.className = 'cat-visual__photo';
  image.onload = () => {
    holder.replaceChildren(image);
    holder.classList.add('has-photo');
  };
  image.onerror = () => tryPhoto(holder, categoryId, index + 1);
  image.src = `/images/categories/${categoryId}.${extension}`;
}
