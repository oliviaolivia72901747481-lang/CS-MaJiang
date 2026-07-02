import { Tile } from './tile.js';
import { ChangshaRuleConfig } from './rule-config.js';
import { StartingHuType } from '../engine/starting-hu-checker.js';
import { BigHuType } from './game.js';

export interface ScoreEvent {
  fromPlayerId: string;
  toPlayerId: string;
  score: number;
  reason: string;
}

export interface GangScoreInput {
  gangType: 'mingGang' | 'buGang' | 'anGang';
  playerSeat: 0 | 1 | 2 | 3;
  fromSeat?: 0 | 1 | 2 | 3;
  seatToPlayerId: Record<number, string>;
  config: ChangshaRuleConfig;
  activeSeats?: number[];
}

export interface StartingHuScoreInput {
  winnerSeat: 0 | 1 | 2 | 3;
  startingHuTypes: StartingHuType[];
  seatToPlayerId: Record<number, string>;
  dealerSeat: 0 | 1 | 2 | 3;
  config: ChangshaRuleConfig;
  activeSeats?: number[];
}

export interface HuScoreInput {
  winnerSeat: 0 | 1 | 2 | 3;
  winMethod: 'ziMo' | 'dianPao';
  loserSeat?: 0 | 1 | 2 | 3;
  isSmallHu: boolean;
  bigHuTypes: BigHuType[];
  seatToPlayerId: Record<number, string>;
  config: ChangshaRuleConfig;
  activeSeats?: number[];
}

export interface FinalScoreInput {
  baseScores: ScoreEvent[];
  birdTiles: Tile[];
  dealerSeat: 0 | 1 | 2 | 3;
  winnerSeat: 0 | 1 | 2 | 3;
  winMethod: 'ziMo' | 'dianPao';
  loserSeat?: 0 | 1 | 2 | 3;
  seatToPlayerId: Record<number, string>;
  config: ChangshaRuleConfig;
  activeSeats?: number[];
}
