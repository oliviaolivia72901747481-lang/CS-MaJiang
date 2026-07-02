import React from 'react';
import { PlayerDisplayState } from '../types/ui-types.js';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { TileView } from './TileView.jsx';
import { PlayerHand } from './PlayerHand.jsx';
import { OpponentHand } from './OpponentHand.jsx';
import { DiscardRiver } from './DiscardRiver.jsx';
import { AiProfileBadge } from './AiProfileBadge.jsx';

export interface PlayerAreaProps {
  player: PlayerDisplayState;
  isCurrent: boolean;
  isEnded: boolean;
  selectedTileInstanceId?: string;
  onTileClick?: (tile: Tile) => void;
  lastDiscardTileId?: string;
  isHuman: boolean;
}

export function PlayerArea({ 
  player, 
  isCurrent, 
  isEnded, 
  selectedTileInstanceId, 
  onTileClick, 
  lastDiscardTileId, 
  isHuman 
}: PlayerAreaProps) {
  
  const getAIProfileName = (p?: string): string => {
    switch (p) {
      case 'fastHu': return '🚀 快胡型';
      case 'bigHu': return '👑 大胡型';
      case 'defensive': return '🛡️ 防守型';
      case 'balanced': return '⚖️ 均衡型';
      default: return p || '';
    }
  };

  return (
    <div className={`player-area player-seat-${player.seat} ${isCurrent ? 'active-turn' : ''}`}>
      {/* Player Meta Info */}
      <div className="player-meta">
        <div className="player-avatar-row">
          <div className="avatar">🀄</div>
          <div className="meta-details">
            <span className="player-name">
              {player.name}
              {player.isDealer && <span className="dealer-tag">庄</span>}
            </span>
            {!player.isHuman && player.aiProfile && (
              <AiProfileBadge profile={player.aiProfile} />
            )}
          </div>
        </div>
        <div className="player-score">
          <span>积分：</span>
          <span className="score-val">{player.score}</span>
        </div>
      </div>

      {/* Melds (Exposed tiles) */}
      <div className="player-melds">
        {player.melds.map((meld, mIdx) => (
          <div key={mIdx} className="exposed-meld">
            {meld.tiles.map((tile, tIdx) => (
              <TileView 
                key={tIdx} 
                tile={tile} 
                hidden={meld.type === 'anGang' && !isEnded} 
                disabled={true} 
              />
            ))}
          </div>
        ))}
      </div>

      {/* Discard River */}
      <div className="player-river-wrapper">
        <div className="river-title">已出牌</div>
        <DiscardRiver 
          discards={player.discards} 
          lastDiscardTileId={lastDiscardTileId} 
        />
      </div>

      {/* Hand area */}
      <div className="player-hand-wrapper">
        {isHuman ? (
          <PlayerHand
            hand={player.hand || []}
            selectedTileInstanceId={selectedTileInstanceId}
            onTileClick={onTileClick || (() => {})}
            disabled={!isCurrent}
          />
        ) : (
          <OpponentHand
            seat={player.seat}
            handCount={player.handCount}
            hand={player.hand}
            reveal={isEnded}
          />
        )}
      </div>
    </div>
  );
}
