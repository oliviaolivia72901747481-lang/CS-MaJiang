import React from 'react';
import { GamePhase } from '../../changsha-mahjong/types/game.js';

export interface TurnIndicatorProps {
  currentSeat: number;
  dealerSeat: number;
  remainingTiles: number;
  phase: GamePhase;
}

export function TurnIndicator({ currentSeat, dealerSeat, remainingTiles, phase }: TurnIndicatorProps) {
  const getDirections = () => {
    // Standard Mahjong Seat Mapping:
    // Seat 0: South (南) - Human Player at the bottom
    // Seat 1: East (东) - AI-1 on the right
    // Seat 2: North (北) - AI-2 at the top
    // Seat 3: West (西) - AI-3 on the left
    return [
      { seat: 0, label: '南', name: '我' },
      { seat: 1, label: '东', name: '下家' },
      { seat: 2, label: '北', name: '对家' },
      { seat: 3, label: '西', name: '上家' },
    ];
  };

  const getPhaseText = (p: GamePhase): string => {
    switch (p) {
      case 'init': return '初始化';
      case 'dealing': return '发牌中';
      case 'startingHu': return '起手胡判定';
      case 'playing': return '出牌阶段';
      case 'waitingForResponses': return '吃碰杠决策';
      case 'gangReplacement': return '杠上花判定';
      case 'haiDi': return '海底捞月';
      case 'settlement': return '对局结算';
      case 'draw': return '流局';
      case 'ended': return '对局结束';
      default: return p;
    }
  };

  return (
    <div className="turn-indicator-compass">
      <div className="compass-inner">
        <div className="compass-directions">
          {getDirections().map(dir => {
            const isActive = currentSeat === dir.seat;
            const isDealer = dealerSeat === dir.seat;
            return (
              <div 
                key={dir.seat} 
                className={`compass-dir dir-${dir.seat} ${isActive ? 'active-turn' : ''}`}
              >
                <span className="dir-label">{dir.label}</span>
                {isDealer && <span className="dealer-dot" title="庄家">庄</span>}
              </div>
            );
          })}
        </div>
        
        <div className="compass-center">
          <div className="wall-count font-bold">{remainingTiles}</div>
          <div className="wall-label">剩余牌</div>
          <div className="phase-badge">{getPhaseText(phase)}</div>
        </div>
      </div>
    </div>
  );
}
