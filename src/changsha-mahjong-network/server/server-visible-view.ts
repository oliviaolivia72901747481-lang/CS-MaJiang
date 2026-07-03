import { GameState, Tile, Meld, PendingAction, GameLogEntry } from '../../changsha-mahjong/index.js';
import { PlayerVisibleView, SettlementSummary } from './network-types.js';
import { getRoom } from './room-manager.js';

function maskOpponentMelds(melds: Meld[]): Meld[] {
  return melds.map((meld, meldIndex) => {
    if (meld.type !== 'anGang' || meld.exposed) {
      return meld;
    }

    return {
      ...meld,
      tiles: meld.tiles.map((_, tileIndex) => ({
        suit: 'wan',
        rank: 1,
        instanceId: `hidden-anGang-${meldIndex}-${tileIndex}`,
        hidden: true,
      } as Tile & { hidden: true })),
    };
  });
}

export function filterLogsForSeat(logs: GameLogEntry[], seat: 0 | 1 | 2 | 3): GameLogEntry[] {
  return logs.map(entry => {
    const newEntry = { ...entry };
    
    // Redact opponent draw tiles details
    if (newEntry.action && newEntry.action.includes('摸牌')) {
      if (newEntry.seat !== undefined && newEntry.seat !== seat) {
        newEntry.detail = undefined;
      }
    }

    // Redact opponent starting hands details
    if (newEntry.action && (newEntry.action.includes('起始手牌') || newEntry.action.includes('起手牌') || newEntry.action.includes('手牌：'))) {
      if (newEntry.seat !== undefined && newEntry.seat !== seat) {
        newEntry.detail = '起始手牌已分发';
      }
    }

    return newEntry;
  });
}

export function buildPlayerVisibleView(input: {
  roomId: string;
  state: GameState;
  seat: 0 | 1 | 2 | 3;
  connectionStatus: Record<0 | 1 | 2 | 3, boolean>;
  aiSeats: Array<0 | 1 | 2 | 3>;
  playerNames?: Record<0 | 1 | 2 | 3, string>;
  stateVersion?: number;
  lastEventId?: string;
}): PlayerVisibleView {
  const { roomId, state, seat, connectionStatus, aiSeats, playerNames, stateVersion, lastEventId } = input;

  const player = state.players.find(p => p.seat === seat);
  if (!player) {
    throw new Error(`Player at seat ${seat} not found in state.`);
  }

  const isEnded = state.phase === 'ended' || state.roundEnded === true;

  const room = getRoom(roomId);
  const selfSession = room?.seats[seat];
  const self = {
    seat: player.seat,
    hand: player.hand,
    melds: player.melds,
    discards: state.discards[seat] || [],
    score: player.score,
    playerName: playerNames ? playerNames[seat] : undefined,
    connectionState: selfSession?.connectionState || 'online',
  };

  const opponents = state.players
    .filter(p => p.seat !== seat)
    .map(p => {
      const oppSeat = p.seat as 0 | 1 | 2 | 3;
      const roomSeat = room?.seats[oppSeat];
      const oppView: any = {
        seat: oppSeat,
        handCount: p.hand.length,
        melds: maskOpponentMelds(p.melds),
        discards: state.discards[p.seat] || [],
        score: p.score,
        connected: connectionStatus[oppSeat] ?? false,
        isAI: aiSeats.includes(oppSeat) || roomSeat?.connectionState === 'ai',
        playerName: playerNames ? playerNames[oppSeat] : undefined,
        connectionState: roomSeat?.connectionState || (aiSeats.includes(oppSeat) ? 'ai' : (connectionStatus[oppSeat] ? 'online' : 'offline')),
      };
      
      // Reveal hand only during settlement (phase is ended)
      if (isEnded) {
        oppView.hand = p.hand;
      }
      return oppView;
    });

  const pendingActions = state.pendingActions.filter(a => a.seat === seat);
  const logs = filterLogsForSeat(state.logs, seat);
  
  // Extract settlement summary if phase is ended
  let settlement: SettlementSummary | undefined;
  if (isEnded) {
    settlement = {
      winnerSeats: state.winnerSeats || [],
      scoreDeltas: state.players.reduce((acc, p) => {
        acc[p.seat as 0 | 1 | 2 | 3] = p.score - 1000;
        return acc;
      }, {} as Record<0 | 1 | 2 | 3, number>),
      scoreEvents: state.scoreEvents || [],
    };
  }

  return {
    roomId,
    seat,
    phase: state.phase,
    currentSeat: state.currentSeat,
    dealerSeat: state.dealerSeat,
    self,
    opponents,
    pendingActions,
    logs,
    settlement,
    wallRemainingCount: state.wall.length,
    stateVersion,
    lastEventId,
    serverTime: Date.now(),
  };
}
