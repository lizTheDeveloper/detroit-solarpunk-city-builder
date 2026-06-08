/**
 * Seeded PRNG + global-Math.random scoping for reproducible game simulations.
 *
 * The game's turn resolution reads `Math.random` in several internal places
 * (resolve.ts tile-damage targeting, burnout, delegation, coalition ids) that
 * do not all accept an injectable rng. To make a whole game reproducible from a
 * single integer seed WITHOUT changing production code, we install a seeded
 * generator as `Math.random` for the duration of one game and restore it after.
 *
 * Consequence: games using this MUST run sequentially — concurrent games would
 * share the global generator and reintroduce nondeterminism.
 */

/** mulberry32 — tiny, fast, well-distributed seeded PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Run `fn` with `Math.random` replaced by a mulberry32 generator seeded from
 * `seed`. Restores the original `Math.random` afterwards (even on throw).
 * The same generator is also returned to `fn` so callers can pass it explicitly
 * to APIs that take an rng param (e.g. `generateEvents(state, rng)`).
 */
export async function withSeededRandom<T>(
  seed: number,
  fn: (rng: () => number) => Promise<T>,
): Promise<T> {
  const rng = mulberry32(seed);
  const original = Math.random;
  Math.random = rng;
  try {
    return await fn(rng);
  } finally {
    Math.random = original;
  }
}
