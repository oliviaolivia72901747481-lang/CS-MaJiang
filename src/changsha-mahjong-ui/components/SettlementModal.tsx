import React from 'react';
import { GameState } from '../types/ui-types.js';
import { TileView } from './TileView.jsx';
import { getBirdTarget } from '../../changsha-mahjong/engine/bird-engine.js';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { sortTiles } from '../../changsha-mahjong/engine/tile-engine.js';

export interface SettlementModalProps {
  state: GameState | null;
  onRestart: () => void;
  onClose: () => void;
  onShowCoachReport?: () => void;
}

export function SettlementModal({ state, onRestart, onClose, onShowCoachReport }: SettlementModalProps) {
  // Allow rendering in settlement/draw/ended phases
  if (!state || (state.phase !== 'settlement' && state.phase !== 'draw' && state.phase !== 'ended' && !state.roundEnded)) return null;

  const isDraw = !state.winnerSeats || state.winnerSeats.length === 0;

  // Determine winner seats and win method
  const winMethod = state.lastDiscard ? 'dianPao' : 'ziMo';
  const loserSeat = winMethod === 'dianPao' ? state.lastDiscard?.fromSeat : undefined;

  const getSeatName = (seat: number): string => {
    if (seat === 0) return '玩家本人 (我)';
    return `机器人 ${seat}`;
  };

  const getPlayerNameById = (id: string): string => {
    const player = state.players.find(p => p.id === id);
    if (!player) return '系统';
    return getSeatName(player.seat);
  };

  const getBirdHitInfo = (bird: Tile) => {
    const target = getBirdTarget(bird, state.dealerSeat);
    const targetName = getSeatName(target);
    let hit = false;
    
    if (!isDraw && state.winnerSeats.length > 0) {
      const winner = state.winnerSeats[0];
      if (winMethod === 'ziMo') {
        hit = true; 
      } else {
        hit = target === winner || target === loserSeat;
      }
    }

    return {
      target,
      targetName,
      hit,
    };
  };

  const getPlayerHandTitle = (seat: number): string => {
    const isDealerStr = seat === state.dealerSeat ? ' 👑 (庄家)' : '';
    const isWinnerStr = state.winnerSeats?.includes(seat as 0|1|2|3) ? ' 🏆 [赢家]' : '';
    return `${getSeatName(seat)}${isDealerStr}${isWinnerStr}`;
  };

  return (
    <div className="settlement-modal-overlay">
      <div className="settlement-modal anim-scale-up">
        <div className="modal-header">
          <h2>{isDraw ? '🀩 对局流局 (Draw)' : '🀅 对局结算 (Settle)'}</h2>
        </div>

        <div className="modal-body">
          {/* Winner summary */}
          {isDraw ? (
            <div className="winner-summary-card draw-card">
              <h3>💨 流局：没有赢家</h3>
              <p>所有手牌已摸完，且无人胡牌。</p>
            </div>
          ) : (
            <div className="winner-summary-card winner-card">
              <h3>🏆 赢家：{state.winnerSeats.map(getSeatName).join(', ')}</h3>
              <p>胡牌方式：{winMethod === 'ziMo' ? '✨ 自摸' : `💥 点炮 (点炮人: ${getSeatName(loserSeat!)})`}</p>
            </div>
          )}

          {/* Score events list */}
          <div className="settlement-section">
            <h4>💰 积分变更明细</h4>
            <div className="score-events-list">
              {state.scoreEvents.map((evt, idx) => {
                const fromName = getPlayerNameById(evt.fromPlayerId);
                const toName = getPlayerNameById(evt.toPlayerId);
                return (
                  <div key={idx} className="score-event-item">
                    <span className="evt-desc">{evt.reason}</span>
                    <span className="evt-players">
                      {evt.fromPlayerId ? `${fromName} ➔ ` : ''}{toName}
                    </span>
                    <span className={`evt-points font-bold ${evt.score >= 0 ? 'text-green' : 'text-red'}`}>
                      {evt.score >= 0 ? `+${evt.score}` : evt.score} 分
                    </span>
                  </div>
                );
              })}
              {state.scoreEvents.length === 0 && (
                <div className="empty-section">暂无积分变动</div>
              )}
            </div>
          </div>

          {/* Bird tiles */}
          {state.birdTiles && state.birdTiles.length > 0 && (
            <div className="settlement-section">
              <h4>🦅 扎鸟结果</h4>
              <div className="bird-tiles-display">
                {state.birdTiles.map((bird, idx) => {
                  const info = getBirdHitInfo(bird);
                  return (
                    <div key={idx} className={`bird-tile-card ${info.hit ? 'bird-hit' : 'bird-miss'}`}>
                      <TileView tile={bird} disabled={true} />
                      <div className="bird-meta">
                        <span className="bird-target">中：{info.targetName}</span>
                        <span className={`bird-status ${info.hit ? 'status-hit' : 'status-miss'}`}>
                          {info.hit ? '🎯 中鸟双倍' : '❌ 未中'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hand reveal for all players */}
          <div className="settlement-section">
            <h4>🀄 各家收官手牌公开</h4>
            <div className="revealed-hands">
              {state.players.map(p => (
                <div key={p.seat} className="revealed-player-hand-row">
                  <div className="revealed-hand-meta">
                    <span className="player-title">{getPlayerHandTitle(p.seat)}</span>
                    <span className={`player-score-change ${p.score >= 0 ? 'text-win' : 'text-lose'}`}>
                      {p.score >= 0 ? `+${p.score}` : p.score} 分
                    </span>
                  </div>
                  <div className="revealed-hand-tiles">
                    {/* Melds */}
                    {p.melds.map((meld, mIdx) => (
                      <div key={`meld-${mIdx}`} className="revealed-meld">
                        {meld.tiles.map((t, tIdx) => (
                          <TileView key={`t-${tIdx}`} tile={t} disabled={true} />
                        ))}
                      </div>
                    ))}
                    {/* Remaining tiles in hand */}
                    <div className="revealed-concealed-hand">
                      {sortTiles(p.hand).map(t => (
                        <TileView key={t.instanceId} tile={t} disabled={true} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {onShowCoachReport && (
            <button className="close-btn" onClick={onShowCoachReport} style={{ marginRight: 'auto', background: 'rgba(241,196,15,0.2)', border: '1px solid var(--gold-accent)', color: 'var(--gold-accent)' }}>
              🎓 查看 AI 复盘
            </button>
          )}
          <button className="restart-btn restart-btn-primary" onClick={onRestart}>🀄 再来一局</button>
          <button className="close-btn" onClick={onClose}>关闭并查看桌面牌局</button>
        </div>
      </div>
    </div>
  );
}
