/**
 * Transforme une liste compacte [titre, difficulté, thème?] en cartes complètes.
 *
 * ⚠️ Les ids sont générés à partir de la POSITION dans la liste
 *    (pers_001, pers_002...). Pour garder des ids stables :
 *    → toujours AJOUTER les nouvelles cartes À LA FIN de la liste,
 *    → ne jamais réordonner ni supprimer une ligne existante
 *      (pour retirer une carte, la marquer plutôt que la supprimer).
 */

/** Codes courts de difficulté utilisés dans les fichiers de données. */
export const DIFFICULTY = Object.freeze({
  F: 'facile',
  M: 'moyen',
  D: 'difficile',
});

/**
 * @param {object} params
 * @param {string} params.prefix   Préfixe des ids (ex : "pers")
 * @param {string} params.category Id de la catégorie (ex : "personnalites")
 * @param {Array<[string, 'F'|'M'|'D', string?]>} params.entries
 * @returns {ReadonlyArray<{id:string, category:string, theme:string, title:string, difficulty:string}>}
 */
export function makeCards({ prefix, category, entries }) {
  return Object.freeze(
    entries.map(([title, difficultyCode, theme], index) => {
      const difficulty = DIFFICULTY[difficultyCode];
      if (!difficulty) {
        throw new Error(`Difficulté invalide "${difficultyCode}" pour la carte "${title}"`);
      }
      return Object.freeze({
        id: `${prefix}_${String(index + 1).padStart(3, '0')}`,
        category,
        // theme = catégorie "d'origine". Identique à category, sauf pour MIX.
        theme: theme ?? category,
        title,
        difficulty,
      });
    }),
  );
}
