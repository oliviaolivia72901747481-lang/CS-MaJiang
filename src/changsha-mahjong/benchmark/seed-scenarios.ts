export const BENCHMARK_SEEDS: string[] = Array.from(
  { length: 50 },
  (_, i) => `benchmark-${String(i + 1).padStart(3, '0')}`
);
