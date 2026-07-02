import React from 'react';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { TileView } from './TileView.jsx';

export interface DiscardRiverProps {
  discards: Tile[];
}

export function DiscardRiver({ discards }: DiscardRiverProps) {
  return (
    <div className="mobile-discard-river" style={{ display: 'flex', gap: '2px', overflowX: 'auto', width: '100%', padding: '4px 0', whiteSpace: 'nowrap' }}>
      {discards.map((t, idx) => (
        <TileView key={idx} tile={t} />
      ))}
    </div>
  );
}
