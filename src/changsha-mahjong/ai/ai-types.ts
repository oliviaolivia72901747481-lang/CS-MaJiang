import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';

export type AIProfileType =
  | 'fastHu'
  | 'bigHu'
  | 'defensive'
  | 'balanced';

export interface AIProfile {
  type: AIProfileType;
  name: string;

  weights: {
    shanten: number;
    effectiveTiles: number;
    pairValue: number;
    sequenceValue: number;
    qingYiSePotential: number;
    pengPengHuPotential: number;
    qiXiaoDuiPotential: number;
    riskAvoidance: number;
    gangAggression: number;
    chiPengAggression: number;
  };
}

export interface TileEvaluation {
  tileKey: string;
  keepValue: number;
  discardValue: number;
  riskValue: number;
  reason: string;
}

export interface HandEvaluation {
  normalShanten: number;
  qiXiaoDuiShanten: number;
  bestShanten: number;
  effectiveTileKeys: string[];
  qingYiSePotential: number;
  pengPengHuPotential: number;
  qiXiaoDuiPotential: number;
  pairCount: number;
  meldLikeCount: number;
  isolatedTileCount: number;
  summary: string;
}

export interface AIDecision {
  action: 'hu' | 'ziMo' | 'discard' | 'chi' | 'peng' | 'mingGang' | 'buGang' | 'anGang' | 'pass';
  tileKey?: string;
  tiles?: string[];
  score: number;
  reason: string;
  rejectedReason?: string;
}
