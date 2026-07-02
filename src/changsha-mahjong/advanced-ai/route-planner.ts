import { RouteEvaluation, RouteType } from './advanced-ai-types.js';
import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';
import { AIProfile } from '../ai/ai-types.js';
import { calculateBestShanten, calculateQiXiaoDuiShanten } from '../ai/shanten-calculator.js';
import { activeTuningConfig } from '../benchmark/tuning-config.js';

export function evaluateRoutes(input: {
  hand: Tile[];
  melds: Meld[];
  visibleTiles: Tile[];
  profile: AIProfile;
}): RouteEvaluation[] {
  const { hand, melds, profile } = input;
  const evaluations: RouteEvaluation[] = [];
  const config = activeTuningConfig;

  // Helper: group hand by frequency
  const frequencyMap = new Map<string, number>();
  for (const t of hand) {
    const key = `${t.suit}_${t.rank}`;
    frequencyMap.set(key, (frequencyMap.get(key) || 0) + 1);
  }

  // 1. Route: smallHu
  const bestShantenResult = calculateBestShanten(hand, melds);
  const normalShanten = bestShantenResult.normalShanten;
  // Give smallHu a base advantage (+15 points)
  let smallHuScore = 115 - normalShanten * 8;
  if (profile.type === 'fastHu') {
    smallHuScore += 25 + config.fastHuShantenBonus;
  }
  evaluations.push({
    route: 'smallHu',
    score: Math.max(0, smallHuScore),
    shanten: normalShanten,
    potentialScore: 10,
    requiredTiles: [],
    reason: `普通路线：向听数为 ${normalShanten}，适合追求快速开胡。`,
  });

  // 2. Route: qingYiSe
  const suitCounts: Record<'wan' | 'tong' | 'tiao', number> = { wan: 0, tong: 0, tiao: 0 };
  for (const t of hand) {
    suitCounts[t.suit]++;
  }
  for (const m of melds) {
    for (const t of m.tiles) {
      suitCounts[t.suit as 'wan' | 'tong' | 'tiao']++;
    }
  }

  const suits: Array<'wan' | 'tong' | 'tiao'> = ['wan', 'tong', 'tiao'];
  let dominatingSuit: 'wan' | 'tong' | 'tiao' = 'wan';
  let maxCount = 0;
  for (const s of suits) {
    if (suitCounts[s] > maxCount) {
      maxCount = suitCounts[s];
      dominatingSuit = s;
    }
  }

  const hasOtherMeldSuits = melds.some(m => m.tiles.some(t => t.suit !== dominatingSuit));
  let qingYiSeShanten = 99;
  let qingYiSeScore = 0;

  // Hard threshold: target suit count must be >= 9
  const qingYiSeHighPotential = maxCount >= 9;

  if (!hasOtherMeldSuits && qingYiSeHighPotential) {
    const matchingHand = hand.filter(t => t.suit === dominatingSuit);
    const matchingMelds = melds.filter(m => m.tiles.every(t => t.suit === dominatingSuit));
    const nonMatchingCount = hand.length - matchingHand.length;
    
    const subShanten = calculateBestShanten(matchingHand, matchingMelds).bestShanten;
    qingYiSeShanten = Math.max(subShanten, nonMatchingCount);
    qingYiSeScore = maxCount * 12 - qingYiSeShanten * 8;
    if (profile.type === 'bigHu') {
      qingYiSeScore += 30 + config.bigHuRouteBonus;
    }
  } else {
    qingYiSeScore = 0;
    qingYiSeShanten = 99;
  }

  const suitName = dominatingSuit === 'wan' ? '万字' : dominatingSuit === 'tong' ? '筒子' : '条子';
  evaluations.push({
    route: 'qingYiSe',
    score: Math.max(0, qingYiSeScore),
    shanten: qingYiSeShanten,
    potentialScore: 60,
    requiredTiles: [],
    reason: qingYiSeShanten === 99
      ? '花色张数不足 9 张或副露有杂色，无法做清一色大胡。'
      : `清一色（${suitName}）：目前收集了该花色 ${maxCount} 张，向听数约为 ${qingYiSeShanten}。`,
  });

  // 3. Route: pengPengHu
  const hasChiMeld = melds.some(m => m.type === 'chi');
  let pengPengShanten = 99;
  let pengPengScore = 0;

  let triplets = 0;
  let pairs = 0;
  for (const count of frequencyMap.values()) {
    if (count >= 3) {
      triplets++;
    } else if (count === 2) {
      pairs++;
    }
  }
  const M = melds.length;
  // Hard threshold: triplets + pairs >= 4
  const totalTripletsAndPairs = M + triplets + pairs;
  const pengPengHighPotential = totalTripletsAndPairs >= 4;

  if (!hasChiMeld && pengPengHighPotential) {
    pengPengShanten = Math.max(-1, (4 - M - triplets) * 2 - (pairs > 0 ? 1 : 0));
    pengPengScore = (M + triplets) * 32 + pairs * 15 - pengPengShanten * 3;
    if (profile.type === 'bigHu') {
      pengPengScore += 25 + config.bigHuRouteBonus;
    }
  } else {
    pengPengScore = 0;
    pengPengShanten = 99;
  }

  evaluations.push({
    route: 'pengPengHu',
    score: Math.max(0, pengPengScore),
    shanten: pengPengShanten,
    potentialScore: 40,
    requiredTiles: [],
    reason: pengPengShanten === 99
      ? '对子与刻子结构不足 4 组或已有吃牌副露，无法做碰碰胡。'
      : `碰碰胡：当前对/刻共 ${totalTripletsAndPairs} 组，向听数为 ${pengPengShanten}。`,
  });

  // 4. Route: qiXiaoDui
  let qiXiaoDuiShanten = 99;
  let qiXiaoDuiScore = 0;
  let pairsCount = 0;

  if (melds.length === 0) {
    qiXiaoDuiShanten = calculateQiXiaoDuiShanten(hand);
    pairsCount = 7 - qiXiaoDuiShanten;
  }

  // Hard threshold: pairs count >= 4
  const qiXiaoDuiHighPotential = pairsCount >= 4;

  if (melds.length === 0 && qiXiaoDuiHighPotential) {
    qiXiaoDuiScore = (6 - qiXiaoDuiShanten) * 15;
    if (profile.type === 'bigHu') {
      qiXiaoDuiScore += 25 + config.bigHuRouteBonus;
    }
  } else {
    qiXiaoDuiScore = 0;
    qiXiaoDuiShanten = 99;
  }

  evaluations.push({
    route: 'qiXiaoDui',
    score: Math.max(0, qiXiaoDuiScore),
    shanten: qiXiaoDuiShanten,
    potentialScore: 50,
    requiredTiles: [],
    reason: qiXiaoDuiShanten === 99
      ? '对子数不足 4 对或已有副露，已无法做七小对。'
      : `七小对：当前向听数为 ${qiXiaoDuiShanten}，适合门清时发展。`,
  });

  // 5. Route: jiangJiangHu
  const hasNonJiangMeld = melds.some(m => m.tiles.some(t => t.rank !== 2 && t.rank !== 5 && t.rank !== 8));
  let jiangJiangShanten = 99;
  let jiangJiangScore = 0;

  const jiangTilesCount = hand.filter(t => t.rank === 2 || t.rank === 5 || t.rank === 8).length +
    melds.reduce((sum, m) => sum + m.tiles.filter(t => t.rank === 2 || t.rank === 5 || t.rank === 8).length, 0);

  // Hard threshold: 2-5-8 tiles count >= 9
  const jiangJiangHighPotential = jiangTilesCount >= 9;

  if (!hasNonJiangMeld && jiangJiangHighPotential) {
    const nonJiangCount = hand.filter(t => t.rank !== 2 && t.rank !== 5 && t.rank !== 8).length;
    jiangJiangShanten = nonJiangCount;
    jiangJiangScore = (hand.length - nonJiangCount) * 8 - jiangJiangShanten * 10;
    if (profile.type === 'bigHu') {
      jiangJiangScore += 30 + config.bigHuRouteBonus;
    }
  } else {
    jiangJiangScore = 0;
    jiangJiangShanten = 99;
  }

  evaluations.push({
    route: 'jiangJiangHu',
    score: Math.max(0, jiangJiangScore),
    shanten: jiangJiangShanten,
    potentialScore: 65,
    requiredTiles: [],
    reason: jiangJiangShanten === 99
      ? '2-5-8将牌数量不足 9 张或副露有杂牌，无法做将将胡。'
      : `将将胡：手牌中非二五八的杂牌有 ${jiangJiangShanten} 张，向听数为 ${jiangJiangShanten}。`,
  });

  // 6. Route: mixed
  const mixedShanten = bestShantenResult.bestShanten;
  let mixedScore = 80 - mixedShanten * 10;
  if (profile.type === 'balanced') {
    mixedScore += 15;
  }

  evaluations.push({
    route: 'mixed',
    score: Math.max(0, mixedScore),
    shanten: mixedShanten,
    potentialScore: 20,
    requiredTiles: [],
    reason: `混合折中路线：当前向听数为 ${mixedShanten}，看牌进张进行攻守平衡决策。`,
  });

  return evaluations;
}
