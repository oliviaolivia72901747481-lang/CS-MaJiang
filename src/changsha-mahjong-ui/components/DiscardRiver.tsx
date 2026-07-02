import React from 'react';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { TileView } from './TileView.jsx';

export interface DiscardRiverProps {
  discards: Tile[];
  lastDiscardTileId?: string;
}

export function DiscardRiver({ discards, lastDiscardTileId }: DiscardRiverProps) {
  return (
    <div className="discard-river">
      {discards.map((tile) => (
        <TileView
          key={tile.instanceId}
          tile={tile}
          isLatestDiscard={tile.instanceId === lastDiscardTileId}
          disabled={true}
        />
      ))}
      {discards.length === 0 && (
        <div className="empty-river-placeholder">无弃牌</div>
      )}
    </div>
  );
}
