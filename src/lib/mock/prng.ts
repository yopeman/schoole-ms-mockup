/**
 * Deterministic PRNG (mulberry32) so generated mock data is stable across
 * reloads and machines — charts, grades and dashboards stay consistent.
 */
export function createRng(seed = 20260101) {
  let a = seed >>> 0;

  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    float: (min: number, max: number) => next() * (max - min) + min,
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    pickMany: <T,>(items: readonly T[], count: number): T[] => {
      const pool = [...items];
      const out: T[] = [];
      for (let i = 0; i < count && pool.length > 0; i += 1) {
        out.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
      }
      return out;
    },
    bool: (probability = 0.5) => next() < probability,
    shuffle: <T,>(items: T[]): T[] => {
      const arr = [...items];
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    /** Normal-ish distribution via central limit for realistic score spread. */
    gaussian: (mean: number, stdDev: number) => {
      const g = (next() + next() + next() + next() + next() + next() - 3) / 3;
      return Math.round(mean + g * stdDev);
    },
  };
}

export type Rng = ReturnType<typeof createRng>;