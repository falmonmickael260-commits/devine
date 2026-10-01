/**
 * Horloges injectables.
 * Le moteur ne touche JAMAIS directement à Date.now() / setTimeout :
 * il passe par une horloge, ce qui permet de tester une partie complète
 * de 3 manches en quelques millisecondes (FakeClock).
 */

/** Horloge réelle (production). */
export const realClock = Object.freeze({
  now: () => Date.now(),
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => clearTimeout(handle),
});

/** Horloge simulée : le temps n'avance que via advance(ms). */
export class FakeClock {
  #now;
  #timers = new Map();
  #nextId = 1;

  constructor(startAt = 0) {
    this.#now = startAt;
  }

  now() {
    return this.#now;
  }

  setTimeout(callback, delayMs) {
    const id = this.#nextId++;
    this.#timers.set(id, { at: this.#now + Math.max(0, delayMs), callback });
    return id;
  }

  clearTimeout(id) {
    this.#timers.delete(id);
  }

  /** Avance le temps en déclenchant, dans l'ordre, tous les timers échus. */
  advance(ms) {
    const target = this.#now + ms;
    for (;;) {
      let nextId = null;
      let nextTimer = null;
      for (const [id, timer] of this.#timers) {
        if (timer.at <= target && (!nextTimer || timer.at < nextTimer.at)) {
          nextId = id;
          nextTimer = timer;
        }
      }
      if (!nextTimer) break;
      this.#timers.delete(nextId);
      this.#now = nextTimer.at;
      nextTimer.callback();
    }
    this.#now = target;
  }
}
