import React, { useState } from 'react';

export interface RoomStatusPanelProps {
  roomId: string;
  wallRemainingCount: number;
  connected: boolean;
  dealerSeat: number;
  phase: string;
  onExit?: () => void;
}

export function RoomStatusPanel({
  roomId,
  wallRemainingCount,
  connected,
  dealerSeat,
  phase,
  onExit
}: RoomStatusPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'rgba(0,0,0,0.4)',
      padding: '10px 20px',
      borderRadius: '8px',
      border: '1px solid var(--border-color)',
      fontFamily: 'Outfit, sans-serif',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>房间号:</span>
          <span 
            onClick={handleCopy}
            style={{
              color: 'var(--gold-accent)',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted'
            }}
            title="点击复制房间号"
          >
            {roomId}
          </span>
          {copied && (
            <span style={{ fontSize: '0.75rem', color: '#2ecc71', background: 'rgba(46,204,113,0.1)', padding: '2px 6px', borderRadius: '3px' }}>
              已复制
            </span>
          )}
        </div>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />

        <div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>庄家:</span>
          <span style={{ color: '#fff', marginLeft: '5px', fontWeight: 'bold' }}>{dealerSeat} 号位</span>
        </div>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />

        <div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>牌墙剩余:</span>
          <span style={{ color: 'var(--gold-accent)', marginLeft: '5px', fontWeight: 'bold' }}>{wallRemainingCount}</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}> 张</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          状态: <strong style={{ color: '#fff' }}>{phase === 'playing' ? '进行中' : phase}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: connected ? '#2ecc71' : '#e74c3c', fontSize: '0.9rem' }}>
            {connected ? '🟢 服务器已连接' : '🔴 连接已断开'}
          </span>
        </div>
        {onExit && (
          <button
            onClick={onExit}
            style={{
              background: 'rgba(231, 76, 60, 0.2)',
              border: '1px solid #e74c3c',
              color: '#f5b7b1',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              marginLeft: '10px'
            }}
          >
            🚪 离开房间
          </button>
        )}
      </div>
    </div>
  );
}
