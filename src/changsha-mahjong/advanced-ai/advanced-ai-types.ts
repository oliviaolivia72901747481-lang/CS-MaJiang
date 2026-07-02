import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';

export type StrategyMode =
  | 'attack'
  | 'defense'
  | 'balanced'
  | 'forceWin'
  | 'fold';

export type RouteType =
  | 'smallHu'
  | 'qingYiSe'
  | 'pengPengHu'
  | 'qiXiaoDui'
  | 'jiangJiangHu'
  | 'mixed';

export interface VisibleInformationForAI {
  seat: 0 | 1 | 2 | 3;
  hand: Tile[];
  melds: Meld[];
  allDiscards: Record<0 | 1 | 2 | 3, Tile[]>;
  allMelds: Record<0 | 1 | 2 | 3, Meld[]>;
  revealedTiles: Tile[];
  wallRemainingCount: number;
  currentPhase: string;
  currentSeat: 0 | 1 | 2 | 3;
  lastDiscard?: {
    tile: Tile;
    fromSeat: 0 | 1 | 2 | 3;
  };
}

export interface OpponentRead {
  seat: 0 | 1 | 2 | 3;
  suspectedRoutes: Array<{
    route: RouteType;
    confidence: number;
    reason: string;
  }>;
  dangerousSuits: Array<{
    suit: 'wan' | 'tong' | 'tiao';
    confidence: number;
    reason: string;
  }>;
  isLikelyTing: boolean;
  tingConfidence: number;
  reason: string;
}

export interface DefenseEvaluation {
  tileKey: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  dangerousToSeats: Array<0 | 1 | 2 | 3>;
  reason: string;
}

export interface RouteEvaluation {
  route: RouteType;
  score: number;
  shanten: number;
  potentialScore: number;
  requiredTiles: string[];
  reason: string;
}

export interface ExpectedValueResult {
  tileKey: string;
  attackValue: number;
  defenseRisk: number;
  routeValue: number;
  expectedScore: number;
  reason: string;
}

export interface LookaheadResult {
  tileKey: string;
  depth: number;
  expectedValue: number;
  bestFutureTiles: string[];
  riskSummary: string;
  reason: string;
}

export interface AdvancedAIDecision {
  action: 'discard' | 'chi' | 'peng' | 'mingGang' | 'buGang' | 'anGang' | 'hu' | 'pass';
  tileKey?: string;
  tiles?: string[];
  strategyMode: StrategyMode;
  selectedRoute: RouteType;
  expectedValue: number;
  riskScore: number;
  reason: string;
}
