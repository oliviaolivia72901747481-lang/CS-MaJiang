import React from 'react';
import { TablePlayerSeat } from './OnlineGamePage.jsx';
import { MobileMeldArea } from './MobileMeldArea.jsx';

export interface MobileOpponentStripProps {
  player: TablePlayerSeat;
  isCurrent: boolean;
}

/**
 * MobileOpponentStrip — mobile opponent info bar.
 *
 * v0.8.6-hotfix-mobile-discard-dedupe:
 * Removed redundant discard rendering. Discards are now displayed
 * exclusively in the center area (MobileLatestDiscardDock,
 * MobileCenterDiscardArea, MobileDiscardHistoryDrawer).
 * This component only shows player info + melds (chi/peng/gang).
 */
export function MobileOpponentStrip({ player, isCurrent }: MobileOpponentStripProps) {
  return (
    <div 
      className={`mobile-opponent-strip ${isCurrent ? 'active' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        background: isCurrent ? 'rgba(241, 196, 15, 0.12)' : 'rgba(255, 255, 255, 0.03)',
        border: isCurrent ? '1.5px solid var(--gold-accent)' : '1px solid rgba(255, 255, 255, 0.08)',
        padding: '6px 10px',
        borderRadius: '6px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem' }}>
        <span style={{ fontWeight: 'bold', color: isCurrent ? 'var(--gold-accent)' : '#fff' }}>
          {player.isAI ? '🤖' : '👤'} {player.playerName} ({player.seat}号)
        </span>
        <span>手牌: <strong style={{ color: 'var(--gold-accent)' }}>{player.handCount}</strong> 张</span>
        <span style={{ 
          color: player.connectionState === 'online' 
            ? '#2ecc71' 
            : (player.connectionState === 'reconnecting' 
                ? '#f1c40f' 
                : (player.connectionState === 'left' ? '#e67e22' : '#e74c3c')), 
          fontWeight: 'bold' 
        }}>
          {player.connectionState === 'online' 
            ? '● 在线' 
            : (player.connectionState === 'reconnecting' 
                ? '○ 重连中...' 
                : (player.connectionState === 'left' ? '已离开 (AI托管)' : '● 离线'))}
        </span>
      </div>

      {/* Only render melds (chi/peng/gang) — discards are shown in center area */}
      {player.melds && player.melds.length > 0 && (
        <MobileMeldArea melds={player.melds} compact={true} />
      )}
    </div>
  );
}
