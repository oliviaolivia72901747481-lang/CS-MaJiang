import React from 'react';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { sortTiles } from '../../changsha-mahjong/engine/tile-engine.js';
import { TileView } from './TileView.jsx';

export interface MobilePlayerHandProps {
  hand: Tile[];
  isMyTurnToDiscard: boolean;
  actionPending: boolean;
  selectedTileId: string | null;
  onTileClick: (instanceId: string) => void;
  getHandTileHighlight?: (t: Tile) => any;
}

export function MobilePlayerHand({
  hand,
  isMyTurnToDiscard,
  actionPending,
  selectedTileId,
  onTileClick,
  getHandTileHighlight
}: MobilePlayerHandProps) {
  const canClick = isMyTurnToDiscard && !actionPending;

  // The drawn tile is separated if hand count has a remainder of 2 when divided by 3 (e.g. 14, 11, 8...)
  const hasDrawnTile = hand.length % 3 === 2;

  // Sort the hand. If there is a drawn tile, we sort the main hand (excluding the last tile) 
  // and keep the drawn tile at the end.
  const getTilesToRender = () => {
    if (!hand || hand.length === 0) return [];
    if (hasDrawnTile) {
      const mainHand = hand.slice(0, hand.length - 1);
      const sortedMain = sortTiles(mainHand);
      return [...sortedMain, hand[hand.length - 1]];
    }
    return sortTiles(hand);
  };
  const tilesToRender = getTilesToRender();

  return (
    <div className="mobile-hand-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%', flexWrap: 'wrap' }}>
      {tilesToRender.map((t, idx) => {
        const isLast = idx === tilesToRender.length - 1;
        const isDrawn = hasDrawnTile && isLast;
        return (
          <div 
            key={t.instanceId || idx} 
            style={{ 
              marginLeft: isDrawn ? '12px' : '0px', 
              transition: 'margin 0.2s',
              position: 'relative'
            }}
          >
            <TileView
              tile={t}
              onClick={canClick ? () => onTileClick(t.instanceId) : undefined}
              disabled={!canClick}
              selected={selectedTileId === t.instanceId}
              highlightType={getHandTileHighlight ? getHandTileHighlight(t) : undefined}
            />
            {isDrawn && (
              <div className="drawn-tile-badge" style={{
                position: 'absolute',
                top: '-8px',
                right: '-4px',
                background: '#f1c40f',
                color: '#111',
                fontSize: '9px',
                padding: '1px 3px',
                borderRadius: '3px',
                fontWeight: 'bold',
                transform: 'scale(0.85)',
                pointerEvents: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                zIndex: 5
              }}>
                摸
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
