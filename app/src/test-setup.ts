import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'

// Deterministic Math.random for reproducible tests.
//
// The resolve pipeline (events, tile damage, antagonist arcs, proposal pressure)
// reads Math.random. Without a fixed seed, assertions that sit on a floor()
// boundary — e.g. maxConcurrentProjects = floor(2 + trust/25) right at trust ~76 —
// flake under CI when random meter deltas tip the value across the edge. Seeding
// per-test makes every test independent and reproducible (CI gates deploy on the
// full suite, so flakiness blocks shipping).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

beforeEach(() => {
  Math.random = mulberry32(0xc0ffee)
})
