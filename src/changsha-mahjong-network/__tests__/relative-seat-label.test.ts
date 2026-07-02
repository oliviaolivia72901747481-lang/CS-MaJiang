import { describe, expect, it } from 'vitest';
import { getRelativeSeatLabel } from '../utils/relative-seat-label.js';

describe('getRelativeSeatLabel', () => {
  it('labels a four-player table from any self seat', () => {
    const activeSeats = [0, 1, 2, 3] as const;

    expect(getRelativeSeatLabel(0, 0, activeSeats)).toBe('我');
    expect(getRelativeSeatLabel(0, 1, activeSeats)).toBe('下');
    expect(getRelativeSeatLabel(0, 2, activeSeats)).toBe('对');
    expect(getRelativeSeatLabel(0, 3, activeSeats)).toBe('上');

    expect(getRelativeSeatLabel(2, 1, activeSeats)).toBe('上');
    expect(getRelativeSeatLabel(2, 3, activeSeats)).toBe('下');
  });

  it('labels a three-player table without an opposite seat', () => {
    const activeSeats = [0, 2, 3] as const;

    expect(getRelativeSeatLabel(2, 2, activeSeats)).toBe('我');
    expect(getRelativeSeatLabel(2, 3, activeSeats)).toBe('下');
    expect(getRelativeSeatLabel(2, 0, activeSeats)).toBe('上');
  });

  it('labels a two-player table opponent as opposite', () => {
    const activeSeats = [1, 3] as const;

    expect(getRelativeSeatLabel(3, 3, activeSeats)).toBe('我');
    expect(getRelativeSeatLabel(3, 1, activeSeats)).toBe('对');
  });

  it('rejects inactive target seats', () => {
    expect(() => getRelativeSeatLabel(0, 2, [0, 1] as const)).toThrow(/inactive/i);
  });
});
