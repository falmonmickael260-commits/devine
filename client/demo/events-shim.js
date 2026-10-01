/**
 * Remplace node:events dans la version démo (navigateur).
 * Juste ce dont le moteur a besoin : on, once, off, emit, removeAllListeners.
 */
export class EventEmitter {
  #listeners = new Map();

  on(event, listener) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, []);
    this.#listeners.get(event).push(listener);
    return this;
  }

  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    return this.on(event, wrapper);
  }

  off(event, listener) {
    const list = this.#listeners.get(event);
    if (list) this.#listeners.set(event, list.filter((item) => item !== listener));
    return this;
  }

  emit(event, ...args) {
    const list = this.#listeners.get(event);
    if (!list?.length) return false;
    for (const listener of [...list]) listener(...args);
    return true;
  }

  removeAllListeners(event) {
    if (event === undefined) this.#listeners.clear();
    else this.#listeners.delete(event);
    return this;
  }
}
export default { EventEmitter };
