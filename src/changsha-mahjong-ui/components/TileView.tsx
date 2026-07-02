import React from 'react';
import { Tile } from '../../changsha-mahjong/types/tile.js';

export interface TileViewProps {
  tile?: Tile;
  hidden?: boolean;
  selected?: boolean;
  disabled?: boolean;
  isLatestDiscard?: boolean;
  onClick?: () => void;
  highlightType?: 'chi' | 'peng' | 'gang' | 'source' | 'latest' | 'candidate';
  className?: string;
  size?: 'normal' | 'compact' | 'mini';
}

export function TileView({ tile, hidden, selected, disabled, isLatestDiscard, onClick, highlightType, className, size = 'normal' }: TileViewProps) {
  const sizeClass = size !== 'normal' ? `tile-${size}` : '';

  if (hidden || !tile) {
    return (
      <div 
        className={`mahjong-tile tile-back ${sizeClass} ${disabled ? 'disabled' : ''} ${className || ''}`}
        onClick={!disabled ? onClick : undefined}
      >
        <div className="tile-back-inner">🀫</div>
      </div>
    );
  }

  // Get suit symbol and rank
  const rankText = tile.rank;
  let suitText = '';
  let suitClass = '';

  if (tile.suit === 'wan') {
    suitText = '万';
    suitClass = 'suit-wan';
  } else if (tile.suit === 'tong') {
    suitText = '筒';
    suitClass = 'suit-tong';
  } else if (tile.suit === 'tiao') {
    suitText = '条';
    suitClass = 'suit-tiao';
  }

  const tileClasses = [
    'mahjong-tile',
    'tile-front',
    suitClass,
    selected ? 'selected' : '',
    disabled ? 'disabled' : '',
    isLatestDiscard ? 'is-latest-discard' : '',
    highlightType ? `highlight-${highlightType}` : '',
    sizeClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={tileClasses} onClick={!disabled ? onClick : undefined}>
      <div className="tile-rank">{rankText}</div>
      <div className="tile-suit">{suitText}</div>
      {isLatestDiscard && <div className="latest-discard-indicator" title="最新出牌" />}
    </div>
  );
}
