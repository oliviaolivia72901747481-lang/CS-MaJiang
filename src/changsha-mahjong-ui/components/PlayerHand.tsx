import React from 'react';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { sortTiles } from '../../changsha-mahjong/engine/tile-engine.js';
import { TileView } from './TileView.jsx';

export interface PlayerHandProps {
  hand: Tile[];
  selectedTileInstanceId?: string;
  onTileClick: (tile: Tile) => void;
  disabled?: boolean;
}

export function PlayerHand({ hand, selectedTileInstanceId, onTileClick, disabled }: PlayerHandProps) {
  const sorted = sortTiles(hand);

  const getTileName = (tileId?: string): string => {
    if (!tileId) return '';
    const tile = hand.find(t => t.instanceId === tileId);
    if (!tile) return '';
    const rankNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const rankStr = rankNames[tile.rank - 1] || tile.rank;
    let suitStr = '';
    if (tile.suit === 'wan') suitStr = '万';
    else if (tile.suit === 'tong') suitStr = '筒';
    else if (tile.suit === 'tiao') suitStr = '条';
    return `${rankStr}${suitStr}`;
  };

  return (
    <div className="player-hand-container">
      <div className="player-hand-header">
        <div className="player-hand-title">我的手牌 ({hand.length} 张)</div>
        {selectedTileInstanceId && (
          <div className="selected-tile-desc animate-pulse">
            👉 已选中: <span className="selected-tile-name">{getTileName(selectedTileInstanceId)}</span>
          </div>
        )}
      </div>
      <div className="player-hand-tiles">
        {sorted.map(tile => (
          <TileView
            key={tile.instanceId}
            tile={tile}
            selected={selectedTileInstanceId === tile.instanceId}
            disabled={disabled}
            onClick={() => onTileClick(tile)}
          />
        ))}
      </div>
    </div>
  );
}
