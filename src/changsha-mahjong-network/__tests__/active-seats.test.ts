import { describe, it, expect } from 'vitest';
import {
  normalizeActiveSeats,
  assertValidActiveSeats,
  isActiveSeat,
  getNextActiveSeat,
  getPreviousActiveSeat,
  getActiveOpponents,
  getActivePlayerCount,
  assertActiveSeat,
  Seat
} from '../../changsha-mahjong/utils/active-seats.js';

describe('Active Seats Tests', () => {
  it('1. activeSeats = [0, 1] is valid', () => {
    const seats: Seat[] = [0, 1];
    expect(normalizeActiveSeats(seats)).toEqual([0, 1]);
    expect(() => assertValidActiveSeats(seats)).not.toThrow();
  });

  it('2. activeSeats = [0, 1, 2] is valid', () => {
    const seats: Seat[] = [0, 1, 2];
    expect(normalizeActiveSeats(seats)).toEqual([0, 1, 2]);
    expect(() => assertValidActiveSeats(seats)).not.toThrow();
  });

  it('3. activeSeats = [0, 1, 2, 3] is valid', () => {
    const seats: Seat[] = [0, 1, 2, 3];
    expect(normalizeActiveSeats(seats)).toEqual([0, 1, 2, 3]);
    expect(() => assertValidActiveSeats(seats)).not.toThrow();
  });

  it('4. activeSeats length 1 is invalid', () => {
    const seats: Seat[] = [0];
    expect(() => assertValidActiveSeats(seats)).toThrow();
  });

  it('5. activeSeats length 5 is invalid', () => {
    const seats = [0, 1, 2, 3, 3];
    expect(() => assertValidActiveSeats(seats as any)).toThrow();
  });

  it('6. duplicate seat is normalized correctly', () => {
    const seats = [2, 0, 2, 1];
    expect(normalizeActiveSeats(seats as any)).toEqual([0, 1, 2]);
  });

  it('7. getNextActiveSeat([0,1], 0) === 1', () => {
    expect(getNextActiveSeat([0, 1], 0)).toBe(1);
  });

  it('8. getNextActiveSeat([0,1], 1) === 0', () => {
    expect(getNextActiveSeat([0, 1], 1)).toBe(0);
  });

  it('9. getNextActiveSeat([0,2,3], 0) === 2', () => {
    expect(getNextActiveSeat([0, 2, 3], 0)).toBe(2);
  });

  it('10. getNextActiveSeat([0,2,3], 3) === 0', () => {
    expect(getNextActiveSeat([0, 2, 3], 3)).toBe(0);
  });

  it('11. getActiveOpponents([0,2,3], 0) === [2,3]', () => {
    expect(getActiveOpponents([0, 2, 3], 0)).toEqual([2, 3]);
  });

  it('12. getPreviousActiveSeat([0,2,3], 2) === 0', () => {
    expect(getPreviousActiveSeat([0, 2, 3], 2)).toBe(0);
  });

  it('13. getPreviousActiveSeat([0,2,3], 0) === 3', () => {
    expect(getPreviousActiveSeat([0, 2, 3], 0)).toBe(3);
  });

  it('14. assertActiveSeat throws for inactive seat', () => {
    expect(() => assertActiveSeat([0, 1], 2)).toThrow();
  });

  it('15. isActiveSeat returns correct boolean', () => {
    expect(isActiveSeat([0, 2], 2)).toBe(true);
    expect(isActiveSeat([0, 2], 1)).toBe(false);
  });

  it('16. getActivePlayerCount returns count', () => {
    expect(getActivePlayerCount([0, 1])).toBe(2);
    expect(() => getActivePlayerCount([0] as any)).toThrow();
  });
});
