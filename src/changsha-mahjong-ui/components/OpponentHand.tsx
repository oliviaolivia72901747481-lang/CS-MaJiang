import React from 'react';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { sortTiles } from '../../changsha-mahjong/engine/tile-engine.js';
import { TileView } from './TileView.jsx';

export interface OpponentHandProps {
  seat: number;
  handCount: number;
  hand?: Tile[];
  reveal?: boolean;
}

export function OpponentHand({ seat, handCount, hand, reveal }: OpponentHandProps) {
  const showFront = reveal && hand && hand.length > 0;
  const tilesToRender = showFront ? sortTiles(hand!) : Array.from({ length: handCount });

  return (
    <div className={`opponent-hand opponent-seat-${seat}`}>
      <div className="opponent-hand-tiles">
        {tilesToRender.map((tile, idx) => (
          <TileView
            key={showFront && (tile as Tile).instanceId ? (tile as Tile).instanceId : idx}
            tile={showFront ? (tile as Tile) : undefined}
            hidden={!showFront}
            disabled={true}
          />
        ))}
      </div>
    </div>
  );
}
