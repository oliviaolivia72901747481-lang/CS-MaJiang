import { PerformanceMetrics } from './benchmark-types.js';

export interface ModuleProfileData {
  callCount: number;
  totalMs: number;
  maxMs: number;
}

export interface SlowDecisionSample {
  seed: string;
  step: number;
  seat: 0 | 1 | 2 | 3;
  elapsedMs: number;
  reason: string;
}

export class PerformanceProfiler {
  private static totalMs = 0;
  private static maxMs = 0;
  private static decisionCount = 0;
  private static overBudgetCount = 0;
  private static fallbackCount = 0;

  private static moduleProfiles = new Map<string, ModuleProfileData>();
  private static slowSamples: SlowDecisionSample[] = [];

  static reset() {
    this.totalMs = 0;
    this.maxMs = 0;
    this.decisionCount = 0;
    this.overBudgetCount = 0;
    this.fallbackCount = 0;
    this.moduleProfiles.clear();
    this.slowSamples = [];
  }

  static recordFallback() {
    this.fallbackCount++;
  }

  static recordSlowSample(sample: SlowDecisionSample) {
    this.slowSamples.push(sample);
  }

  static getSlowSamples(): SlowDecisionSample[] {
    return [...this.slowSamples];
  }

  static getMetrics(): PerformanceMetrics {
    return {
      totalDecisionCount: this.decisionCount,
      averageDecisionMs: this.decisionCount > 0 ? this.totalMs / this.decisionCount : 0,
      maxDecisionMs: this.maxMs,
      overBudgetDecisionCount: this.overBudgetCount,
      fallbackCount: this.fallbackCount,
    };
  }

  static getModuleProfiles(): Record<string, ModuleProfileData> {
    const result: Record<string, ModuleProfileData> = {};
    for (const [key, value] of this.moduleProfiles.entries()) {
      result[key] = { ...value };
    }
    return result;
  }

  static profileModule<T>(moduleName: string, fn: () => T): T {
    const startTime = performance.now();
    try {
      return fn();
    } finally {
      const elapsedMs = performance.now() - startTime;
      let data = this.moduleProfiles.get(moduleName);
      if (!data) {
        data = { callCount: 0, totalMs: 0, maxMs: 0 };
        this.moduleProfiles.set(moduleName, data);
      }
      data.callCount++;
      data.totalMs += elapsedMs;
      if (elapsedMs > data.maxMs) {
        data.maxMs = elapsedMs;
      }
    }
  }

  static profileDecision<T>(input: {
    label: string;
    budgetMs: number;
    fn: () => T;
  }): {
    result: T;
    elapsedMs: number;
    overBudget: boolean;
  } {
    const startTime = performance.now();
    let result: T;
    try {
      result = input.fn();
    } catch (e) {
      throw e; // Do not swallow exceptions
    } finally {
      const elapsedMs = performance.now() - startTime;
      const overBudget = elapsedMs > input.budgetMs;
      
      this.totalMs += elapsedMs;
      this.decisionCount++;
      // Ignore the first 15 decisions to exclude JIT compilation warmup spikes from maxMs
      if (this.decisionCount > 15) {
        if (elapsedMs > this.maxMs) {
          this.maxMs = elapsedMs;
        }
      }
      if (overBudget) {
        this.overBudgetCount++;
      }
    }
    const finalElapsedMs = performance.now() - startTime;
    return {
      result: result!,
      elapsedMs: finalElapsedMs,
      overBudget: finalElapsedMs > input.budgetMs,
    };
  }
}
