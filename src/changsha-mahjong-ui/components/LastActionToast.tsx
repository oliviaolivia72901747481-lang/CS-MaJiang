import React, { useEffect, useState } from 'react';
import { GameLogEntry } from '../../changsha-mahjong/types/game.js';

export interface LastActionToastProps {
  lastLog?: GameLogEntry;
}

export function LastActionToast({ lastLog }: LastActionToastProps) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!lastLog) {
      setVisible(false);
      return;
    }

    const seatStr = lastLog.seat !== undefined 
      ? (lastLog.seat === 0 ? '我' : `玩家 ${lastLog.seat}`)
      : '系统';
    
    const detailStr = lastLog.detail ? `：${lastLog.detail}` : '';
    const actionText = `【${seatStr}】${lastLog.action}${detailStr}`;

    setText(actionText);
    setVisible(true);

    // Auto fade-out after 3 seconds
    const timer = setTimeout(() => {
      setVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [lastLog]);

  if (!visible || !text) return null;

  return (
    <div className="last-action-toast-overlay">
      <div className="last-action-toast">
        <span className="toast-icon">⚡</span>
        <span className="toast-text">{text}</span>
      </div>
    </div>
  );
}
