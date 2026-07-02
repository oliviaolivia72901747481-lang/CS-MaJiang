export interface HandAdvice {
  normalShanten: number;
  qiXiaoDuiShanten: number;
  bestShanten: number;
  effectiveTileKeys: string[];
  effectiveTileCount: number;
  summary: string;
}

export interface DiscardAdvice {
  tileKey: string;
  tileName: string;
  score: number;
  reason: string;
  expectedShantenAfterDiscard: number;
  effectiveTilesAfterDiscard: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ActionAdvice {
  action: 'chi' | 'peng' | 'gang' | 'hu' | 'pass';
  recommend: boolean;
  score: number;
  reason: string;
}

export interface DiscardRisk {
  tileKey: string;
  tileName: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
}

export interface RiskAdvice {
  tileKey: string;
  tileName: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
}

export interface PlayerDecisionRecord {
  step: number;
  phase: string;
  seat: 0 | 1 | 2 | 3;
  actualAction: string;
  actualTileKey?: string;
  recommendedAction?: string;
  recommendedTileKey?: string;
  matchedRecommendation: boolean;
  reason: string;
}

export interface ReplayInsight {
  type: 'realTimeKnown' | 'afterTheFact';
  title: string;
  description: string;
}

export interface ReplayReport {
  roundResult: 'win' | 'lose' | 'draw';
  playerScoreDelta: number;
  totalDecisions: number;
  matchedRecommendationCount: number;
  riskyDiscardCount: number;
  goodDecisions: PlayerDecisionRecord[];
  questionableDecisions: PlayerDecisionRecord[];
  keyMoments: string[];
  summary: string;
  nextRoundTips: string[];
  insights?: ReplayInsight[];
}
