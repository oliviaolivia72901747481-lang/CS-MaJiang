export type RelativeSeatLabel = '我' | '上' | '下' | '对';
export type Seat = 0 | 1 | 2 | 3;

export function getRelativeSeatLabel(
  selfSeat: Seat,
  targetSeat: Seat,
  activeSeats: readonly Seat[]
): RelativeSeatLabel {
  const orderedSeats = [...activeSeats].sort((a, b) => a - b);
  const selfIndex = orderedSeats.indexOf(selfSeat);
  const targetIndex = orderedSeats.indexOf(targetSeat);

  if (selfIndex === -1) {
    throw new Error(`inactive self seat: ${selfSeat}`);
  }
  if (targetIndex === -1) {
    throw new Error(`inactive target seat: ${targetSeat}`);
  }

  if (selfSeat === targetSeat) return '我';

  const playerCount = orderedSeats.length;
  const offset = (targetIndex - selfIndex + playerCount) % playerCount;

  if (playerCount === 2) return '对';
  if (playerCount === 3) return offset === 1 ? '下' : '上';
  if (playerCount === 4) {
    if (offset === 1) return '下';
    if (offset === 2) return '对';
    return '上';
  }

  throw new Error(`unsupported active seat count: ${playerCount}`);
}
