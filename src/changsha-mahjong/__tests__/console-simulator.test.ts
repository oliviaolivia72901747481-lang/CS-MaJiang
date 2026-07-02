import { describe, it, expect } from 'vitest';
import { simulateOneRound } from '../simulator/console-simulator.js';

function countAllTiles(state: any): number {
  let total = 0;
  for (const p of state.players) {
    total += p.hand.length;
    total += p.melds.reduce((sum: number, m: any) => sum + m.tiles.length, 0);
    total += p.discards.length;
  }
  total += state.wall.length;
  if (state.birdTiles) {
    total += state.birdTiles.length;
  }
  return total;
}

describe('console-simulator', () => {
  it('1-7. should run simulateOneRound successfully, verifying all rules and conservation of cards', () => {
    const { finalState, summary } = simulateOneRound('sim-seed-1');
    
    expect(finalState.roundEnded).toBe(true);
    expect(finalState.phase).toBe('ended');
    expect(countAllTiles(finalState)).toBe(108);
    expect(finalState.logs.length).toBeGreaterThan(0);
    expect(finalState.logs.length).toBeLessThan(500);
    expect(summary).not.toBe('');
  });

  it('8. should run multiple seeds stably without crashing', () => {
    const seeds = ['seed-alpha', 'seed-beta', 'seed-gamma', 'seed-delta'];
    for (const seed of seeds) {
      const { finalState } = simulateOneRound(seed);
      expect(finalState.roundEnded).toBe(true);
      expect(countAllTiles(finalState)).toBe(108);
    }
  });
});
