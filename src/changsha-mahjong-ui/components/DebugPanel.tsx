import React, { useState } from 'react';
import { GameState } from '../types/ui-types.js';

export interface DebugPanelProps {
  state: GameState | null;
}

export function DebugPanel({ state }: DebugPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (!state) {
    return (
      <div className="debug-panel collapsed">
        <div className="panel-header">
          <span className="panel-title">🛠️ 调试面板 (未开局)</span>
        </div>
      </div>
    );
  }

  // Calculate conservation stats
  const hands = state.players.reduce((sum, p) => sum + p.hand.length, 0);
  const melds = state.players.reduce((sum, p) => sum + p.melds.reduce((mSum, m) => mSum + m.tiles.length, 0), 0);
  const discards = Object.values(state.discards).reduce((sum, d) => sum + d.length, 0);
  const wall = state.wall.length;
  const birds = state.birdTiles ? state.birdTiles.length : 0;
  const total = hands + melds + discards + wall + birds;

  const isConserved = total === 108;

  return (
    <div className={`debug-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="panel-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span className="panel-title">🛠️ 调试及状态审计面板</span>
        <button className="collapse-btn">{isCollapsed ? '展开' : '折叠'}</button>
      </div>

      {!isCollapsed && (
        <div className="panel-body">
          <div className="debug-grid">
            <div className="debug-section">
              <h5>对局周期状态</h5>
              <ul>
                <li><strong>当前 Phase:</strong> {state.phase}</li>
                <li><strong>当前 Seat:</strong> {state.currentSeat}</li>
                <li><strong>庄家 Seat:</strong> {state.dealerSeat}</li>
                <li><strong>流局标识:</strong> {state.roundEnded ? 'True' : 'False'}</li>
                <li><strong>海底玩家:</strong> {state.phase === 'haiDi' ? state.currentSeat : 'None'}</li>
              </ul>
            </div>

            <div className="debug-section">
              <h5>牌数守恒审计 (108张)</h5>
              <ul>
                <li><strong>总和:</strong> <span className={isConserved ? 'text-green font-bold' : 'text-red font-bold'}>{total} 张</span> {isConserved ? '✅' : '❌'}</li>
                <li><strong>手牌总数:</strong> {hands} 张</li>
                <li><strong>副露总数:</strong> {melds} 张</li>
                <li><strong>牌河总数:</strong> {discards} 张</li>
                <li><strong>牌墙剩余:</strong> {wall} 张</li>
                <li><strong>中鸟牌数:</strong> {birds} 张</li>
              </ul>
            </div>

            <div className="debug-section">
              <h5>玩家具体数据</h5>
              <table className="debug-table">
                <thead>
                  <tr>
                    <th>座位</th>
                    <th>手牌数</th>
                    <th>副露数</th>
                    <th>弃牌数</th>
                    <th>积分</th>
                  </tr>
                </thead>
                <tbody>
                  {state.players.map(p => (
                    <tr key={p.seat}>
                      <td>{p.seat === 0 ? '我' : `AI ${p.seat}`}</td>
                      <td>{p.hand.length}</td>
                      <td>{p.melds.length}</td>
                      <td>{state.discards[p.seat]?.length || 0}</td>
                      <td>{p.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="debug-section span-all">
              <h5>等待响应动作 (pendingActions)</h5>
              <pre className="debug-json">
                {JSON.stringify(
                  state.pendingActions.map(pa => ({
                    seat: pa.seat,
                    type: pa.type,
                    priority: pa.priority,
                    tile: pa.tile ? `${pa.tile.rank}${pa.tile.suit[0]}` : undefined,
                  })), 
                  null, 
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
