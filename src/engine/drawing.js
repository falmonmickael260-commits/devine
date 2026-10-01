/**
 * ============================================================
 *  SYSTÈME DE DESSIN (manche 3)
 * ============================================================
 * Le serveur garde l'historique du dessin de la carte en cours afin de :
 * - relayer les traits en temps réel aux autres joueurs ;
 * - renvoyer le dessin complet à un joueur qui se reconnecte ;
 * - gérer annuler / rétablir / effacer de façon identique pour tous.
 *
 * Coordonnées NORMALISÉES entre 0 et 1 (x = 0.5 → milieu de la zone) :
 * le dessin s'affiche correctement quelle que soit la taille d'écran.
 *
 * Outils :
 * - 'pen'    : stylet, avec couleur + épaisseur ;
 * - 'eraser' : gomme (le client dessine en mode "effacement").
 *
 * Historique = liste d'actions : { type: 'stroke' } ou { type: 'clear' }.
 * → « Effacer tout » est lui-même annulable.
 */
import { GameError, ERR } from './errors.js';

export const DRAWING_TOOLS = Object.freeze(['pen', 'eraser']);

export const DRAWING_LIMITS = Object.freeze({
  maxActions: 2000, // traits + "effacer" pour une même carte
  maxPointsPerStroke: 4000,
  maxPointsPerMessage: 400, // le client envoie les points par paquets
  minSize: 1,
  maxSize: 80,
  maxStrokeIdLength: 64,
});

/** Palette suggérée pour l'interface (toute couleur #RRGGBB est acceptée). */
export const DEFAULT_PALETTE = Object.freeze([
  '#111111', '#FFFFFF', '#E53935', '#FB8C00', '#FDD835',
  '#43A047', '#1E88E5', '#8E24AA', '#6D4C41', '#EC407A',
]);

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export class DrawingBoard {
  /** @type {Array<{type:'stroke', stroke:object} | {type:'clear'}>} */
  #actions = [];
  #redoStack = [];
  #openStrokeId = null;

  /** Début d'un trait. */
  beginStroke(input = {}) {
    this.#ensureCapacity();
    const stroke = sanitizeStroke(input);
    this.#actions.push({ type: 'stroke', stroke });
    this.#redoStack = [];
    this.#openStrokeId = stroke.id;
    return cloneStroke(stroke);
  }

  /**
   * Ajoute des points au trait en cours.
   * Renvoie null si le trait n'est plus actif (ex. annulé entre-temps) :
   * dans ce cas, rien n'est relayé.
   */
  extendStroke(strokeId, rawPoints) {
    const last = this.#actions.at(-1);
    if (!last || last.type !== 'stroke' || last.stroke.id !== strokeId || this.#openStrokeId !== strokeId) {
      return null;
    }
    const points = sanitizePoints(rawPoints);
    if (points.length === 0) return null;
    if (last.stroke.points.length + points.length > DRAWING_LIMITS.maxPointsPerStroke) {
      throw new GameError(ERR.DRAWING_LIMIT, 'Ce trait est trop long.');
    }
    last.stroke.points.push(...points);
    return { strokeId, points };
  }

  /** Fin du trait (lever du stylet). */
  endStroke(strokeId) {
    if (this.#openStrokeId !== strokeId) return null;
    this.#openStrokeId = null;
    return { strokeId };
  }

  /** ANNULER : retire la dernière action (trait ou "effacer tout"). */
  undo() {
    if (this.#actions.length === 0) return false;
    this.#openStrokeId = null;
    this.#redoStack.push(this.#actions.pop());
    return true;
  }

  /** RÉTABLIR : remet la dernière action annulée. */
  redo() {
    if (this.#redoStack.length === 0) return false;
    this.#openStrokeId = null;
    this.#actions.push(this.#redoStack.pop());
    return true;
  }

  /** EFFACER TOUT / RECOMMENCER : vide la zone (annulable). */
  clear() {
    if (this.getVisibleStrokes().length === 0) return false;
    this.#ensureCapacity();
    this.#openStrokeId = null;
    this.#actions.push({ type: 'clear' });
    this.#redoStack = [];
    return true;
  }

  /** Remise à zéro totale (nouvelle carte / nouveau tour) — non annulable. */
  reset() {
    this.#actions = [];
    this.#redoStack = [];
    this.#openStrokeId = null;
  }

  /** Traits visibles = ceux situés après le dernier "effacer tout". */
  getVisibleStrokes() {
    let start = 0;
    for (let i = this.#actions.length - 1; i >= 0; i--) {
      if (this.#actions[i].type === 'clear') {
        start = i + 1;
        break;
      }
    }
    return this.#actions
      .slice(start)
      .filter((action) => action.type === 'stroke')
      .map((action) => cloneStroke(action.stroke));
  }

  /** État complet, envoyé à un joueur qui (re)rejoint pendant un dessin. */
  snapshot() {
    return {
      strokes: this.getVisibleStrokes(),
      canUndo: this.#actions.length > 0,
      canRedo: this.#redoStack.length > 0,
    };
  }

  #ensureCapacity() {
    if (this.#actions.length >= DRAWING_LIMITS.maxActions) {
      throw new GameError(ERR.DRAWING_LIMIT, 'Limite de traits atteinte pour cette carte.');
    }
  }
}

/* ---------- Validation des données envoyées par le client ---------- */

function sanitizeStroke({ strokeId, tool = 'pen', color, size, points } = {}) {
  if (typeof strokeId !== 'string' || strokeId.length === 0 || strokeId.length > DRAWING_LIMITS.maxStrokeIdLength) {
    throw new GameError(ERR.INVALID_DRAWING, 'Identifiant de trait invalide.');
  }
  if (!DRAWING_TOOLS.includes(tool)) {
    throw new GameError(ERR.INVALID_DRAWING, `Outil inconnu : ${tool}`);
  }
  if (tool === 'pen' && (typeof color !== 'string' || !HEX_COLOR.test(color))) {
    throw new GameError(ERR.INVALID_DRAWING, 'Couleur invalide (format attendu : #RRGGBB).');
  }
  const numericSize = Number(size);
  if (!Number.isFinite(numericSize) || numericSize < DRAWING_LIMITS.minSize || numericSize > DRAWING_LIMITS.maxSize) {
    throw new GameError(ERR.INVALID_DRAWING, 'Épaisseur de trait invalide.');
  }
  const sanitizedPoints = sanitizePoints(points);
  if (sanitizedPoints.length === 0) {
    throw new GameError(ERR.INVALID_DRAWING, 'Un trait doit contenir au moins un point.');
  }
  return {
    id: strokeId,
    tool,
    color: tool === 'pen' ? color.toUpperCase() : null,
    size: Math.round(numericSize * 10) / 10,
    points: sanitizedPoints,
  };
}

/** Points au format [[x, y], ...], bornés entre 0 et 1, arrondis à 4 décimales. */
function sanitizePoints(points) {
  if (!Array.isArray(points) || points.length > DRAWING_LIMITS.maxPointsPerMessage) {
    throw new GameError(ERR.INVALID_DRAWING, 'Liste de points invalide.');
  }
  return points.map((point) => {
    if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) {
      throw new GameError(ERR.INVALID_DRAWING, 'Point invalide (format attendu : [x, y]).');
    }
    return point.map((value) => Math.round(Math.min(1, Math.max(0, value)) * 10_000) / 10_000);
  });
}

function cloneStroke(stroke) {
  return { ...stroke, points: stroke.points.map(([x, y]) => [x, y]) };
}
