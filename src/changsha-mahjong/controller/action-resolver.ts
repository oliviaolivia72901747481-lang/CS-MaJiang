import { GameState, PendingAction, ActionType } from '../types/game.js';
import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';
import { canHu } from '../engine/hu-checker.js';
import { canAnGang, canBuGang, canMingGang, canPeng, canChi, getChiOptions } from '../engine/action-engine.js';
import { addLog } from './game-log.js';
import { calculateGangScore } from '../engine/score-engine.js';
import { applyScoreEventsToPlayers, settleRoundWin } from './settlement-controller.js';
import { moveToNextSeat } from './round-controller.js';

const PRIORITY_MAP: Record<ActionType, number> = {
  hu: 4,
  ziMo: 4,
  mingGang: 3,
  buGang: 3,
  anGang: 3,
  peng: 2,
  chi: 1,
  pass: 0,
  discard: 0,
};

import { getActiveOpponents } from '../utils/active-seats.js';

export function collectResponsesAfterDiscard(state: GameState): PendingAction[] {
  if (!state.lastDiscard) {
    return [];
  }

  const { tile, fromSeat } = state.lastDiscard;
  const actions: PendingAction[] = [];

  const opponents = getActiveOpponents(state.activeSeats || [0, 1, 2, 3], fromSeat);
  for (const seat of opponents) {
    const player = state.players.find(p => p.seat === seat);
    if (!player) continue;
    const playerActions: PendingAction[] = [];

    // 1. Check Hu (点炮)
    const huRes = canHu({
      hand: player.hand,
      melds: player.melds,
      winningTile: tile,
      winMethod: 'dianPao',
      context: {
        hasOpenedDoor: player.hasOpenedDoor,
        isHaiDiPao: state.phase === 'haiDi',
      },
      config: state.config,
    });

    if (huRes.canHu) {
      playerActions.push({
        seat: seat as 0 | 1 | 2 | 3,
        type: 'hu',
        priority: PRIORITY_MAP.hu,
        tile,
      });
    }

    // 2. Check MingGang (直杠)
    if (state.phase !== 'haiDi' && canMingGang(player.hand, tile)) {
      playerActions.push({
        seat: seat as 0 | 1 | 2 | 3,
        type: 'mingGang',
        priority: PRIORITY_MAP.mingGang,
        tile,
      });
    }

    // 3. Check Peng (碰)
    if (state.phase !== 'haiDi' && canPeng(player.hand, tile)) {
      playerActions.push({
        seat: seat as 0 | 1 | 2 | 3,
        type: 'peng',
        priority: PRIORITY_MAP.peng,
        tile,
      });
    }

    // 4. Check Chi (吃) - only from upper seat
    if (state.phase !== 'haiDi' && canChi(player.hand, tile, fromSeat, seat, state.activeSeats)) {
      const options = getChiOptions(player.hand, tile, fromSeat, seat, state.activeSeats);
      if (options.length > 0) {
        playerActions.push({
          seat: seat as 0 | 1 | 2 | 3,
          type: 'chi',
          priority: PRIORITY_MAP.chi,
          tile,
          options,
        });
      }
    }

    // If player has any valid action, they also get a "pass" option
    if (playerActions.length > 0) {
      actions.push(...playerActions);
      actions.push({
        seat: seat as 0 | 1 | 2 | 3,
        type: 'pass',
        priority: PRIORITY_MAP.pass,
      });
    }
  }

  return actions;
}

export function collectQiangGangHu(state: GameState, tile: Tile): PendingAction[] {
  const actions: PendingAction[] = [];
  const buGangSeat = state.currentSeat;

  const opponents = getActiveOpponents(state.activeSeats || [0, 1, 2, 3], buGangSeat);
  for (const seat of opponents) {
    const player = state.players.find(p => p.seat === seat);
    if (!player) continue;
    const huRes = canHu({
      hand: player.hand,
      melds: player.melds,
      winningTile: tile,
      winMethod: 'dianPao',
      context: {
        isQiangGangHu: true,
        hasOpenedDoor: player.hasOpenedDoor,
      },
      config: state.config,
    });

    if (huRes.canHu) {
      actions.push({
        seat: seat as 0 | 1 | 2 | 3,
        type: 'hu',
        priority: 4,
        tile,
        options: [[]], // flag it as qiangGangHu in resolver
      });
    }
  }

  if (actions.length > 0) {
    const seatsWithHu = new Set(actions.map(a => a.seat));
    for (const seat of seatsWithHu) {
      actions.push({
        seat: seat as 0 | 1 | 2 | 3,
        type: 'pass',
        priority: 0,
      });
    }
  }

  return actions;
}

export function sortActionsByPriority(actions: PendingAction[]): PendingAction[] {
  return [...actions].sort((a, b) => b.priority - a.priority);
}

export function isMultiHu(actions: PendingAction[]): boolean {
  return actions.filter(a => a.type === 'hu').length > 1;
}

export function resolvePendingActions(
  state: GameState,
  selectedActions: PendingAction[]
): GameState {
  let newState = { ...state };

  // Filter out pass actions to find active decisions
  const activeActions = selectedActions.filter(a => a.type !== 'pass');

  const seatToPlayerId: Record<number, string> = {};
  for (const p of newState.players) {
    seatToPlayerId[p.seat] = p.id;
  }

  if (activeActions.length === 0) {
    // If no one acted, move to the next seat or handle flow
    newState.pendingActions = [];
    
    // If we were waiting for responses in a qiangGangHu situation, buGang succeeds
    if (state.phase === 'waitingForResponses' && state.lastDiscard?.tile && state.pendingActions.some(pa => pa.type === 'hu' && pa.options /* flag qiangGang */)) {
      const buGangSeat = state.currentSeat;
      const buGangTile = state.lastDiscard.tile;
      
      newState.phase = 'gangReplacement';
      newState.lastDiscard = undefined;
      
      const gangScores = calculateGangScore({
        gangType: 'buGang',
        playerSeat: buGangSeat,
        seatToPlayerId,
        config: newState.config,
      });
      newState.scoreEvents = [...newState.scoreEvents, ...gangScores];
      newState = applyScoreEventsToPlayers(newState);
      
      newState = addLog(newState, `补杠成功`, buGangSeat, `${buGangTile.suit}_${buGangTile.rank}`);
      return newState;
    }

    newState = addLog(newState, `无人响应`, undefined);
    return moveToNextSeat(newState);
  }

  // Sort by priority descending
  const sorted = sortActionsByPriority(activeActions);
  const highest = sorted[0];
  const actorSeat = highest.seat;
  const actor = newState.players.find(p => p.seat === actorSeat)!;

  // 1. ZiMo
  if (highest.type === 'ziMo') {
    newState.winnerSeats = [actorSeat];
    newState.roundEnded = true;
    newState.phase = 'settlement';
    newState.pendingActions = [];

    newState = addLog(newState, `自摸胡牌`, actorSeat, `牌: ${highest.tile?.suit}_${highest.tile?.rank}`);
    newState = settleRoundWin(newState);
    return newState;
  }

  // 2. AnGang
  if (highest.type === 'anGang') {
    let option = highest.options?.[0];
    if (!option || option.length < 4) {
      const groups = canAnGang(actor.hand);
      if (groups.length === 0) throw new Error("No valid AnGang option");
      option = groups[0];
    }
    actor.hand = actor.hand.filter(t => !option.some(o => o.instanceId === t.instanceId));
    
    const newMeld: Meld = {
      type: 'anGang',
      tiles: option,
      exposed: false,
    };
    actor.melds.push(newMeld);
    newState.currentSeat = actorSeat;
    newState = addLog(newState, `暗杠`, actorSeat, `${option[0].suit}_${option[0].rank}`);

    const gangScores = calculateGangScore({
      gangType: 'anGang',
      playerSeat: actorSeat,
      seatToPlayerId,
      config: newState.config,
    });
    newState.scoreEvents = [...newState.scoreEvents, ...gangScores];
    newState = applyScoreEventsToPlayers(newState);

    newState.phase = 'gangReplacement';
    newState.pendingActions = [];
    return newState;
  }

  // 3. BuGang
  if (highest.type === 'buGang') {
    const tile = highest.tile!;
    actor.hand = actor.hand.filter(t => t.instanceId !== tile.instanceId);

    const meld = actor.melds.find(m => m.type === 'peng' && m.tiles[0].suit === tile.suit && m.tiles[0].rank === tile.rank);
    if (!meld) {
      throw new Error("No matching Peng meld for BuGang");
    }
    meld.type = 'buGang';
    meld.tiles.push(tile);

    newState.currentSeat = actorSeat;
    newState = addLog(newState, `声明补杠`, actorSeat, `${tile.suit}_${tile.rank}`);

    const qiangGangActions = collectQiangGangHu(newState, tile);
    if (qiangGangActions.length > 0) {
      newState.pendingActions = qiangGangActions;
      newState.phase = 'waitingForResponses';
      newState.lastDiscard = { tile, fromSeat: actorSeat };
      newState = addLog(newState, `触发抢杠胡判断`, undefined, `等待其他玩家响应`);
    } else {
      const gangScores = calculateGangScore({
        gangType: 'buGang',
        playerSeat: actorSeat,
        seatToPlayerId,
        config: newState.config,
      });
      newState.scoreEvents = [...newState.scoreEvents, ...gangScores];
      newState = applyScoreEventsToPlayers(newState);

      newState.phase = 'gangReplacement';
      newState.pendingActions = [];
    }
    return newState;
  }

  // 4. DianPao Hu
  if (highest.type === 'hu') {
    const winners = sorted.filter(a => a.type === 'hu').map(a => a.seat);
    newState.winnerSeats = winners;
    newState.roundEnded = true;
    newState.phase = 'settlement';
    newState.pendingActions = [];

    for (const seat of winners) {
      newState = addLog(
        newState,
        `胡牌 (点炮)`,
        seat,
        `赢分自玩家 ${state.lastDiscard?.fromSeat}，牌: ${state.lastDiscard?.tile.suit}_${state.lastDiscard?.tile.rank}`
      );
    }
    
    newState = settleRoundWin(newState);
    return newState;
  }

  const discarderSeat = newState.lastDiscard!.fromSeat;
  const discardTile = newState.lastDiscard!.tile;

  // Clear lastDiscard because it is taken by meld
  newState.lastDiscard = undefined;
  
  // Remove tile from discarder's discards
  newState.discards[discarderSeat] = newState.discards[discarderSeat].filter(
    t => t.instanceId !== discardTile.instanceId
  );
  const discarderPlayer = newState.players.find(p => p.seat === discarderSeat)!;
  discarderPlayer.discards = discarderPlayer.discards.filter(
    t => t.instanceId !== discardTile.instanceId
  );

  // 5. MingGang
  if (highest.type === 'mingGang') {
    const matching = actor.hand.filter(t => t.suit === discardTile.suit && t.rank === discardTile.rank);
    if (matching.length < 3) {
      throw new Error(`Invalid MingGang request. Actor does not have 3 identical tiles.`);
    }

    const removed = matching.slice(0, 3);
    actor.hand = actor.hand.filter(t => !removed.some(r => r.instanceId === t.instanceId));
    
    const newMeld: Meld = {
      type: 'mingGang',
      tiles: [...removed, discardTile],
      exposed: true,
      fromPlayerId: newState.players.find(p => p.seat === discarderSeat)!.id,
    };
    actor.melds.push(newMeld);
    actor.hasOpenedDoor = true;
    newState.currentSeat = actorSeat;

    newState = addLog(newState, `直杠`, actorSeat, `${discardTile.suit}_${discardTile.rank}`);

    const gangScores = calculateGangScore({
      gangType: 'mingGang',
      playerSeat: actorSeat,
      fromSeat: discarderSeat,
      seatToPlayerId,
      config: newState.config,
    });
    newState.scoreEvents = [...newState.scoreEvents, ...gangScores];
    newState = applyScoreEventsToPlayers(newState);

    newState.phase = 'gangReplacement';
    newState.pendingActions = [];
  } 
  // 6. Peng
  else if (highest.type === 'peng') {
    const matching = actor.hand.filter(t => t.suit === discardTile.suit && t.rank === discardTile.rank);
    if (matching.length < 2) {
      throw new Error(`Invalid Peng request. Actor does not have 2 identical tiles.`);
    }

    const removed = matching.slice(0, 2);
    actor.hand = actor.hand.filter(t => !removed.some(r => r.instanceId === t.instanceId));

    const newMeld: Meld = {
      type: 'peng',
      tiles: [...removed, discardTile],
      exposed: true,
      fromPlayerId: newState.players.find(p => p.seat === discarderSeat)!.id,
    };
    actor.melds.push(newMeld);
    actor.hasOpenedDoor = true;
    newState.currentSeat = actorSeat;

    newState = addLog(newState, `碰牌`, actorSeat, `${discardTile.suit}_${discardTile.rank}`);

    newState.phase = 'playing';
    newState.pendingActions = [];
  } 
  // 7. Chi
  else if (highest.type === 'chi') {
    const option = highest.options?.[0];
    if (!option || option.length < 2) {
      throw new Error(`Invalid Chi request. No valid option provided.`);
    }

    actor.hand = actor.hand.filter(t => !option.some(o => o.instanceId === t.instanceId));

    const newMeld: Meld = {
      type: 'chi',
      tiles: [...option, discardTile],
      exposed: true,
      fromPlayerId: newState.players.find(p => p.seat === discarderSeat)!.id,
    };
    actor.melds.push(newMeld);
    actor.hasOpenedDoor = true;
    newState.currentSeat = actorSeat;

    const opStr = option.map(t => `${t.rank}${t.suit[0]}`).join('+');
    newState = addLog(newState, `吃牌`, actorSeat, `以组合 ${opStr} 吃 ${discardTile.rank}${discardTile.suit[0]}`);

    newState.phase = 'playing';
    newState.pendingActions = [];
  }

  return newState;
}
