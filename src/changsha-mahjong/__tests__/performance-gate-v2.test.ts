import { describe, it, expect } from 'vitest';
import { evaluatePerformanceGateV2 } from '../benchmark/performance-gate-v2.js';
import { PerformanceBenchmarkV2Result } from '../benchmark/runtime-benchmark-runner.js';

describe('Performance Gate V2 Tests', () => {
  function createMockBenchmarkRes(): PerformanceBenchmarkV2Result {
    return {
      coldStartSamples: [],
      warmRunSamples: [],
      aiDecisionDistribution: {
        count: 10,
        averageMs: 5,
        medianMs: 4,
        p95Ms: 8,
        p99Ms: 12,
        maxMs: 15,
        over20msCount: 0,
        over80msCount: 0,
        over80msRatio: 0,
      },
      gameStepDistribution: {
        count: 10,
        averageMs: 6,
        medianMs: 5,
        p95Ms: 10,
        p99Ms: 15,
        maxMs: 18,
        over20msCount: 0,
        over80msCount: 0,
        over80msRatio: 0,
      },
      totalLoopDistribution: {
        count: 10,
        averageMs: 8,
        medianMs: 7,
        p95Ms: 12,
        p99Ms: 18,
        maxMs: 22,
        over20msCount: 0,
        over80msCount: 0,
        over80msRatio: 0,
      },
      excludedColdStartCount: 0,
      warnings: [],
    };
  }

  it('1. passes all gates when mock timing is within budget limits', () => {
    const res = createMockBenchmarkRes();
    const gateRes = evaluatePerformanceGateV2(res);
    expect(gateRes.aiDecisionPassed).toBe(true);
    expect(gateRes.gameLoopPassed).toBe(true);
    expect(gateRes.allPassed).toBe(true);
  });

  it('2. fails AI Decision Gate when average ms exceeds 10ms', () => {
    const res = createMockBenchmarkRes();
    res.aiDecisionDistribution.averageMs = 12;
    const gateRes = evaluatePerformanceGateV2(res);
    expect(gateRes.aiDecisionPassed).toBe(false);
    expect(gateRes.aiDecisionReasons[0]).toContain('Average decision time');
  });

  it('3. fails AI Decision Gate when p95 ms exceeds 20ms', () => {
    const res = createMockBenchmarkRes();
    res.aiDecisionDistribution.p95Ms = 25;
    const gateRes = evaluatePerformanceGateV2(res);
    expect(gateRes.aiDecisionPassed).toBe(false);
    expect(gateRes.aiDecisionReasons[0]).toContain('P95 decision time');
  });

  it('4. fails AI Decision Gate when max ms exceeds 100ms', () => {
    const res = createMockBenchmarkRes();
    res.aiDecisionDistribution.maxMs = 120;
    res.aiDecisionDistribution.over80msCount = 1;
    res.aiDecisionDistribution.over80msRatio = 0.1;
    const gateRes = evaluatePerformanceGateV2(res);
    expect(gateRes.aiDecisionPassed).toBe(false);
    expect(gateRes.aiDecisionReasons[0]).toContain('Max decision time');
  });

  it('5. passes Game Loop Gate and triggers Cold Start Warning when cold start time exceeds 300ms', () => {
    const res = createMockBenchmarkRes();
    res.coldStartSamples = [
      {
        seed: 'test-seed',
        roundIndex: 0,
        step: 0,
        seat: 0,
        actionType: 'discard',
        aiMode: 'lite',
        coldStart: true,
        aiDecisionMs: 350,
        over20ms: true,
        over80ms: true,
        source: 'runtime',
      }
    ];

    const gateRes = evaluatePerformanceGateV2(res);
    expect(gateRes.gameLoopPassed).toBe(true);
    expect(gateRes.coldStartWarning).toBe(true);
    expect(gateRes.coldStartWarningMsg).toContain('Cold start max decision time reached');
  });

  it('6. fails Game Loop Gate when average total loop is >= 25ms', () => {
    const res = createMockBenchmarkRes();
    res.totalLoopDistribution.averageMs = 28;
    const gateRes = evaluatePerformanceGateV2(res);
    expect(gateRes.gameLoopPassed).toBe(false);
    expect(gateRes.gameLoopReasons[0]).toContain('Average loop time');
  });

  it('7. fails Game Loop Gate when p95 loop is >= 50ms', () => {
    const res = createMockBenchmarkRes();
    res.totalLoopDistribution.p95Ms = 55;
    const gateRes = evaluatePerformanceGateV2(res);
    expect(gateRes.gameLoopPassed).toBe(false);
    expect(gateRes.gameLoopReasons[0]).toContain('P95 loop time');
  });
});
