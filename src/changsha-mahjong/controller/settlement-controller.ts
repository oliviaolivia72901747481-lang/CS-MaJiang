import { GameState, HuResult } from '../types/game.js';
import { ScoreEvent, GangScoreInput, StartingHuScoreInput, HuScoreInput, FinalScoreInput } from '../types/score.js';
import { Tile } from '../types/tile.js';
import { 
  calculateGangScore,
  calculateStartingHuScore,
  calculateHuBaseScore,
  calculateFinalScoreWithBird
} from '../engine/score-engine.js';
import { canHu } from '../engine/hu-checker.js';
import { getBirdTarget } from '../engine/bird-engine.js';
import { addLog } from './game-log.js';

export function applyScoreEventsToPlayers(state: GameState): GameState {
  const newState = { ...state };
  // Deep clone players
  newState.players = newState.players.map(p => ({ ...p, score: 0 }));

  for (const event of newState.scoreEvents) {
    const fromPlayer = newState.players.find(p => p.id === event.fromPlayerId);
    const toPlayer = newState.players.find(p => p.id === event.toPlayerId);
    if (fromPlayer) {
      fromPlayer.score -= event.score;
    }
    if (toPlayer) {
      toPlayer.score += event.score;
    }
  }

  return newState;
}

export function settleRoundWin(state: GameState): GameState {
  let newState = { ...state };
  const isDianPao = newState.lastDiscard !== undefined;
  const loserSeat = isDianPao ? newState.lastDiscard!.fromSeat : undefined;
  const winningTile = isDianPao ? newState.lastDiscard!.tile : undefined;

  const seatToPlayerId: Record<number, string> = {};
  for (const p of newState.players) {
    seatToPlayerId[p.seat] = p.id;
  }

  // Draw bird tiles if enabled
  let birdTiles: Tile[] = [];
  if (newState.config.bird.enabled && newState.wall.length > 0) {
    const birdCount = Math.min(newState.config.bird.count, newState.wall.length);
    birdTiles = newState.wall.slice(0, birdCount);
    newState.wall = newState.wall.slice(birdCount);
    newState.birdTiles = birdTiles;

    for (const bird of birdTiles) {
      const target = getBirdTarget(bird, newState.dealerSeat);
      newState = addLog(newState, `扎鸟`, undefined, `牌: ${bird.rank}${bird.suit[0]}，中玩家 ${target}`);
    }
  }

  let allHuEvents: ScoreEvent[] = [];

  for (const winnerSeat of newState.winnerSeats) {
    const winner = newState.players.find(p => p.seat === winnerSeat)!;
    const isQiangGang = isDianPao && newState.pendingActions.some(pa => pa.type === 'hu' && pa.options /* flag qiangGang */);
    
    // Check Hu rules
    const checkRes = canHu({
      hand: winner.hand,
      melds: winner.melds,
      winningTile,
      winMethod: isDianPao ? 'dianPao' : 'ziMo',
      context: {
        isGangShangKaiHua: newState.phase === 'gangReplacement' && !isDianPao,
        isQiangGangHu: isQiangGang,
        isHaiDiLaoYue: newState.phase === 'haiDi' && !isDianPao,
        isHaiDiPao: newState.phase === 'haiDi' && isDianPao,
        hasOpenedDoor: winner.hasOpenedDoor,
      },
      config: newState.config,
    });

    const baseScores = calculateHuBaseScore({
      winnerSeat,
      winMethod: isDianPao ? 'dianPao' : 'ziMo',
      loserSeat,
      isSmallHu: checkRes.isSmallHu,
      bigHuTypes: checkRes.bigHuTypes,
      seatToPlayerId: seatToPlayerId as any,
      config: newState.config,
      activeSeats: newState.activeSeats,
    });

    const finalScores = calculateFinalScoreWithBird({
      baseScores,
      birdTiles,
      dealerSeat: newState.dealerSeat,
      winnerSeat,
      winMethod: isDianPao ? 'dianPao' : 'ziMo',
      loserSeat,
      seatToPlayerId: seatToPlayerId as any,
      config: newState.config,
      activeSeats: newState.activeSeats,
    });

    allHuEvents.push(...finalScores);
  }

  // If it's a QiangGangHu, we must cancel the buGang scores!
  const isQiangGang = isDianPao && newState.pendingActions.some(pa => pa.type === 'hu' && pa.options /* flag qiangGang */);
  if (isQiangGang && loserSeat !== undefined) {
    // Remove the most recent buGang score events for the loser Seat
    // buGang events have reason === 'buGang' and toPlayerId === loser's id
    const loserId = seatToPlayerId[loserSeat];
    newState.scoreEvents = newState.scoreEvents.filter(
      se => !(se.reason === 'buGang' && se.toPlayerId === loserId)
    );
    newState = addLog(newState, `抢杠胡成立，取消补杠计分`, undefined);
  }

  newState.scoreEvents = [...newState.scoreEvents, ...allHuEvents];
  newState = applyScoreEventsToPlayers(newState);
  newState.phase = 'ended';

  return newState;
}

export function settleDraw(state: GameState): GameState {
  let newState = { ...state };
  newState.roundEnded = true;
  newState.phase = 'draw';
  newState = addLog(newState, `对局流局`, undefined);
  newState.phase = 'ended';
  return newState;
}

export function buildSettlementSummary(state: GameState): string {
  if (state.winnerSeats.length === 0) {
    return `【结算摘要】流局。无赢家。`;
  }

  const winnerNames = state.winnerSeats.map(s => `玩家${s}`).join(', ');
  const lines = state.players.map(p => `玩家${p.seat}: ${p.score >= 0 ? '+' : ''}${p.score}分`);
  return `【结算摘要】对局结束。赢家: ${winnerNames}。\n积分变动:\n` + lines.join('\n');
}
