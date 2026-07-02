import React from 'react';

export interface PlayerConnectionStatusProps {
  playerName: string;
  connected: boolean;
  isAI: boolean;
  seat: number;
  isCurrentTurn: boolean;
  score: number;
  connectionState?: string;
}

export function PlayerConnectionStatus({
  playerName,
  connected,
  isAI,
  seat,
  isCurrentTurn,
  score,
  connectionState
}: PlayerConnectionStatusProps) {
  const getStatusText = () => {
    if (isAI || connectionState === 'ai') return '🤖 AI';
    if (connectionState === 'online') return '● 在线';
    if (connectionState === 'reconnecting') return '○ 重连中';
    if (connectionState === 'offline') return '● 离线';
    if (connectionState === 'left') return '已离开 / AI 托管';
    return connected ? '● 在线' : '● 离线';
  };

  const getStatusStyle = () => {
    if (isAI || connectionState === 'ai') return { color: '#f1c40f', background: 'rgba(241,196,15,0.15)' };
    switch (connectionState) {
      case 'online':
        return { color: '#2ecc71', background: 'rgba(46,204,113,0.15)' };
      case 'reconnecting':
        return { color: '#f1c40f', background: 'rgba(241,196,15,0.15)', animation: 'pulse 1.5s infinite' };
      case 'offline':
        return { color: '#e74c3c', background: 'rgba(231,76,60,0.15)', animation: 'pulse 1.5s infinite' };
      case 'left':
        return { color: '#95a5a6', background: 'rgba(149,165,166,0.15)' };
      default:
        return connected
          ? { color: '#2ecc71', background: 'rgba(46,204,113,0.15)' }
          : { color: '#e74c3c', background: 'rgba(231,76,60,0.15)', animation: 'pulse 1.5s infinite' };
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '10px 15px',
      borderRadius: '8px',
      background: isCurrentTurn ? 'rgba(241,196,15,0.08)' : 'rgba(255,255,255,0.03)',
      border: isCurrentTurn ? '1.5px solid var(--gold-accent)' : '1px solid rgba(255,255,255,0.08)',
      minWidth: '120px',
      boxShadow: isCurrentTurn ? '0 0 10px rgba(241,196,15,0.2)' : 'none',
      transition: 'all 0.3s ease',
      fontFamily: 'Outfit, sans-serif'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <span style={{
          background: isCurrentTurn ? 'var(--gold-accent)' : 'rgba(255,255,255,0.2)',
          color: isCurrentTurn ? '#111' : '#fff',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '0.8rem'
        }}>
          {seat}
        </span>
        <span style={{
          fontWeight: 'bold',
          fontSize: '0.95rem',
          maxWidth: '80px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {playerName}
        </span>
      </div>

      <div style={{
        fontSize: '0.8rem',
        padding: '2px 8px',
        borderRadius: '10px',
        fontWeight: 'bold',
        ...getStatusStyle()
      }}>
        {getStatusText()}
      </div>

      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
        分值: <strong style={{ color: '#fff' }}>{score}</strong>
      </div>
    </div>
  );
}
