import React from 'react';
import { GameLogEntry } from '../../changsha-mahjong/types/game.js';
import { formatLog } from '../../changsha-mahjong/controller/game-log.js';

export interface MobileGameLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: GameLogEntry[];
}

export function MobileGameLogDrawer({ isOpen, onClose, logs }: MobileGameLogDrawerProps) {
  if (!isOpen) return null;
  return (
    <div className="mobile-drawer-overlay" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', marginBottom: '10px' }}>
          <strong style={{ color: 'var(--gold-accent)' }}>对局日志</strong>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
            ✕ 关闭
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
          {logs.slice(-25).map((log, idx) => (
            <div key={idx} style={{ padding: '3px 6px', borderRadius: '3px', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid var(--gold-accent)' }}>
              {formatLog(log)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
