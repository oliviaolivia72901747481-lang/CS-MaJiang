import React from 'react';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { TileView } from './TileView.jsx';

export interface ActionSourceTileBannerProps {
  sourceEvent: {
    seat: number;
    playerLabel: string;
    tile: Tile;
    tileKey: string;
  } | null;
  style?: React.CSSProperties;
}

export function ActionSourceTileBanner({ sourceEvent, style }: ActionSourceTileBannerProps) {
  if (!sourceEvent) return null;

  return (
    <div 
      className="action-source-banner" 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(231, 76, 60, 0.12)',
        border: '1px solid rgba(231, 76, 60, 0.3)',
        borderRadius: '12px',
        padding: '4px 10px',
        fontSize: '0.72rem',
        color: '#ff6b6b',
        fontWeight: 'bold',
        ...style
      }}
    >
      <span>响应来源: {sourceEvent.playerLabel} 打出</span>
      <div className="source-action-tile" style={{ display: 'inline-block', transform: 'scale(0.85)', transformOrigin: 'center' }}>
        <TileView tile={sourceEvent.tile} highlightType="source" />
      </div>
    </div>
  );
}
