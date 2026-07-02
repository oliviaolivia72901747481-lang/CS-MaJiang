export type Seat = 0 | 1 | 2 | 3;
export type GamePlayerCount = 2 | 3 | 4;

export function normalizeActiveSeats(seats: Seat[]): Seat[] {
  const unique = Array.from(new Set(seats));
  return unique.filter((s): s is Seat => s >= 0 && s <= 3).sort((a, b) => a - b);
}

export function assertValidActiveSeats(activeSeats: Seat[]): void {
  if (!activeSeats) {
    throw new Error('activeSeats is undefined or null');
  }
  if (activeSeats.length < 2 || activeSeats.length > 4) {
    throw new Error(`Invalid activeSeats length: ${activeSeats.length}`);
  }
  const normalized = normalizeActiveSeats(activeSeats);
  if (normalized.length !== activeSeats.length) {
    throw new Error('activeSeats contains duplicate or invalid seat IDs');
  }
}

export function isActiveSeat(activeSeats: Seat[], seat: Seat): boolean {
  return activeSeats.includes(seat);
}

export function getNextActiveSeat(activeSeats: Seat[], currentSeat: Seat): Seat {
  assertActiveSeat(activeSeats, currentSeat);
  const sorted = normalizeActiveSeats(activeSeats);
  const idx = sorted.indexOf(currentSeat);
  return sorted[(idx + 1) % sorted.length];
}

export function getPreviousActiveSeat(activeSeats: Seat[], currentSeat: Seat): Seat {
  assertActiveSeat(activeSeats, currentSeat);
  const sorted = normalizeActiveSeats(activeSeats);
  const idx = sorted.indexOf(currentSeat);
  return sorted[(idx - 1 + sorted.length) % sorted.length];
}

export function getActiveOpponents(activeSeats: Seat[], seat: Seat): Seat[] {
  return normalizeActiveSeats(activeSeats).filter(s => s !== seat);
}

export function getActivePlayerCount(activeSeats: Seat[]): GamePlayerCount {
  const len = activeSeats.length;
  if (len !== 2 && len !== 3 && len !== 4) {
    throw new Error(`Invalid active player count: ${len}`);
  }
  return len as GamePlayerCount;
}

export function assertActiveSeat(activeSeats: Seat[], seat: Seat): void {
  if (!activeSeats.includes(seat)) {
    throw new Error(`Seat ${seat} is not an active seat in [${activeSeats.join(', ')}]`);
  }
}
