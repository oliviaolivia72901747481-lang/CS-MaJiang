import React from 'react';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { TileView } from './TileView.jsx';

export interface DiscardPlayerEntry {
  seat: 0 | 1 | 2 | 3;
  playerName: string;
  discards: Tile[];
  isCurrent: boolean;
  isMe: boolean;
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
        padding: '6px 8px',
        boxSizing: 'border-box',
      }}
    >
      {players.map((player) => {
        if (!player.discards || player.discards.length === 0) {
          return (
            <div
              key={player.seat}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '20px',
              }}
            >
              <span
                style={{
                  fontSize: '0.62rem',
                  color: player.isCurrent ? 'var(--gold-accent)' : 'rgba(255,255,255,0.4)',
                  whiteSpace: 'nowrap',
                  minWidth: '36px',
                  fontWeight: player.isCurrent ? 'bold' : 'normal',
                }}
              >
                {player.isMe ? '我' : player.playerName}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                未出牌
              </span>
            </div>
          );
        }

        const maxVisible = 6;
        const tilesToShow = player.discards.slice(-maxVisible).reverse();
        const hiddenCount = Math.max(0, player.discards.length - maxVisible);

        return (
          <div
            key={player.seat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {/* Player label */}
            <span
              style={{
                fontSize: '0.62rem',
                color: player.isCurrent ? 'var(--gold-accent)' : 'rgba(255,255,255,0.55)',
                whiteSpace: 'nowrap',
                minWidth: '30px',
                flexShrink: 0,
                fontWeight: player.isCurrent ? 'bold' : 'normal',
              }}
            >
              {player.isMe ? '我' : player.playerName}
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
                overflowX: 'hidden'
              }}
            >
              {tilesToShow.map((t, idx) => {
                const isLatest = lastDiscardTile && t.instanceId === lastDiscardTile.instanceId;
                return (
                  <div
                    key={t.instanceId || idx}
                    className={isLatest ? 'discard-tile-latest' : ''}
                    style={{
                      flexShrink: 0,
                      animation: isLatest ? 'latestDiscardPulse 1.5s ease-in-out 2' : 'none',
                    }}
                  >
                    <TileView tile={t} isLatestDiscard={isLatest} />
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
                    fontSize: '0.58rem',
                    fontWeight: 'bold',
                    marginLeft: '4px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  +{hiddenCount} 历史
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
