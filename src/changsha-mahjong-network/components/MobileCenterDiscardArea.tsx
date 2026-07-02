import React from 'react';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { TileView } from './TileView.jsx';

export interface DiscardPlayerEntry {
  seat: 0 | 1 | 2 | 3;
  playerName: string;
  discards: Tile[];
  isCurrent: boolean;
  isMe: boolean;
  title?: string;
}

export interface MobileCenterDiscardAreaProps {
  players: DiscardPlayerEntry[];
  lastDiscardTile?: Tile; // The very last tile discarded globally
  onOpenHistory?: (seat: number) => void;
}

export function MobileCenterDiscardArea({ players, lastDiscardTile, onOpenHistory }: MobileCenterDiscardAreaProps) {
  if (!players || players.length === 0) return null;

  return (
    <div
      className="mobile-center-discard-area"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        background: 'rgba(0,0,0,0.25)',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '5px 6px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: players.length > 2 ? '1fr 1fr' : '1fr',
          gap: '4px 6px',
          alignItems: 'center',
        }}
      >
      {players.map((player) => {
        if (!player.discards || player.discards.length === 0) {
          return (
            <div
              key={player.seat}
              title={player.title || player.playerName}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '18px',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: '0.62rem',
                  color: player.isCurrent ? 'var(--gold-accent)' : 'rgba(255,255,255,0.4)',
                  whiteSpace: 'nowrap',
                  minWidth: '18px',
                  fontWeight: player.isCurrent ? 'bold' : 'normal',
                }}
              >
                {player.playerName}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                未出牌
              </span>
            </div>
          );
        }

        const maxVisible = 2;
        const tilesToShow = player.discards.slice(-maxVisible).reverse();
        const hiddenCount = Math.max(0, player.discards.length - maxVisible);

        return (
          <div
            key={player.seat}
            title={player.title || player.playerName}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              minWidth: 0,
            }}
          >
            {/* Player label */}
            <span
              style={{
                fontSize: '0.62rem',
                color: player.isCurrent ? 'var(--gold-accent)' : 'rgba(255,255,255,0.55)',
                whiteSpace: 'nowrap',
                minWidth: '18px',
                flexShrink: 0,
                fontWeight: player.isCurrent ? 'bold' : 'normal',
              }}
            >
              {player.playerName}
            </span>
            
            {/* Discard tiles - latest first */}
            <div
              className="mobile-discard-river-row"
              onClick={() => onOpenHistory && onOpenHistory(player.seat)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                flex: 1,
                cursor: 'pointer',
                overflowX: 'hidden',
                minWidth: 0,
              }}
            >
              {tilesToShow.map((t, idx) => {
                const isSeatLatest = idx === 0;
                const isLatest = lastDiscardTile && t.instanceId === lastDiscardTile.instanceId;
                return (
                  <div
                    key={t.instanceId || idx}
                    className={isLatest ? 'discard-tile-latest tile-global-latest-discard' : ''}
                    style={{
                      position: 'relative',
                      flexShrink: 0,
                      animation: isLatest ? 'latestDiscardPulse 1.5s ease-in-out 2' : 'none',
                    }}
                  >
                    {isSeatLatest && (
                      <span
                        className="tile-seat-latest-dot"
                        style={{
                          position: 'absolute',
                          top: '-2px',
                          right: '-2px',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#ff4d4f',
                          border: '1px solid rgba(255,255,255,0.9)',
                          boxShadow: isLatest ? '0 0 8px rgba(255,77,79,0.95)' : '0 0 4px rgba(255,77,79,0.55)',
                          zIndex: 2,
                        }}
                      />
                    )}
                    <TileView tile={t} isLatestDiscard={isLatest} size="compact" />
                  </div>
                );
              })}
              {hiddenCount > 0 && (
                <div
                  className="history-badge-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    background: 'rgba(241,196,15,0.15)',
                    border: '1px solid var(--gold-accent)',
                    color: 'var(--gold-accent)',
                    fontSize: '0.56rem',
                    fontWeight: 'bold',
                    marginLeft: '4px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  +{hiddenCount}
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
