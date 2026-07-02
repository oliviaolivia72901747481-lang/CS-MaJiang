import { Tile } from '../types/tile.js';
import { countTiles } from './tile-engine.js';

export type StartingHuType =
  | 'queYiSe'
  | 'banBanHu'
  | 'liuLiuShun'
  | 'siXi';

export function getStartingHuTypes(hand: Tile[], isDealer: boolean): StartingHuType[] {
  const types: StartingHuType[] = [];
  const counts = countTiles(hand);

  // 1. QueYiSe (缺一色)
  const hasWan = hand.some(t => t.suit === 'wan');
  const hasTong = hand.some(t => t.suit === 'tong');
  const hasTiao = hand.some(t => t.suit === 'tiao');
  if (!hasWan || !hasTong || !hasTiao) {
    types.push('queYiSe');
  }

  // 2. BanBanHu (板板胡)
  const has258 = hand.some(t => t.rank === 2 || t.rank === 5 || t.rank === 8);
  if (!has258) {
    types.push('banBanHu');
  }

  // 3. LiuLiuShun (六六顺)
  let tripletCount = 0;
  for (const count of counts.values()) {
    if (count >= 3) {
      tripletCount++;
    }
  }
  if (tripletCount >= 2) {
    types.push('liuLiuShun');
  }

  // 4. SiXi (四喜)
  let hasQuad = false;
  for (const count of counts.values()) {
    if (count >= 4) {
      hasQuad = true;
      break;
    }
  }
  if (hasQuad) {
    types.push('siXi');
  }

  return types;
}
