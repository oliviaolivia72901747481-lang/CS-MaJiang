import React from 'react';
import { getTileChineseName, getRemainingTileCount } from '../../changsha-mahjong/coach/hand-advisor.js';
import { GameState } from '../../changsha-mahjong/types/game.js';
import { buildVisibleStateForCoach } from '../../changsha-mahjong/coach/visible-state.js';

export interface EffectiveTilesViewProps {
  effectiveTileKeys: string[];
  state: GameState;
}

export function EffectiveTilesView({ effectiveTileKeys, state }: EffectiveTilesViewProps) {
  if (!effectiveTileKeys || effectiveTileKeys.length === 0) {
    return <div className="no-effective-tiles">无有效进张（可能已胡牌或听牌牌池已空）</div>;
  }

  const visibleState = buildVisibleStateForCoach(state, 0);

  const items = effectiveTileKeys.map(key => {
    const count = getRemainingTileCount(visibleState, [key]);
    return { key, count, name: getTileChineseName(key) };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="effective-tiles-view">
      <div className="effective-tiles-grid">
        {items.map(item => (
          <div key={item.key} className={`effective-tile-item ${item.count === 0 ? 'depleted' : ''}`}>
            <span className="eff-tile-name">{item.name}</span>
            <span className="eff-tile-count">
              {item.count > 0 ? `${item.count}张` : '已无'}
            </span>
          </div>
        ))}
      </div>
      <div className="effective-tiles-disclaimer text-xs text-secondary mt-1" style={{ fontSize: '11px', marginTop: '6px', color: '#888' }}>
        * 理论剩余张数基于已公开牌扣减估算，不代表牌墙真实剩余
      </div>
    </div>
  );
}
