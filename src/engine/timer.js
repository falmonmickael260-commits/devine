/**
 * ============================================================
 *  CHRONOMÈTRE D'UN TOUR (60 secondes)
 * ============================================================
 * Le serveur est la source de vérité : il stocke l'heure de fin (endsAt).
 * Les clients n'ont qu'à afficher (endsAt - heureServeurEstimée).
 * Aucun "tick" n'est envoyé chaque seconde → pas de désynchronisation.
 */
import { realClock } from './clock.js';

export class TurnTimer {
  #clock;
  #handle = null;
  #startedAt = null;
  #endsAt = null;
  #pausedRemainingMs = null;
  #onExpire = null;

  constructor(clock = realClock) {
    this.#clock = clock;
  }

  /**
   * Démarre (ou redémarre) le chrono.
   * @param {number} durationMs
   * @param {() => void} onExpire appelé quand le chrono atteint 0
   */
  start(durationMs, onExpire) {
    this.stop();
    this.#onExpire = onExpire;
    this.#startedAt = this.#clock.now();
    this.#schedule(durationMs);
  }

  /** Arrête le chrono sans déclencher onExpire. */
  stop() {
    if (this.#handle !== null) this.#clock.clearTimeout(this.#handle);
    this.#handle = null;
    this.#startedAt = null;
    this.#endsAt = null;
    this.#pausedRemainingMs = null;
    this.#onExpire = null;
  }

  /** Met en pause (prévu pour une future fonction « pause » de l'hôte). */
  pause() {
    if (!this.isRunning) return;
    const remaining = this.remainingMs();
    this.#clock.clearTimeout(this.#handle);
    this.#handle = null;
    this.#endsAt = null;
    this.#pausedRemainingMs = remaining;
  }

  resume() {
    if (this.#pausedRemainingMs === null) return;
    this.#schedule(this.#pausedRemainingMs);
  }

  get isRunning() {
    return this.#handle !== null;
  }

  get isPaused() {
    return this.#pausedRemainingMs !== null;
  }

  get startedAt() {
    return this.#startedAt;
  }

  get endsAt() {
    return this.#endsAt;
  }

  remainingMs() {
    if (this.#pausedRemainingMs !== null) return this.#pausedRemainingMs;
    if (this.#endsAt === null) return 0;
    return Math.max(0, this.#endsAt - this.#clock.now());
  }

  #schedule(delayMs) {
    this.#pausedRemainingMs = null;
    this.#endsAt = this.#clock.now() + delayMs;
    this.#handle = this.#clock.setTimeout(() => this.#expire(), delayMs);
  }

  #expire() {
    const callback = this.#onExpire;
    this.#handle = null;
    this.#endsAt = null;
    this.#onExpire = null;
    callback?.();
  }
}
