import { describe, it, expect } from 'vitest';
import { DEFAULT_ADVANCED_AI_TUNING, activeTuningConfig } from '../benchmark/tuning-config.js';

describe('Tuning Config Tests', () => {
  it('1. DEFAULT_ADVANCED_AI_TUNING exists with finite numbers', () => {
    expect(DEFAULT_ADVANCED_AI_TUNING).toBeDefined();
    
    const keys = Object.keys(DEFAULT_ADVANCED_AI_TUNING) as Array<keyof typeof DEFAULT_ADVANCED_AI_TUNING>;
    keys.forEach(k => {
      if (k !== 'lookaheadTrigger') {
        const v = DEFAULT_ADVANCED_AI_TUNING[k];
        expect(typeof v === 'number').toBe(true);
        expect(Number.isFinite(v)).toBe(true);
      }
    });
  });

  it('2. lookaheadDepth is strictly 1 or 2', () => {
    expect([1, 2]).toContain(DEFAULT_ADVANCED_AI_TUNING.lookaheadDepth);
  });

  it('3. checks threshold ranges are reasonable', () => {
    expect(DEFAULT_ADVANCED_AI_TUNING.defenseSwitchRiskThreshold).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_ADVANCED_AI_TUNING.defenseSwitchRiskThreshold).toBeLessThanOrEqual(100);

    expect(DEFAULT_ADVANCED_AI_TUNING.foldWallRemainingThreshold).toBeGreaterThan(0);
    expect(DEFAULT_ADVANCED_AI_TUNING.foldWallRemainingThreshold).toBeLessThan(40);
  });
});
