import React from 'react';
import { SettlementSummary } from '../server/network-types.js';
import { TablePlayerSeat } from './OnlineGamePage.jsx';
import { TileView } from './TileView.jsx';
import { sortTiles } from '../../changsha-mahjong/engine/tile-engine.js';

export interface SettlementModalProps {
  settlement: SettlementSummary;
  seat: number;
  getPlayerAtSeat: (s: number) => TablePlayerSeat;
  onExitGame: () => void;
  activeSeats?: number[];
}

export function SettlementModal({
  settlement,
  seat,
  getPlayerAtSeat,
  onExitGame,
  activeSeats
}: SettlementModalProps) {
  const seatsToRender = activeSeats || [0, 1, 2, 3];
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)', padding: '15px', boxSizing: 'border-box' }}>
      <div style={{ background: '#111a14', border: '2px solid var(--gold-accent)', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.9)', textAlign: 'center', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        <h2 style={{ color: 'var(--gold-accent)', fontSize: '1.6rem', margin: '0 0 10px 0' }}>对局结算</h2>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '0.85rem' }}>
          赢家座位: {settlement.winnerSeats.length > 0 ? settlement.winnerSeats.join(', ') : '流局'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {seatsToRender.map(s => {
            const isWinner = settlement.winnerSeats.includes(s as any);
            const delta = settlement.scoreDeltas[s as 0 | 1 | 2 | 3] ?? 0;
            const opp = getPlayerAtSeat(s);
            const pName = s === seat ? '你' : opp.playerName;
            const pHands = opp.hand || [];
            
            return (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', background: isWinner ? 'rgba(241,196,15,0.08)' : 'rgba(255,255,255,0.02)', border: isWinner ? '1px solid rgba(241,196,15,0.3)' : '1px solid rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                  <span>{pName} {opp.isAI ? '(🤖 AI)' : ''} (座位 {s})</span>
                  <span style={{ color: delta >= 0 ? '#2ecc71' : '#ff4d4d' }}>
                    {delta >= 0 ? `+${delta}` : delta} 分
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {sortTiles(pHands).map((t: any, idx: number) => (
                    <TileView key={idx} tile={t} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={onExitGame}
          className="settlement-exit-btn"
          style={{ padding: '10px 24px', fontSize: '1rem', fontWeight: 'bold', background: 'linear-gradient(135deg, var(--gold-accent) 0%, #d4ac0d 100%)', color: '#111', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '100%' }}
        >
          返回联机大厅
        </button>
      </div>
    </div>
  );
}
