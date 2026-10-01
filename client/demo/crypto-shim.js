/** Remplace node:crypto dans la version démo (navigateur). */
export function randomUUID() {
  return globalThis.crypto.randomUUID();
}
export function randomInt(max) {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] % max;
}
export default { randomUUID, randomInt };
