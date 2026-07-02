import React from 'react';

export interface GameStatusBarProps {
  currentSeat: number;
  wallCount: number;
  dealerSeat: number;
  phase: string;
  isWaitingForHumanUser: boolean;
}

export function GameStatusBar({ currentSeat, wallCount, dealerSeat, phase, isWaitingForHumanUser }: GameStatusBarProps) {
  const getPhaseName = (p: string): string => {
    switch (p) {
      case 'ready': return '准备中';
      case 'dealing': return '发牌阶段';
      case 'qiShouHu': return '起手胡判定';
      case 'playing': return '对局进行中';
      case 'waitingForResponses': return '等待吃碰杠胡响应';
      case 'gangReplacement': return '杠后补张阶段';
      case 'haiDi': return '海底捞月阶段';
      case 'ended': return '本局已结束';
      default: return p;
    }
  };

  const getSeatName = (seat: number): string => {
    if (seat === 0) return '您自己 (0号位)';
    return `机器人 ${seat} (AI)`;
  };

  return (
    <div className="game-status-bar">
      <div className="status-item">
        <span className="status-label">当前阶段：</span>
        <span className="status-value phase-badge">{getPhaseName(phase)}</span>
      </div>
      
      <div className="status-item">
        <span className="status-label">当前轮值：</span>
        <span className={`status-value current-seat-badge seat-${currentSeat}`}>
          {getSeatName(currentSeat)}
        </span>
      </div>

      <div className="status-item">
        <span className="status-label">剩余牌数：</span>
        <span className="status-value wall-count">{wallCount} 张</span>
      </div>

      <div className="status-item">
        <span className="status-label">本局庄家：</span>
        <span className={`status-value dealer-badge seat-${dealerSeat}`}>
          {getSeatName(dealerSeat)}
        </span>
      </div>

      {isWaitingForHumanUser && (
        <div className="status-item human-waiting-indicator">
          <span>⚡ 请您操作！</span>
        </div>
      )}
    </div>
  );
}
