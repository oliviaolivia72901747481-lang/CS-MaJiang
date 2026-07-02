import React from 'react';
import { PlayerVisibleView } from '../server/network-types.js';
import { TablePlayerSeat } from './OnlineGamePage.jsx';

export interface CurrentTurnBannerProps {
  view: PlayerVisibleView;
  seat: number;
  getPlayerAtSeat: (s: number) => TablePlayerSeat;
}

export function CurrentTurnBanner({ view, seat, getPlayerAtSeat }: CurrentTurnBannerProps) {
  const currentSeat = view.currentSeat;
  const isSelf = currentSeat === seat;
  const activePlayer = getPlayerAtSeat(currentSeat);
  
  let bannerText = '';
  const isTrusteeMode = activePlayer.connectionState === 'left' || activePlayer.connectionState === 'offline';
  
  if (isSelf) {
    bannerText = isTrusteeMode ? '到你出牌 (AI托管中)' : '轮到你出牌';
  } else {
    const roleText = activePlayer.isAI ? '机器人' : '玩家';
    const statusText = isTrusteeMode ? '(AI托管中)' : '';
    bannerText = `等待 ${roleText} ${activePlayer.playerName} 出牌 ${statusText}`;
  }

  return (
    <div className="current-turn-banner" style={{
      width: '100%',
      padding: '8px 12px',
      borderRadius: '8px',
      background: isSelf ? 'rgba(241, 196, 15, 0.15)' : 'rgba(255, 255, 255, 0.05)',
      border: isSelf ? '1px solid var(--gold-accent)' : '1px solid rgba(255, 255, 255, 0.1)',
      color: isSelf ? 'var(--gold-accent)' : '#fff',
      fontWeight: 'bold',
      fontSize: '0.9rem',
      textAlign: 'center',
      boxSizing: 'border-box',
      animation: isSelf ? 'pulse 2s infinite' : 'none'
    }}>
      {bannerText}
    </div>
  );
}
