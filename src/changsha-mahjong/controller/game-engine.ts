import { GameState, GamePhase, PendingAction, GameLogEntry } from '../types/game.js';
import { ChangshaRuleConfig } from '../types/rule-config.js';
import { Player } from '../types/player.js';
import { Tile } from '../types/tile.js';
import { ScoreEvent } from '../types/score.js';
import { DEFAULT_RULE_CONFIG } from '../config/default-rule-config.js';
import { createChangshaTiles, sortTiles } from '../engine/tile-engine.js';
import { dealInitialHands, shuffleTiles } from '../engine/wall-engine.js';
import { getStartingHuTypes } from '../engine/starting-hu-checker.js';
import { canAnGang, canBuGang } from '../engine/action-engine.js';
import { canHu } from '../engine/hu-checker.js';
import { addLog } from './game-log.js';
import { chooseDiscard, chooseAction } from './bot-controller.js';
import { calculateStartingHuScore, calculateGangScore } from '../engine/score-engine.js';
import { applyScoreEventsToPlayers, settleRoundWin, settleDraw } from './settlement-controller.js';
import { drawTile, discardTile, moveToNextSeat } from './round-controller.js';
import { resolvePendingActions, collectQiangGangHu } from './action-resolver.js';
import { getNextActiveSeat } from '../utils/active-seats.js';

export function createInitialGameState(config?: ChangshaRuleConfig, activeSeats?: (0 | 1 | 2 | 3)[]): GameState {
  const finalConfig = config || DEFAULT_RULE_CONFIG;
  const isLegacy = !activeSeats;
  const finalActiveSeats = activeSeats || [0, 1, 2, 3];
  const players: Player[] = [];
  const dealerSeat = finalActiveSeats.includes(0) ? 0 : finalActiveSeats[0];
  for (const i of finalActiveSeats) {
    players.push({
      id: `player_${i}`,
      seat: i,
      isDealer: i === dealerSeat,
      hand: [],
      melds: [],
      discards: [],
      score: 0,
      hasOpenedDoor: false,
    });
  }

  const discards: Record<0 | 1 | 2 | 3, Tile[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
  };

  return {
    phase: 'init',
    players,
    dealerSeat,
    currentSeat: dealerSeat,
    wall: [],
    discards,
    pendingActions: [],
    scoreEvents: [],
    logs: [],
    config: finalConfig,
    roundEnded: false,
    winnerSeats: [],
    activeSeats: finalActiveSeats,
    gamePlayerCount: finalActiveSeats.length as any,
    isLegacy,
  };
}

export function startRound(state: GameState, seed?: string): GameState {
  let newState = { ...state };
  if (!newState.activeSeats) {
    if (newState.isLegacy === true || newState.isLegacy === undefined) {
      newState.activeSeats = [0, 1, 2, 3];
      newState.isLegacy = true;
    } else {
      throw new Error('activeSeats is required in playing phase');
    }
  }
  if (newState.isLegacy === false && !newState.activeSeats) {
    throw new Error('activeSeats is required in playing phase');
  }
  newState.gamePlayerCount = newState.activeSeats.length as any;
  
  // Clear previous round info
  newState.roundEnded = false;
  newState.winnerSeats = [];
  newState.scoreEvents = [];
  newState.logs = [];
  
  const discards: Record<0 | 1 | 2 | 3, Tile[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
  };
  newState.discards = discards;

  newState.players = newState.players.map(p => ({
    ...p,
    isDealer: p.seat === newState.dealerSeat,
    hand: [],
    melds: [],
    discards: [],
    hasOpenedDoor: false,
  }));

  // Create & shuffle wall
  const tiles = createChangshaTiles();
  const shuffled = shuffleTiles(tiles, seed);

  // Deal hands
  const { hands, remainingWall } = dealInitialHands(shuffled, newState.dealerSeat, newState.activeSeats);
  newState.wall = remainingWall;
  
  for (const p of newState.players) {
    p.hand = hands[p.seat];
  }

  newState.currentSeat = newState.dealerSeat;
  newState.phase = 'dealing';
  
  newState = addLog(newState, `发牌完成`, undefined, `庄家 14 张，闲家 13 张`);

  // Check starting Hu for all players
  const seatToPlayerId: Record<number, string> = {};
  for (const p of newState.players) {
    seatToPlayerId[p.seat] = p.id;
  }
  
  let hasStartingHu = false;
  for (const p of newState.players) {
    const seat = p.seat;
    const huTypes = getStartingHuTypes(p.hand, seat === newState.dealerSeat);
    if (huTypes.length > 0) {
      hasStartingHu = true;
      newState = addLog(newState, `起手胡成立`, seat, huTypes.join('+'));
      
      const startingScores = calculateStartingHuScore({
        winnerSeat: seat,
        startingHuTypes: huTypes,
        seatToPlayerId: seatToPlayerId as any,
        dealerSeat: newState.dealerSeat,
        config: newState.config,
        activeSeats: newState.activeSeats,
      });
      newState.scoreEvents = [...newState.scoreEvents, ...startingScores];
    }
  }

  if (hasStartingHu) {
    newState = applyScoreEventsToPlayers(newState);
    newState.phase = 'startingHu';
  } else {
    newState.phase = 'playing';
  }

  // If we are playing, check if dealer has TianHu or AnGang immediately (starting 14 cards)
  if (newState.phase === 'playing') {
    const dealerPlayer = newState.players.find(p => p.seat === newState.dealerSeat);
    if (dealerPlayer) {
      const selfActions: PendingAction[] = [];

      // TianHu check
      const huRes = canHu({
        hand: dealerPlayer.hand,
        melds: dealerPlayer.melds,
        winMethod: 'ziMo',
        context: {
          hasOpenedDoor: false,
          isTianHu: true,
        },
        config: newState.config,
      });

      if (huRes.canHu) {
        selfActions.push({
          seat: newState.dealerSeat,
          type: 'ziMo',
          priority: 4,
          tile: dealerPlayer.hand[dealerPlayer.hand.length - 1], // Just a representative tile
        });
      }

      // AnGang check
      const anGangOptions = canAnGang(dealerPlayer.hand);
      if (anGangOptions.length > 0) {
        selfActions.push({
          seat: newState.dealerSeat,
          type: 'anGang',
          priority: 3,
          options: anGangOptions,
        });
      }

      if (selfActions.length > 0) {
        selfActions.push({
          seat: newState.dealerSeat,
          type: 'pass',
          priority: 0,
        });
        newState.pendingActions = selfActions;
        newState.phase = 'waitingForResponses';
      }
    }
  }

  return newState;
}

export function isRoundEnded(state: GameState): boolean {
  return state.roundEnded;
}

export function stepGame(state: GameState): GameState {
  if (state.roundEnded || state.phase === 'ended') {
    return state;
  }

  let newState = { ...state };

  switch (newState.phase) {
    case 'init':
      return startRound(newState);

    case 'dealing':
      // Move to startingHu or playing
      newState.phase = 'playing';
      return newState;

    case 'startingHu':
      newState = addLog(newState, `起手胡结算完毕，开始出牌对局`, undefined);
      newState.phase = 'playing';
      
      // Post-startingHu check for dealer AnGang/TianHu options
      const dealerPlayer = newState.players.find(p => p.seat === newState.dealerSeat)!;
      const selfActions: PendingAction[] = [];

      const huRes = canHu({
        hand: dealerPlayer.hand,
        melds: dealerPlayer.melds,
        winMethod: 'ziMo',
        context: {
          hasOpenedDoor: false,
          isTianHu: true,
        },
        config: newState.config,
      });

      if (huRes.canHu) {
        selfActions.push({
          seat: newState.dealerSeat,
          type: 'ziMo',
          priority: 4,
          tile: dealerPlayer.hand[dealerPlayer.hand.length - 1],
        });
      }

      const anGangOptions = canAnGang(dealerPlayer.hand);
      if (anGangOptions.length > 0) {
        selfActions.push({
          seat: newState.dealerSeat,
          type: 'anGang',
          priority: 3,
          options: anGangOptions,
        });
      }

      if (selfActions.length > 0) {
        selfActions.push({
          seat: newState.dealerSeat,
          type: 'pass',
          priority: 0,
        });
        newState.pendingActions = selfActions;
        newState.phase = 'waitingForResponses';
      }
      return newState;

    case 'playing':
      // The currentSeat has 14 cards and must choose a discard
      const currentPlayer = newState.players.find(p => p.seat === newState.currentSeat)!;
      const expectedSize = 14 - 3 * currentPlayer.melds.length;
      if (currentPlayer.hand.length !== expectedSize) {
        throw new Error(`Player at seat ${newState.currentSeat} does not have correct hand size (has ${currentPlayer.hand.length}, expected ${expectedSize}).`);
      }

      // No pending decisions, so we discard
      const tileToDiscard = chooseDiscard(newState, newState.currentSeat);
      return discardTile(newState, newState.currentSeat, tileToDiscard);

    case 'waitingForResponses':
      // We have pendingActions that players must choose from
      const seatsWithActions = Array.from(new Set(newState.pendingActions.map(pa => pa.seat)));
      const selectedActions: PendingAction[] = [];

      for (const seat of seatsWithActions) {
        const actionsForSeat = newState.pendingActions.filter(pa => pa.seat === seat);
        const chosen = chooseAction(newState, seat as 0 | 1 | 2 | 3, actionsForSeat);
        selectedActions.push(chosen);
      }

      return resolvePendingActions(newState, selectedActions);

    case 'gangReplacement':
      // Draw card from the BACK of the wall
      if (newState.wall.length === 0) {
        return settleDraw(newState);
      }
      
      const repTile = newState.wall[newState.wall.length - 1];
      newState.wall = newState.wall.slice(0, -1);
      
      const repPlayer = newState.players.find(p => p.seat === newState.currentSeat)!;
      repPlayer.hand.push(repTile);
      newState = addLog(newState, `杠上补牌`, newState.currentSeat, `${repTile.suit}_${repTile.rank}`);

      // Check self-actions after gang replacement (e.g. 杠上开花, another gang)
      const repActions: PendingAction[] = [];
      const repHuRes = canHu({
        hand: repPlayer.hand,
        melds: repPlayer.melds,
        winMethod: 'ziMo',
        context: {
          hasOpenedDoor: repPlayer.hasOpenedDoor,
          isGangShangKaiHua: true,
        },
        config: newState.config,
      });

      if (repHuRes.canHu) {
        repActions.push({
          seat: newState.currentSeat,
          type: 'ziMo',
          priority: 4,
          tile: repTile,
        });
      }

      const repAnGang = canAnGang(repPlayer.hand);
      if (repAnGang.length > 0) {
        repActions.push({
          seat: newState.currentSeat,
          type: 'anGang',
          priority: 3,
          options: repAnGang,
        });
      }

      if (canBuGang(repPlayer.hand, repPlayer.melds, repTile)) {
        repActions.push({
          seat: newState.currentSeat,
          type: 'buGang',
          priority: 3,
          tile: repTile,
        });
      }

      if (repActions.length > 0) {
        repActions.push({
          seat: newState.currentSeat,
          type: 'pass',
          priority: 0,
        });
        newState.pendingActions = repActions;
        newState.phase = 'waitingForResponses';
      } else {
        newState.phase = 'playing';
      }
      return newState;

    case 'haiDi':
      // The seat in pendingActions chooses whether to take HaiDi card
      const hdSeat = newState.pendingActions[0].seat;
      const hdActions = newState.pendingActions.filter(pa => pa.seat === hdSeat);
      const chosenHdAction = chooseAction(newState, hdSeat, hdActions);

      if (chosenHdAction.type === 'chi') {
        // Take HaiDi card
        const hdTile = newState.wall[0];
        newState.wall = [];
        
        const hdPlayer = newState.players.find(p => p.seat === hdSeat)!;
        hdPlayer.hand.push(hdTile);
        newState = addLog(newState, `摸海底牌`, hdSeat, `${hdTile.suit}_${hdTile.rank}`);

        // Check HaiDiLaoYue Hu
        const hdHuRes = canHu({
          hand: hdPlayer.hand,
          melds: hdPlayer.melds,
          winMethod: 'ziMo',
          context: {
            hasOpenedDoor: hdPlayer.hasOpenedDoor,
            isHaiDiLaoYue: true,
          },
          config: newState.config,
        });

        if (hdHuRes.canHu) {
          newState.winnerSeats = [hdSeat];
          newState.roundEnded = true;
          newState.phase = 'settlement';
          newState.pendingActions = [];
          newState = addLog(newState, `海底捞月自摸胡牌`, hdSeat, `牌: ${hdTile.suit}_${hdTile.rank}`);
          newState = settleRoundWin(newState);
        } else {
          // Must discard the HaiDi card immediately
          newState.phase = 'playing';
          newState.currentSeat = hdSeat;
          newState.pendingActions = [];
          
          return discardTile(newState, hdSeat, hdTile);
        }
      } else {
        // Pass the card to the next player
        const nextHdSeat = getNextActiveSeat(newState.activeSeats || [0, 1, 2, 3], hdSeat);
        const passCount = newState.logs.filter(l => l.action === '进入海底阶段').length;
        
        if (passCount >= (newState.activeSeats?.length || 4)) {
          // All active players passed
          return settleDraw(newState);
        }

        newState.currentSeat = nextHdSeat;
        newState.pendingActions = [
          {
            seat: nextHdSeat,
            type: 'chi',
            priority: 1,
          },
          {
            seat: nextHdSeat,
            type: 'pass',
            priority: 0,
          }
        ];
        newState = addLog(newState, `进入海底阶段`, nextHdSeat, `等待玩家选择是否要海底牌`);
      }
      return newState;

    case 'settlement':
      return settleRoundWin(newState);

    case 'draw':
      return settleDraw(newState);

    case 'ended':
      return newState;
  }

  return newState;
}
