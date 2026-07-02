import { describe, it, expect } from 'vitest';
import { startDecisionTrace, finishDecisionTrace, traceSpan, getDecisionTraces, clearDecisionTraces } from '../benchmark/decision-trace-profiler.js';

describe('Decision Trace Profiler Tests', () => {
  it('1. can start and record root trace successfully', () => {
    clearDecisionTraces();
    const ctx = startDecisionTrace({ seed: 'test-seed', step: 1, seat: 0, actionType: 'discard' });
    const trace = finishDecisionTrace(ctx);

    expect(trace.seed).toBe('test-seed');
    expect(trace.rootSpan.name).toBe('root');
    expect(trace.totalElapsedMs).toBeGreaterThanOrEqual(0);
    expect(getDecisionTraces().length).toBe(1);
  });

  it('2. can record nested child spans correctly', () => {
    const ctx = startDecisionTrace({ seed: 'test-seed', step: 2, seat: 1, actionType: 'action' });
    
    traceSpan(ctx, 'child-1', () => {
      const start = performance.now();
      while (performance.now() - start < 2) {}
    });

    const trace = finishDecisionTrace(ctx);
    expect(trace.rootSpan.children.length).toBe(1);
    expect(trace.rootSpan.children[0].name).toBe('child-1');
    expect(trace.rootSpan.children[0].elapsedMs).toBeGreaterThanOrEqual(1.5);
  });

  it('3. detects unaccounted time when child spans do not add up to totalElapsedMs', () => {
    const ctx = startDecisionTrace({ seed: 'test-seed', step: 3, seat: 2, actionType: 'discard' });
    
    const start = performance.now();
    while (performance.now() - start < 25) {}

    traceSpan(ctx, 'child-2', () => {});

    const trace = finishDecisionTrace(ctx);
    expect(trace.warning).toBeDefined();
    expect(trace.warning).toContain('Unaccounted time');
  });

  it('4. closes trace properly and does not swallow original exceptions', () => {
    const ctx = startDecisionTrace({ seed: 'test-seed', step: 4, seat: 3, actionType: 'action' });

    expect(() => {
      traceSpan(ctx, 'error-span', () => {
        throw new Error('Original error');
      });
    }).toThrow('Original error');

    const trace = finishDecisionTrace(ctx);
    expect(trace.rootSpan.children.length).toBe(1);
    expect(trace.rootSpan.children[0].name).toBe('error-span');
  });

  it('5. handles traceSpan safely when context is undefined', () => {
    const val = traceSpan(undefined, 'no-context-span', () => {
      return 42;
    });
    expect(val).toBe(42);
  });

  it('6. clears decision traces successfully', () => {
    clearDecisionTraces();
    expect(getDecisionTraces().length).toBe(0);
  });
});
