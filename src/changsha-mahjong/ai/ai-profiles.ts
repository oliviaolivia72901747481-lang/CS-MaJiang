import { AIProfile, AIProfileType } from './ai-types.js';

// Note: Personality profiles are dynamically adjusted in Advanced AI evaluation
// using activeTuningConfig factors (e.g. bigHuRouteBonus, defensiveSafetyBonus, fastHuShantenBonus).
export const AI_PROFILES: Record<AIProfileType, AIProfile> = {
  fastHu: {
    type: 'fastHu',
    name: '快胡型',
    weights: {
      shanten: 2.0,
      effectiveTiles: 1.5,
      pairValue: 0.5,
      sequenceValue: 1.0,
      qingYiSePotential: 0.2,
      pengPengHuPotential: 0.2,
      qiXiaoDuiPotential: 0.1,
      riskAvoidance: 0.2,
      gangAggression: 0.8,
      chiPengAggression: 1.5,
    },
  },
  bigHu: {
    type: 'bigHu',
    name: '大胡型',
    weights: {
      shanten: 1.0,
      effectiveTiles: 0.8,
      pairValue: 1.2,
      sequenceValue: 0.5,
      qingYiSePotential: 2.0,
      pengPengHuPotential: 2.0,
      qiXiaoDuiPotential: 2.0,
      riskAvoidance: 0.5,
      gangAggression: 1.2,
      chiPengAggression: 0.3,
    },
  },
  defensive: {
    type: 'defensive',
    name: '防守型',
    weights: {
      shanten: 1.0,
      effectiveTiles: 1.0,
      pairValue: 0.8,
      sequenceValue: 0.8,
      qingYiSePotential: 0.2,
      pengPengHuPotential: 0.5,
      qiXiaoDuiPotential: 0.5,
      riskAvoidance: 2.5,
      gangAggression: 0.3,
      chiPengAggression: 0.5,
    },
  },
  balanced: {
    type: 'balanced',
    name: '均衡型',
    weights: {
      shanten: 1.5,
      effectiveTiles: 1.2,
      pairValue: 1.0,
      sequenceValue: 1.0,
      qingYiSePotential: 1.0,
      pengPengHuPotential: 1.0,
      qiXiaoDuiPotential: 1.0,
      riskAvoidance: 1.0,
      gangAggression: 1.0,
      chiPengAggression: 1.0,
    },
  },
};
