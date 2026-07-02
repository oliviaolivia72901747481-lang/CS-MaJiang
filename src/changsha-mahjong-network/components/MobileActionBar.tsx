import React from 'react';
import { PendingAction } from '../../changsha-mahjong/types/game.js';

export interface MobileActionBarProps {
  huAction?: PendingAction;
  pengAction?: PendingAction;
  chiAction?: PendingAction;
  gangAction?: PendingAction;
  passAction?: PendingAction;
  actionPending: boolean;
  onPerformAction: (actionType: 'hu' | 'peng' | 'pass') => void;
  onChiClick: () => void;
  onGangClick: () => void;
}

export function MobileActionBar({
  huAction,
  pengAction,
  chiAction,
  gangAction,
  passAction,
  actionPending,
  onPerformAction,
  onChiClick,
  onGangClick
}: MobileActionBarProps) {
  return (
    <div className="mobile-action-bar-inner" style={{
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%'
    }}>
      {huAction && (
        <button
          disabled={actionPending}
          onClick={() => onPerformAction('hu')}
          className="mobile-action-btn action-hu"
          style={{
            minHeight: '44px',
            minWidth: '64px',
            fontSize: '1.05rem',
            padding: '6px 16px',
            borderRadius: '22px',
            fontWeight: 'bold',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #ff4d4d 0%, #c0392b 100%)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 0 10px rgba(255, 77, 77, 0.5)'
          }}
        >
          胡牌
        </button>
      )}
      {pengAction && (
        <button
          disabled={actionPending}
          onClick={() => onPerformAction('peng')}
          className="mobile-action-btn action-peng"
          style={{
            minHeight: '44px',
            minWidth: '60px',
            fontSize: '1.05rem',
            padding: '6px 16px',
            borderRadius: '22px',
            fontWeight: 'bold',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #f1c40f 0%, #d4ac0d 100%)',
            color: '#111',
            border: 'none'
          }}
        >
          碰
        </button>
      )}
      {chiAction && (
        <button
          disabled={actionPending}
          onClick={onChiClick}
          className="mobile-action-btn action-chi"
          style={{
            minHeight: '44px',
            minWidth: '60px',
            fontSize: '1.05rem',
            padding: '6px 16px',
            borderRadius: '22px',
            fontWeight: 'bold',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
            color: '#fff',
            border: 'none'
          }}
        >
          吃
        </button>
      )}
      {gangAction && (
        <button
          disabled={actionPending}
          onClick={onGangClick}
          className="mobile-action-btn action-gang"
          style={{
            minHeight: '44px',
            minWidth: '60px',
            fontSize: '1.05rem',
            padding: '6px 16px',
            borderRadius: '22px',
            fontWeight: 'bold',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
            color: '#fff',
            border: 'none'
          }}
        >
          杠
        </button>
      )}
      {passAction && (
        <button
          disabled={actionPending}
          onClick={() => onPerformAction('pass')}
          className="mobile-action-btn action-pass"
          style={{
            minHeight: '44px',
            minWidth: '60px',
            fontSize: '1.05rem',
            padding: '6px 16px',
            borderRadius: '22px',
            fontWeight: 'bold',
            cursor: 'pointer',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          过
        </button>
      )}
    </div>
  );
}
