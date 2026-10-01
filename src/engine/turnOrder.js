/**
 * ============================================================
 *  ORDRE DES TOURS : A1 → B1 → A2 → B2 → A1 → B1 ...
 * ============================================================
 * Les équipes alternent à chaque tour, et chaque équipe fait tourner
 * ses propres joueurs. On ne fait JAMAIS A1 → A2 → B1 → B2.
 *
 * Fonctionne aussi avec des équipes de tailles différentes (5 ou 7 joueurs) :
 *   A = [A1, A2, A3], B = [B1, B2]
 *   → A1, B1, A2, B2, A3, B1, A1, B2, ...
 *
 * Chaque joueur indisponible (déconnecté) est sauté automatiquement.
 */

export class TurnOrder {
  /** @type {{id:string, playerIds:string[]}[]} */
  #teams;
  /** Index de l'équipe qui joue le prochain tour. */
  #teamCursor = 0;
  /** Pour chaque équipe : index du prochain joueur de cette équipe. */
  #memberCursors;

  constructor(teams) {
    this.#teams = teams.map((team) => ({ id: team.id, playerIds: [...team.playerIds] }));
    this.#memberCursors = this.#teams.map(() => 0);
  }

  /** Revient au tout début (A1). */
  reset() {
    this.#teamCursor = 0;
    this.#memberCursors = this.#teams.map(() => 0);
  }

  /**
   * Prochain joueur, SANS faire avancer la rotation (pour afficher « Prochain : B1 »).
   * @param {(playerId: string) => boolean} isAvailable
   */
  peek(isAvailable = () => true) {
    return this.#find(isAvailable)?.slot ?? null;
  }

  /**
   * Prochain joueur, ET avance la rotation.
   * Si personne n'est disponible, on prend quand même le suivant normal.
   * @returns {{playerId:string, teamId:string, slotLabel:string} | null}
   */
  next(isAvailable = () => true) {
    const found = this.#find(isAvailable) ?? this.#find(() => true);
    if (!found) return null;

    const team = this.#teams[found.teamIndex];
    this.#memberCursors[found.teamIndex] = (found.memberIndex + 1) % team.playerIds.length;
    this.#teamCursor = (found.teamIndex + 1) % this.#teams.length;
    return found.slot;
  }

  /** Liste les `count` prochains passages (utile pour l'UI et les tests). */
  preview(count, isAvailable = () => true) {
    const copy = new TurnOrder(this.#teams);
    copy.#teamCursor = this.#teamCursor;
    copy.#memberCursors = [...this.#memberCursors];
    return Array.from({ length: count }, () => copy.next(isAvailable));
  }

  /** Cherche le prochain joueur disponible à partir des curseurs actuels. */
  #find(isAvailable) {
    for (let t = 0; t < this.#teams.length; t++) {
      const teamIndex = (this.#teamCursor + t) % this.#teams.length;
      const team = this.#teams[teamIndex];

      for (let m = 0; m < team.playerIds.length; m++) {
        const memberIndex = (this.#memberCursors[teamIndex] + m) % team.playerIds.length;
        const playerId = team.playerIds[memberIndex];

        if (isAvailable(playerId)) {
          return {
            teamIndex,
            memberIndex,
            slot: { playerId, teamId: team.id, slotLabel: `${team.id}${memberIndex + 1}` },
          };
        }
      }
    }
    return null;
  }
}
