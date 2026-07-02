import { runTuningCandidates } from './tuning-runner.js';
import { V073_PRESETS } from './v073-tuning-presets.js';
import { TuningResult } from './benchmark-types.js';

export function runV073TuningRunner(input: {
  seeds: string[];
  rounds: number;
}): TuningResult[] {
  return runTuningCandidates({
    candidates: V073_PRESETS,
    seeds: input.seeds,
    rounds: input.rounds,
  });
}
