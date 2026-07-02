import React from 'react';
import { Meld } from '../../changsha-mahjong/types/meld.js';
import { TileView } from './TileView.jsx';

export interface MobileMeldAreaProps {
  melds: Meld[];
  compact?: boolean; // for opponent strips
}

const MELD_LABEL: Record<string, string> = {
  chi: '吃',
  peng: '碰',
  mingGang: '直杠',
  buGang: '补杠',
  anGang: '暗杠',
};

const MELD_COLOR: Record<string, string> = {
  chi: '#3498db',
  peng: '#f1c40f',
  mingGang: '#2ecc71',
  buGang: '#2ecc71',
  anGang: '#9b59b6',
};

export function MobileMeldArea({ melds, compact = false }: MobileMeldAreaProps) {
  if (!melds || melds.length === 0) return null;

  const tileSize = compact ? 'calc((100vw - 120px) / 18)' : 'calc((100vw - 64px) / 16)';
  const maxTileSize = compact ? '28px' : '38px';

  return (
    <div
      className="mobile-meld-area"
      style={{
        display: 'flex',
        gap: compact ? '4px' : '6px',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {melds.map((meld, idx) => {
        const label = MELD_LABEL[meld.type] || meld.type;
        const color = MELD_COLOR[meld.type] || '#888';
        const isAnGang = meld.type === 'anGang';
        const isNew = idx === melds.length - 1;

        return (
          <div
            key={idx}
            className={`mobile-meld-group ${isNew ? 'meld-newly-formed' : ''}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            {/* Label */}
            <span
              className="meld-type-label"
              style={{
                fontSize: compact ? '0.55rem' : '0.62rem',
                fontWeight: 'bold',
                color,
                background: `${color}22`,
                padding: '1px 4px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
            {/* Tiles */}
            <div
              style={{
                display: 'flex',
                gap: '1px',
                border: `1px solid ${color}55`,
                borderRadius: '4px',
                padding: '2px',
                background: 'rgba(0,0,0,0.3)',
              }}
            >
              {meld.tiles.map((t, tIdx) => {
                // For anGang: hide middle 2 tiles (face-down)
                const hidden = isAnGang && tIdx >= 1 && tIdx <= 2;
                return (
                  <div
                    key={tIdx}
                    style={{
                      width: tileSize,
                      maxWidth: maxTileSize,
                      fontSize: compact ? '0.6rem' : '0.75rem',
                    }}
                  >
                    <TileView tile={t} hidden={hidden} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
