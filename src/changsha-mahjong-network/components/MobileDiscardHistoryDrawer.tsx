import React from 'react';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { TileView } from './TileView.jsx';

export interface MobileDiscardHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  isMe: boolean;
  discards: Tile[];
  globalLatestTile?: Tile;
}

export function MobileDiscardHistoryDrawer({
  isOpen,
  onClose,
  playerName,
  isMe,
  discards,
  globalLatestTile
}: MobileDiscardHistoryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="discard-drawer-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        fontFamily: 'Outfit, sans-serif'
      }}
    >
      <div 
        className="discard-drawer-content"
        onClick={(e) => e.stopPropagation()} // prevent closing when clicking content
        style={{
          width: '100%',
          maxWidth: '500px',
          background: '#14221a',
          borderTop: '2px solid var(--gold-accent)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          padding: '16px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: '70vh',
          animation: 'slideInUp 0.25s ease-out'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--gold-accent)' }}>
              {isMe ? '我' : playerName} 的完整弃牌历史
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>
              共 {discards.length} 张牌（按时间顺序排序）
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 'bold'
            }}
          >
            关闭
          </button>
        </div>

        {/* Scrollable list */}
        <div 
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            padding: '8px 0',
            alignContent: 'flex-start'
          }}
        >
          {discards.map((t, idx) => {
            const isLatest = globalLatestTile && t.instanceId === globalLatestTile.instanceId;
            return (
              <div 
                key={t.instanceId || idx}
                style={{
                  position: 'relative',
                  padding: '2px',
                  borderRadius: '4px',
                  background: isLatest ? 'rgba(241,196,15,0.1)' : 'transparent',
                  border: isLatest ? '1.5px solid var(--gold-accent)' : '1px solid transparent'
                }}
              >
                <TileView 
                  tile={t}
                  highlightType={isLatest ? 'latest' : undefined}
                  isLatestDiscard={!!isLatest}
                />
                {isLatest && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: 'var(--gold-accent)',
                    color: '#111',
                    fontSize: '6px',
                    padding: '0 2px',
                    borderRadius: '2px',
                    fontWeight: 'bold',
                    transform: 'scale(0.8)',
                    zIndex: 2
                  }}>
                    最新
                  </span>
                )}
                {/* Time order text */}
                <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '2px' }}>
                  #{idx + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
