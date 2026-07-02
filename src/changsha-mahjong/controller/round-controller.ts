import { GameState, PendingAction, ActionType } from '../types/game.js';
import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';
import { canAnGang, canBuGang } from '../engine/action-engine.js';
import { canHu } from '../engine/hu-checker.js';
import { addLog } from './game-log.js';
import { collectResponsesAfterDiscard } from './action-resolver.js';
import { settleDraw } from './settlement-controller.js';

export function drawTile(state: GameState, seat: 0 | 1 | 2 | 3): GameState {
  let newState = { ...state };
  if (newState.wall.length === 0) {
    return settleDraw(newState);
  }

  // Draw tile
  const tile = newState.wall[0];
  newState.wall = newState.wall.slice(1);

  // Add to hand
  const player = newState.players.find(p => p.seat === seat)!;
  player.hand.push(tile);

  newState = addLog(newState, `摸牌`, seat, `${tile.suit}_${tile.rank}`);

  // Check self-actions
  const selfActions: PendingAction[] = [];

  // 1. Check ZiMo (自模)
  const huRes = canHu({
    hand: player.hand,
    melds: player.melds,
    winMethod: 'ziMo',
    context: {
      hasOpenedDoor: player.hasOpenedDoor,
      isGangShangKaiHua: newState.phase === 'gangReplacement',
      isHaiDiLaoYue: newState.phase === 'haiDi',
    },
    config: newState.config,
  });

  if (huRes.canHu) {
    selfActions.push({
      seat,
      type: 'ziMo',
      priority: 4,
      tile,
    });
  }

  // 2. Check AnGang (暗杠)
  // Cannot gang during HaiDi phase
  if (newState.phase !== 'haiDi') {
    const anGangOptions = canAnGang(player.hand);
    if (anGangOptions.length > 0) {
      selfActions.push({
        seat,
        type: 'anGang',
        priority: 3,
        options: anGangOptions,
      });
    }
  }

  // 3. Check BuGang (补杠)
  if (newState.phase !== 'haiDi' && canBuGang(player.hand, player.melds, tile)) {
    selfActions.push({
      seat,
      type: 'buGang',
      priority: 3,
      tile,
    });
  }

  if (selfActions.length > 0) {
    // Add pass action so they can choose not to ziMo/gang
    selfActions.push({
      seat,
      type: 'pass',
      priority: 0,
    });
    newState.pendingActions = selfActions;
    newState.phase = 'waitingForResponses';
  } else {
    newState.phase = 'playing';
  }

  return newState;
}

export function discardTile(state: GameState, seat: 0 | 1 | 2 | 3, tile: Tile): GameState {
  let newState = { ...state };
  const player = newState.players.find(p => p.seat === seat)!;

  // Verify tile in hand
  const tileIndex = player.hand.findIndex(t => t.instanceId === tile.instanceId);
  if (tileIndex === -1) {
    throw new Error(`Player at seat ${seat} does not have tile ${tile.suit}_${tile.rank} to discard.`);
  }

  // Remove from hand
  player.hand = player.hand.filter(t => t.instanceId !== tile.instanceId);

  // Add to discards
  if (!newState.discards[seat]) {
    newState.discards[seat] = [];
  }
  newState.discards[seat].push(tile);
  player.discards.push(tile);

  newState.lastDiscard = { tile, fromSeat: seat };
  newState = addLog(newState, `打出牌`, seat, `${tile.suit}_${tile.rank}`);

  // Collect responses from other players
  const responses = collectResponsesAfterDiscard(newState);
  if (responses.length > 0) {
    newState.pendingActions = responses;
    newState.phase = 'waitingForResponses';
  } else {
    newState.pendingActions = [];
    newState = addLog(newState, `无人响应`, undefined);
    newState = moveToNextSeat(newState);
  }

  return newState;
}

function indexMatchesInstance(tiles: Tile[], instanceId: string): number {
  return tiles.findIndex(t => t.instanceId === instanceId);
}

import { getNextActiveSeat } from '../utils/active-seats.js';

export function moveToNextSeat(state: GameState): GameState {
  let newState = { ...state };
  if (newState.activeSeats && !newState.activeSeats.includes(newState.currentSeat)) {
    throw new Error(`Current seat ${newState.currentSeat} is not active in [${newState.activeSeats.join(', ')}]`);
  }
  const nextSeat = getNextActiveSeat(newState.activeSeats || [0, 1, 2, 3], newState.currentSeat);
  
  newState.currentSeat = nextSeat;
  newState.lastDiscard = undefined;
  newState.pendingActions = [];

  const wallLen = newState.wall.length;

  if (wallLen === 0) {
    return settleDraw(newState);
  } else if (wallLen === 1) {
    // Enter HaiDi phase
    newState.phase = 'haiDi';
    newState = addLog(newState, `进入海底阶段`, nextSeat, `等待玩家选择是否要海底牌`);
    
    // Add choices for nextSeat: either take it (chi) or pass it (pass)
    newState.pendingActions = [
      {
        seat: nextSeat,
        type: 'chi', // Use 'chi' to represent taking the HaiDi card
        priority: 1,
      },
      {
        seat: nextSeat,
        type: 'pass',
        priority: 0,
      }
    ];
  } else {
    newState.phase = 'playing';
    newState = drawTile(newState, nextSeat);
  }

  return newState;
}

export function enterWaitingForResponses(state: GameState): GameState {
  const newState = { ...state };
  newState.phase = 'waitingForResponses';
  return newState;
}

export function enterSettlement(state: GameState): GameState {
  const newState = { ...state };
  newState.phase = 'settlement';
  return newState;
}
