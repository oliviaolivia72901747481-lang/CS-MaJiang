import React from 'react';
import { PlayerDisplayState } from '../types/ui-types.js';
import { PlayerArea } from './PlayerArea.jsx';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { TurnIndicator } from './TurnIndicator.jsx';

export interface GameTableProps {
  players: PlayerDisplayState[];
  currentSeat: number;
  wallCount: number;
  dealerSeat: number;
  phase: string;
  isWaitingForHumanUser: boolean;
  selectedTileInstanceId?: string;
  onTileClick?: (tile: Tile) => void;
  lastDiscardTileId?: string;
  isEnded: boolean;
}

export function GameTable({
  players,
  currentSeat,
  wallCount,
  dealerSeat,
  phase,
  isWaitingForHumanUser,
  selectedTileInstanceId,
  onTileClick,
  lastDiscardTileId,
  isEnded,
}: GameTableProps) {
  
  // Find players by seat index
  const getPlayerBySeat = (seat: number): PlayerDisplayState | undefined => {
    return players.find(p => p.seat === seat);
  };

  const p0 = getPlayerBySeat(0);
  const p1 = getPlayerBySeat(1);
  const p2 = getPlayerBySeat(2);
  const p3 = getPlayerBySeat(3);

  return (
    <div className="mahjong-table-layout">
      {/* Top Area: Seat 2 (Opponent 2 / 对家) */}
      <div className="table-slot slot-top">
        {p2 && (
          <PlayerArea
            player={p2}
            isCurrent={currentSeat === 2 && !isEnded}
            isEnded={isEnded}
            lastDiscardTileId={lastDiscardTileId}
            isHuman={false}
          />
        )}
      </div>

      {/* Middle Row: Seat 3 on Left, Center Table Info, Seat 1 on Right */}
      <div className="table-row-middle">
        {/* Left Area: Seat 3 (Opponent 3 / 上家) */}
        <div className="table-slot slot-left">
          {p3 && (
            <PlayerArea
              player={p3}
              isCurrent={currentSeat === 3 && !isEnded}
              isEnded={isEnded}
              lastDiscardTileId={lastDiscardTileId}
              isHuman={false}
            />
          )}
        </div>

        {/* Center Area: Compass Turn Indicator */}
        <div className="table-slot slot-center">
          <TurnIndicator
            currentSeat={currentSeat}
            dealerSeat={dealerSeat}
            remainingTiles={wallCount}
            phase={phase as any}
          />
        </div>

        {/* Right Area: Seat 1 (Opponent 1 / 下家) */}
        <div className="table-slot slot-right">
          {p1 && (
            <PlayerArea
              player={p1}
              isCurrent={currentSeat === 1 && !isEnded}
              isEnded={isEnded}
              lastDiscardTileId={lastDiscardTileId}
              isHuman={false}
            />
          )}
        </div>
      </div>

      {/* Bottom Area: Seat 0 (Player / 我) */}
      <div className="table-slot slot-bottom">
        {p0 && (
          <PlayerArea
            player={p0}
            isCurrent={currentSeat === 0 && !isEnded}
            isEnded={isEnded}
            selectedTileInstanceId={selectedTileInstanceId}
            onTileClick={onTileClick}
            lastDiscardTileId={lastDiscardTileId}
            isHuman={true}
          />
        )}
      </div>
    </div>
  );
}
