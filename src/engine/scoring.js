/**
 * ============================================================
 *  SCORES & STATISTIQUES
 * ============================================================
 * - 1 carte trouvée = rules.pointsPerCard points pour l'équipe du joueur actif.
 * - Les points sont enregistrés manche par manche.
 * - Les statistiques joueur (trouvées, passées, tours, meilleur tour)
 *   servent à l'écran de fin de partie.
 */

export class Scoreboard {
  #pointsPerCard;
  #roundsCount;
  /** teamId → points par manche */
  #teamPoints = new Map();
  /** teamId → ids des cartes trouvées, par manche */
  #teamFound = new Map();
  /** playerId → statistiques */
  #players = new Map();
  /** Historique de tous les tours joués */
  #turns = [];

  /**
   * @param {object} params
   * @param {{id:string}[]} params.teams
   * @param {{id:string, name:string, teamId:string}[]} params.players
   * @param {number} params.roundsCount
   * @param {number} params.pointsPerCard
   */
  constructor({ teams, players, roundsCount, pointsPerCard }) {
    this.#roundsCount = roundsCount;
    this.#pointsPerCard = pointsPerCard;
    for (const team of teams) {
      this.#teamPoints.set(team.id, Array(roundsCount).fill(0));
      this.#teamFound.set(team.id, Array.from({ length: roundsCount }, () => []));
    }
    for (const player of players) {
      this.#players.set(player.id, {
        id: player.id,
        name: player.name,
        teamId: player.teamId,
        found: 0,
        passed: 0,
        turns: 0,
        bestTurn: 0,
      });
    }
  }

  recordFound({ roundIndex, playerId, teamId, cardId }) {
    this.#teamPoints.get(teamId)[roundIndex] += this.#pointsPerCard;
    this.#teamFound.get(teamId)[roundIndex].push(cardId);
    this.#players.get(playerId).found += 1;
  }

  recordPass({ playerId }) {
    this.#players.get(playerId).passed += 1;
  }

  recordTurn({ roundIndex, turnNumber, playerId, teamId, found, passed, durationMs, reason }) {
    const stats = this.#players.get(playerId);
    stats.turns += 1;
    stats.bestTurn = Math.max(stats.bestTurn, found);
    this.#turns.push({ roundIndex, turnNumber, playerId, teamId, found, passed, durationMs, reason });
  }

  /** Scores actuels : [{ teamId, roundScores: [m1, m2, m3], total }] */
  getTeamScores() {
    return [...this.#teamPoints].map(([teamId, roundScores]) => ({
      teamId,
      roundScores: [...roundScores],
      total: roundScores.reduce((sum, points) => sum + points, 0),
    }));
  }

  /** Récapitulatif d'une manche (affiché entre deux manches). */
  getRoundSummary(roundIndex, cardsById) {
    return {
      roundIndex,
      turns: this.#turns.filter((turn) => turn.roundIndex === roundIndex).length,
      teams: [...this.#teamPoints.keys()].map((teamId) => ({
        teamId,
        points: this.#teamPoints.get(teamId)[roundIndex],
        cards: this.#teamFound.get(teamId)[roundIndex].map((id) => cardsById.get(id).title),
      })),
    };
  }

  /** Résultats finaux (écran de fin de partie). */
  buildResults({ teams, rounds, cardsById, deck, roundTimings }) {
    const scores = this.getTeamScores();
    const bestTotal = Math.max(...scores.map((score) => score.total));
    const winnerTeamIds = scores.filter((score) => score.total === bestTotal).map((score) => score.teamId);

    const ranking = scores
      .map((score) => {
        const team = teams.find((t) => t.id === score.teamId);
        return { ...score, name: team.name, playerIds: [...team.playerIds] };
      })
      .sort((a, b) => b.total - a.total);

    const players = [...this.#players.values()].map((stats) => ({ ...stats }));

    const bestTurnEntry = this.#turns.reduce(
      (best, turn) => (turn.found > (best?.found ?? 0) ? turn : best),
      null,
    );
    const topFinder = players.reduce(
      (best, player) => (player.found > (best?.found ?? 0) ? player : best),
      null,
    );

    return {
      winnerTeamIds,
      isDraw: winnerTeamIds.length > 1,
      ranking,
      rounds: rounds.map((round, index) => {
        const summary = this.getRoundSummary(index, cardsById);
        const timing = roundTimings[index];
        return {
          number: round.number,
          id: round.id,
          label: round.label,
          turns: summary.turns,
          durationMs: timing ? timing.endedAt - timing.startedAt : null,
          teams: summary.teams,
        };
      }),
      players,
      highlights: {
        bestTurn: bestTurnEntry
          ? {
              playerId: bestTurnEntry.playerId,
              name: this.#players.get(bestTurnEntry.playerId).name,
              cardsFound: bestTurnEntry.found,
              roundNumber: rounds[bestTurnEntry.roundIndex].number,
            }
          : null,
        topFinder: topFinder ? { playerId: topFinder.id, name: topFinder.name, cardsFound: topFinder.found } : null,
      },
      totals: {
        cardsInDeck: deck.length,
        cardsFound: players.reduce((sum, p) => sum + p.found, 0),
        passes: players.reduce((sum, p) => sum + p.passed, 0),
        turns: this.#turns.length,
      },
      deck: deck.map((card) => ({ id: card.id, title: card.title, difficulty: card.difficulty, theme: card.theme })),
    };
  }
}
