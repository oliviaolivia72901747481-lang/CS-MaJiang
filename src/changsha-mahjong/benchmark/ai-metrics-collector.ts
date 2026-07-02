import { DEFAULT_RULE_CONFIG } from '../config/default-rule-config.js';
import { GameState } from '../types/game.js';
import { PlayerRoundMetrics, AIEngineType } from './benchmark-types.js';
import { canHu } from '../engine/hu-checker.js';

export function collectRoundMetrics(input: {
  finalState: GameState;
  aiEngines: Record<0 | 1 | 2 | 3, AIEngineType>;
  aiProfiles: Record<0 | 1 | 2 | 3, string>;
}): PlayerRoundMetrics[] {
  const { finalState, aiEngines, aiProfiles } = input;
  const metrics: PlayerRoundMetrics[] = [];

  const isDianPao = finalState.lastDiscard !== undefined;
  const loserSeat = isDianPao ? finalState.lastDiscard!.fromSeat : undefined;
  const winningTile = isDianPao ? finalState.lastDiscard!.tile : undefined;

  const mergedConfig = { ...DEFAULT_RULE_CONFIG, ...finalState.config };

  for (let seat = 0; seat < 4; seat++) {
    const s = seat as 0 | 1 | 2 | 3;
    const player = finalState.players.find(p => p.seat === s);
    const scoreDelta = player ? player.score : 0;

    const isWinner = finalState.winnerSeats.includes(s);
    const winCount = isWinner ? 1 : 0;
    const dealInCount = (isDianPao && loserSeat === s) ? 1 : 0;
    const ziMoCount = (isWinner && !isDianPao) ? 1 : 0;
    const dianPaoWinCount = (isWinner && isDianPao) ? 1 : 0;

    let bigHuCount = 0;
    let smallHuCount = 0;

    if (isWinner && player) {
      const checkRes = canHu({
        hand: player.hand,
        melds: player.melds,
        winningTile,
        winMethod: isDianPao ? 'dianPao' : 'ziMo',
        context: {
          hasOpenedDoor: player.hasOpenedDoor,
        },
        config: mergedConfig,
      });

      if (checkRes.isSmallHu) {
        smallHuCount = 1;
      } else {
        bigHuCount = 1;
      }
    }

    // meld counts
    const melds = player ? player.melds : [];
    const chiCount = melds.filter(m => m.type === 'chi').length;
    const pengCount = melds.filter(m => m.type === 'peng').length;
    const gangCount = melds.filter(m => m.type === 'mingGang' || m.type === 'buGang' || m.type === 'anGang').length;

    // counts from logs
    const discardCount = finalState.logs.filter(entry => entry.seat === s && entry.action === '打出牌').length;

    // risky discards from benchmarkMetrics
    let riskyDiscardCount = 0;
    if ((finalState as any).benchmarkMetrics && (finalState as any).benchmarkMetrics.decisions) {
      const playerDecisions = (finalState as any).benchmarkMetrics.decisions.filter((d: any) => d.seat === s);
      riskyDiscardCount = playerDecisions.filter((d: any) => d.action === 'discard' && d.riskScore > 35).length;
    }

    metrics.push({
      seat: s,
      aiEngine: aiEngines[s],
      profile: aiProfiles[s],
      scoreDelta,
      winCount,
      dealInCount,
      ziMoCount,
      dianPaoWinCount,
      bigHuCount,
      smallHuCount,
      gangCount,
      chiCount,
      pengCount,
      discardCount,
      riskyDiscardCount,
    });
  }

  return metrics;
}
