export interface DecisionTimingSample {
  seed: string;
  roundIndex: number;
  step: number;
  seat: 0 | 1 | 2 | 3;
  actionType: 'discard' | 'action';
  aiMode: 'basic' | 'lite' | 'full';
  coldStart: boolean;
  aiDecisionMs: number;
  gameStepMs?: number;
  totalLoopMs?: number;
  over20ms: boolean;
  over80ms: boolean;
  source: 'trace' | 'runtime' | 'test';
}

export interface TimingDistribution {
  count: number;
  averageMs: number;
  medianMs: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  over20msCount: number;
  over80msCount: number;
  over80msRatio: number;
}

export interface PerformanceBenchmarkV2Result {
  coldStartSamples: DecisionTimingSample[];
  warmRunSamples: DecisionTimingSample[];
  aiDecisionDistribution: TimingDistribution;
  gameStepDistribution: TimingDistribution;
  totalLoopDistribution: TimingDistribution;
  excludedColdStartCount: number;
  warnings: string[];
}

let timingSamples: DecisionTimingSample[] = [];
export let isColdStartPhase = true;

export function recordTimingSample(sample: DecisionTimingSample) {
  timingSamples.push(sample);
}

export function getTimingSamples(): DecisionTimingSample[] {
  return [...timingSamples];
}

export function clearTimingSamples() {
  timingSamples = [];
}

export function setColdStartPhase(val: boolean) {
  isColdStartPhase = val;
}

export function calculateDistribution(samples: number[]): TimingDistribution {
  if (samples.length === 0) {
    return {
      count: 0,
      averageMs: 0,
      medianMs: 0,
      p95Ms: 0,
      p99Ms: 0,
      maxMs: 0,
      over20msCount: 0,
      over80msCount: 0,
      over80msRatio: 0,
    };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const count = sorted.length;
  const averageMs = sum / count;

  const medianMs = sorted[Math.floor(count / 2)];
  const p95Index = Math.min(count - 1, Math.floor(count * 0.95));
  const p99Index = Math.min(count - 1, Math.floor(count * 0.99));
  
  const p95Ms = sorted[p95Index];
  const p99Ms = sorted[p99Index];
  const maxMs = sorted[count - 1];

  let over20msCount = 0;
  let over80msCount = 0;
  for (const val of sorted) {
    if (val > 20) over20msCount++;
    if (val > 80) over80msCount++;
  }
  const over80msRatio = over80msCount / count;

  // Strict assertion:
  if (maxMs > 80 && over80msCount === 0) {
    throw new Error('Invalid timing distribution: maxMs > 80 but over80msCount is 0');
  }

  return {
    count,
    averageMs,
    medianMs,
    p95Ms,
    p99Ms,
    maxMs,
    over20msCount,
    over80msCount,
    over80msRatio,
  };
}
