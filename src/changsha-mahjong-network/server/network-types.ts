import { Tile, Meld, PendingAction, GameLogEntry, GameState } from '../../changsha-mahjong/index.js';

export interface SettlementSummary {
  winnerSeats: number[];
  scoreDeltas: Record<0 | 1 | 2 | 3, number>;
  scoreEvents: any[];
}

export interface PlayerVisibleView {
  roomId: string;
  seat: 0 | 1 | 2 | 3;
  phase: string;
  currentSeat: 0 | 1 | 2 | 3;
  dealerSeat: 0 | 1 | 2 | 3;

  self: {
    seat: 0 | 1 | 2 | 3;
    hand: Tile[];
    melds: Meld[];
    discards: Tile[];
    score: number;
    playerName?: string;
  };

  opponents: Array<{
    seat: 0 | 1 | 2 | 3;
    handCount: number;
    melds: Meld[];
    discards: Tile[];
    score: number;
    connected: boolean;
    isAI: boolean;
    hand?: Tile[];
    playerName?: string;
  }>;

  pendingActions: PendingAction[];
  lastActionText?: string;
  logs: GameLogEntry[];
  settlement?: SettlementSummary;
  wallRemainingCount: number;
}

export type NetworkPlayerAction = (
  | { type: 'discard'; tileInstanceId: string }
  | { type: 'chi'; optionId: string }
  | { type: 'peng' }
  | { type: 'gang'; gangType: string; tileKey: string }
  | { type: 'hu' }
  | { type: 'pass' }
) & { actionId?: string };

export type PlayerConnectionState =
  | 'online'
  | 'reconnecting'
  | 'offline'
  | 'left'
  | 'ai';

export interface PlayerSession {
  seat: 0 | 1 | 2 | 3;
  playerName: string;
  sessionId: string;
  token: string;
  socketId: string | null;
  connectionState: PlayerConnectionState;
  connected: boolean;
  isAI: boolean;
  joinedAt: number;
  lastSeenAt: number;
  disconnectedAt?: number;
  leftAt?: number;
}

export interface GameSession {
  roomId: string;
  state: GameState;
  actionLock: boolean;
  lastUpdatedAt: number;
}

export interface Room {
  roomId: string;
  createdAt: number;
  status: 'waiting' | 'playing' | 'settlement' | 'closed';
  seats: Record<0 | 1 | 2 | 3, PlayerSession | null>;
  aiSeats: Array<0 | 1 | 2 | 3>;
  gameSession?: GameSession;
  emptySince?: number;
  settlementSince?: number;
  leftOnlySince?: number;
  allOfflineSince?: number;
  activeSeats?: Array<0 | 1 | 2 | 3>;
  gamePlayerCount?: 2 | 3 | 4;
  hasAI?: boolean;
}
