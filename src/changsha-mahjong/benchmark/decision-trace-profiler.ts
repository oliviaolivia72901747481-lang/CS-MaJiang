import { DecisionTrace, DecisionTraceSpan } from './benchmark-types.js';

export interface DecisionTraceContext {
  trace: DecisionTrace;
  activeSpans: DecisionTraceSpan[];
}

let activeTraces: DecisionTrace[] = [];

export function recordDecisionTrace(trace: DecisionTrace) {
  activeTraces.push(trace);
}

export function getDecisionTraces(): DecisionTrace[] {
  return [...activeTraces];
}

export function clearDecisionTraces() {
  activeTraces = [];
}

export function startDecisionTrace(input: {
  seed: string;
  step: number;
  seat: 0 | 1 | 2 | 3;
  actionType: 'discard' | 'action';
}): DecisionTraceContext {
  const rootSpan: DecisionTraceSpan = {
    name: 'root',
    startMs: performance.now(),
    endMs: 0,
    elapsedMs: 0,
    children: [],
  };
  const trace: DecisionTrace = {
    seed: input.seed,
    step: input.step,
    seat: input.seat,
    actionType: input.actionType,
    totalElapsedMs: 0,
    rootSpan,
    exceededBudget: false,
  };
  return {
    trace,
    activeSpans: [rootSpan],
  };
}

export function traceSpan<T>(context: DecisionTraceContext | undefined, name: string, fn: () => T): T {
  if (!context) {
    return fn();
  }
  const currentParent = context.activeSpans[context.activeSpans.length - 1];
  if (!currentParent) {
    return fn();
  }
  const newSpan: DecisionTraceSpan = {
    name,
    startMs: performance.now(),
    endMs: 0,
    elapsedMs: 0,
    children: [],
  };
  currentParent.children.push(newSpan);
  context.activeSpans.push(newSpan);
  try {
    return fn();
  } catch (e) {
    throw e;
  } finally {
    newSpan.endMs = performance.now();
    newSpan.elapsedMs = newSpan.endMs - newSpan.startMs;
    context.activeSpans.pop();
  }
}

export function finishDecisionTrace(context: DecisionTraceContext): DecisionTrace {
  const root = context.trace.rootSpan;
  root.endMs = performance.now();
  root.elapsedMs = root.endMs - root.startMs;
  context.trace.totalElapsedMs = root.elapsedMs;
  
  // Calculate unaccounted time
  let childSum = 0;
  for (const c of root.children) {
    childSum += c.elapsedMs;
  }
  const unaccounted = root.elapsedMs - childSum;
  if (unaccounted > 20) {
    context.trace.warning = `Unaccounted time is ${unaccounted.toFixed(2)}ms (total: ${root.elapsedMs.toFixed(2)}ms, sum of children: ${childSum.toFixed(2)}ms)`;
  }
  
  recordDecisionTrace(context.trace);
  return context.trace;
}
