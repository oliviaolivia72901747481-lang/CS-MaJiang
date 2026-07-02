import React, { useEffect, useState } from 'react';
import { GameLogEntry } from '../../changsha-mahjong/types/game.js';
import { formatLog } from '../../changsha-mahjong/controller/game-log.js';

export interface RecentActionToastProps {
  latestLog: GameLogEntry | null;
}

export function RecentActionToast({ latestLog }: RecentActionToastProps) {
  const [visible, setVisible] = useState(!!latestLog);
  const [prevLog, setPrevLog] = useState<GameLogEntry | null>(latestLog);

  // Sync state during render when latestLog changes
  if (latestLog !== prevLog) {
    setVisible(!!latestLog);
    setPrevLog(latestLog);
  }

  useEffect(() => {
    if (latestLog) {
      const timer = setTimeout(() => setVisible(false), 2500); // disappear after 2.5s
      return () => clearTimeout(timer);
    }
  }, [latestLog]);

  if (!latestLog || !visible) return null;

  return (
    <div className="recent-action-toast" style={{
      position: 'absolute',
      top: '50px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0, 0, 0, 0.85)',
      border: '1.5px solid var(--gold-accent)',
      color: '#fff',
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '0.85rem',
      fontWeight: 'bold',
      boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
      zIndex: 50,
      pointerEvents: 'none',
      transition: 'opacity 0.2s'
    }}>
      📣 {formatLog(latestLog)}
    </div>
  );
}
