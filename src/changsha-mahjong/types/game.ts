import { Player } from './player.js';
import { Tile } from './tile.js';
import { Meld } from './meld.js';
import { ChangshaRuleConfig } from './rule-config.js';
import { ScoreEvent } from './score.js';

export type GamePhase =
  | 'init'
  | 'dealing'
  | 'startingHu'
  | 'playing'
  | 'waitingForResponses'
  | 'gangReplacement'
  | 'haiDi'
  | 'settlement'
  | 'draw'
  | 'ended';

export type ActionType =
  | 'hu'
  | 'mingGang'
  | 'peng'
  | 'chi'
  | 'pass'
  | 'discard'
  | 'ziMo'
  | 'anGang'
  | 'buGang';

export interface PendingAction {
  seat: 0 | 1 | 2 | 3;
  type: ActionType;
  priority: number;
  tile?: Tile;
  options?: Tile[][];
}

export interface GameLogEntry {
  step: number;
  phase: GamePhase;
  seat?: 0 | 1 | 2 | 3;
  action: string;
  detail?: string;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  dealerSeat: 0 | 1 | 2 | 3;
  currentSeat: 0 | 1 | 2 | 3;
  wall: Tile[];
  discards: Record<0 | 1 | 2 | 3, Tile[]>;
  lastDiscard?: {
    tile: Tile;
    fromSeat: 0 | 1 | 2 | 3;
  };
  pendingActions: PendingAction[];
  scoreEvents: ScoreEvent[];
  logs: GameLogEntry[];
  config: ChangshaRuleConfig;
  roundEnded: boolean;
  winnerSeats: Array<0 | 1 | 2 | 3>;
  birdTiles?: Tile[];
  activeSeats?: Array<0 | 1 | 2 | 3>;
  gamePlayerCount?: 2 | 3 | 4;
  isLegacy?: boolean;
}

export type BigHuType =
  | 'pengPengHu'
  | 'jiangJiangHu'
  | 'qingYiSe'
  | 'qiXiaoDui'
  | 'haoHuaQiXiaoDui'
  | 'gangShangKaiHua'
  | 'qiangGangHu'
  | 'haiDiLaoYue'
  | 'haiDiPao'
  | 'quanQiuRen'
  | 'tianHu'
  | 'diHu';

export interface HuCheckInput {
  hand: Tile[];
  melds: Meld[];
  winningTile?: Tile;
  winMethod: 'ziMo' | 'dianPao';
  context?: {
    isGangShangKaiHua?: boolean;
    isQiangGangHu?: boolean;
    isHaiDiLaoYue?: boolean;
    isHaiDiPao?: boolean;
    isTianHu?: boolean;
    isDiHu?: boolean;
    hasOpenedDoor?: boolean;
  };
  config: ChangshaRuleConfig;
}

export interface HuResult {
  canHu: boolean;
  huCategory?: 'smallHu' | 'bigHu';
  bigHuTypes: BigHuType[];
  isSmallHu: boolean;
  need258Jiang: boolean;
}
