/**
 * ============================================================
 *  GESTION DES ÉQUIPES
 * ============================================================
 * Une équipe = { id: 'A', name: 'Équipe A', playerIds: [...] }.
 * L'ordre des playerIds dans l'équipe définit A1, A2, A3...
 */
import { GameError, ERR } from './errors.js';
import { shuffle } from './utils/random.js';

/** Équipes disponibles (2 utilisées par défaut, extensible à 4). */
export const TEAM_PRESETS = Object.freeze([
  Object.freeze({ id: 'A', name: 'Équipe A' }),
  Object.freeze({ id: 'B', name: 'Équipe B' }),
  Object.freeze({ id: 'C', name: 'Équipe C' }),
  Object.freeze({ id: 'D', name: 'Équipe D' }),
]);

export function createEmptyTeams(teamCount) {
  if (!Number.isInteger(teamCount) || teamCount < 2 || teamCount > TEAM_PRESETS.length) {
    throw new GameError(ERR.INVALID_CONFIG, `Nombre d'équipes invalide : ${teamCount}`);
  }
  return TEAM_PRESETS.slice(0, teamCount).map((team) => ({ ...team, playerIds: [] }));
}

/** Copie profonde (les équipes ne sont jamais partagées entre modules). */
export function cloneTeams(teams) {
  return teams.map((team) => ({ id: team.id, name: team.name, playerIds: [...team.playerIds] }));
}

/**
 * Répartition automatique alternée : 1er → A, 2e → B, 3e → A, 4e → B...
 * Avec shuffled = true, les joueurs sont mélangés avant la répartition.
 */
export function distributePlayers(playerIds, teamCount, { shuffled = false, rng = Math.random } = {}) {
  const teams = createEmptyTeams(teamCount);
  const ordered = shuffled ? shuffle(playerIds, rng) : [...playerIds];
  ordered.forEach((playerId, index) => {
    teams[index % teamCount].playerIds.push(playerId);
  });
  return teams;
}

/** Équipe la moins remplie (la première en cas d'égalité). */
export function findSmallestTeam(teams) {
  return teams.reduce((smallest, team) =>
    team.playerIds.length < smallest.playerIds.length ? team : smallest,
  );
}

export function findTeamOfPlayer(teams, playerId) {
  return teams.find((team) => team.playerIds.includes(playerId)) ?? null;
}

/**
 * Rééquilibre les équipes si l'écart dépasse 1 joueur
 * (ex. après un départ en lobby). Modifie `teams` en place.
 */
export function rebalanceTeams(teams) {
  for (;;) {
    const sorted = [...teams].sort((a, b) => b.playerIds.length - a.playerIds.length);
    const biggest = sorted[0];
    const smallest = sorted[sorted.length - 1];
    if (biggest.playerIds.length - smallest.playerIds.length <= 1) return teams;
    smallest.playerIds.push(biggest.playerIds.pop());
  }
}

/**
 * Vérifie que les équipes sont jouables :
 * - chaque joueur est dans exactement une équipe ;
 * - chaque équipe a au moins `minPlayersPerTeam` joueurs.
 */
export function validateTeams(teams, playerIds, rules) {
  const assigned = teams.flatMap((team) => team.playerIds);
  const assignedSet = new Set(assigned);

  if (assignedSet.size !== assigned.length) {
    throw new GameError(ERR.INVALID_TEAMS, 'Un joueur est présent dans plusieurs équipes.');
  }
  if (assigned.length !== playerIds.length || !playerIds.every((id) => assignedSet.has(id))) {
    throw new GameError(ERR.INVALID_TEAMS, 'Tous les joueurs doivent être dans une équipe.');
  }
  for (const team of teams) {
    if (team.playerIds.length < rules.minPlayersPerTeam) {
      throw new GameError(
        ERR.TEAM_TOO_SMALL,
        `${team.name} doit compter au moins ${rules.minPlayersPerTeam} joueurs.`,
      );
    }
  }
}
