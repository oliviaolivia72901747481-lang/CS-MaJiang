import { describe, it, expect } from 'vitest';
import { FAST_BALANCED_LITE_TUNING, NO_LOOKAHEAD_FASTHU_TUNING, DEFENSE_LITE_TUNING, V073_PRESETS } from '../benchmark/v073-tuning-presets.js';

describe('v0.7.3 Tuning Presets Tests', () => {
  it('1. verifies all presets exist in V073_PRESETS list', () => {
    expect(V073_PRESETS.length).toBe(3);
    const names = V073_PRESETS.map(p => p.name);
    expect(names).toContain('fast-balanced-lite');
    expect(names).toContain('no-lookahead-fastHu');
    expect(names).toContain('defense-lite');
  });

  it('2. checks that all preset configurations contain valid finite numbers', () => {
    V073_PRESETS.forEach(preset => {
      const keys = Object.keys(preset.config) as Array<keyof typeof preset.config>;
      keys.forEach(k => {
        if (k !== 'lookaheadTrigger') {
          const val = preset.config[k];
          expect(typeof val === 'number').toBe(true);
          expect(Number.isFinite(val)).toBe(true);
        }
      });
    });
  });

  it('3. checks lookahead parameters of no-lookahead-fastHu preset are disabled', () => {
    expect(NO_LOOKAHEAD_FASTHU_TUNING.lookaheadWeight).toBe(0);
    expect(NO_LOOKAHEAD_FASTHU_TUNING.lookaheadTopK).toBe(0);
    expect(NO_LOOKAHEAD_FASTHU_TUNING.lookaheadBudgetMs).toBe(0);
    expect(NO_LOOKAHEAD_FASTHU_TUNING.lookaheadTrigger?.enabled).toBe(false);
  });

  it('4. checks defense-lite lookahead limit is 8ms', () => {
    expect(DEFENSE_LITE_TUNING.lookaheadBudgetMs).toBe(8);
    expect(DEFENSE_LITE_TUNING.lookaheadTrigger?.budgetMs).toBe(8);
  });

  it('5. checks fast-balanced-lite lookahead limit is 10ms', () => {
    expect(FAST_BALANCED_LITE_TUNING.lookaheadBudgetMs).toBe(10);
    expect(FAST_BALANCED_LITE_TUNING.lookaheadTrigger?.budgetMs).toBe(10);
  });
});
