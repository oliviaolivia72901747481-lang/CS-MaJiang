import React from 'react';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { TileView } from './TileView.jsx';

export interface LatestDiscardPlayer {
  seat: 0 | 1 | 2 | 3;
  playerName: string;
  isMe: boolean;
  latestTile?: Tile;
}

export interface MobileLatestDiscardDockProps {
  players: LatestDiscardPlayer[];
  globalLatestTile?: Tile;
  latestDiscardEvent?: { seat: number; playerLabel: string } | null;
}

export function MobileLatestDiscardDock({ players, globalLatestTile, latestDiscardEvent }: MobileLatestDiscardDockProps) {
  if (!players || players.length === 0) return null;

  return (
    <div 
      className="mobile-latest-discard-dock"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(241, 196, 15, 0.04)',
        border: '1px solid rgba(241, 196, 15, 0.15)',
        borderRadius: '8px',
        padding: '6px 10px',
        margin: '2px 0',
        gap: '4px',
        boxSizing: 'border-box',
        width: '100%'
      }}
    >
      <div style={{ fontSize: '0.65rem', color: 'var(--gold-accent)', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>📢 各方最近出牌</span>
        {latestDiscardEvent && (
          <span style={{ color: '#fff', fontSize: '0.62rem', fontWeight: 'normal' }}>
            最新: {latestDiscardEvent.playerLabel}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-around', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
        {players.map(p => {
          const isLatest = globalLatestTile && p.latestTile && p.latestTile.instanceId === globalLatestTile.instanceId;
          
          return (
            <div 
              key={p.seat}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 6px',
                borderRadius: '6px',
                background: isLatest ? 'rgba(241, 196, 15, 0.1)' : 'rgba(0,0,0,0.15)',
                border: isLatest ? '1px solid var(--gold-accent)' : '1px solid rgba(255,255,255,0.05)',
                boxShadow: isLatest ? '0 0 8px rgba(241, 196, 15, 0.25)' : 'none',
                position: 'relative'
              }}
            >
              <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: isLatest ? 'var(--gold-accent)' : 'rgba(255,255,255,0.5)' }}>
                {p.isMe ? '我' : p.playerName}:
              </span>
              {p.latestTile ? (
                <div style={{ display: 'inline-block', position: 'relative' }}>
                  <TileView 
                    tile={p.latestTile} 
                    highlightType={isLatest ? 'latest' : undefined}
                    isLatestDiscard={!!isLatest}
                  />
                  {isLatest && (
                    <span 
                      className="discard-badge-latest"
                      style={{
                        position: 'absolute',
                        bottom: '-4px',
                        right: '-4px',
                        background: 'var(--gold-accent)',
                        color: '#111',
                        fontSize: '7px',
                        padding: '0 2px',
                        borderRadius: '2px',
                        fontWeight: 'bold',
                        transform: 'scale(0.8)',
                        whiteSpace: 'nowrap',
                        zIndex: 2
                      }}
                    >
                      最新
                    </span>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
                  无
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
