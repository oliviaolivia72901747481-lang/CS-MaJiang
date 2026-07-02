import React, { useState, useEffect } from 'react';
import { useOnlineMahjongGame, clearOnlineSession } from '../client/useOnlineMahjongGame.js';
import { OnlineGamePage } from './OnlineGamePage.jsx';
import { RoomJoinPanel } from './RoomJoinPanel.jsx';
import { JoinQRCode } from './JoinQRCode.jsx';
import { ConnectionDiagnosticPanel } from './ConnectionDiagnosticPanel.jsx';
import { LanConnectPanel } from './LanConnectPanel.jsx';
import { OnlineHelpPanel } from './OnlineHelpPanel.jsx';
import { buildJoinUrlCandidates, selectRecommendedJoinUrl } from '../client/lan-url-resolver.js';

export interface OnlineLobbyPageProps {
  onGamePageActiveChange?: (active: boolean) => void;
}

export function OnlineLobbyPage({ onGamePageActiveChange }: OnlineLobbyPageProps = {}) {
  const {
    connected,
    roomId,
    seat,
    view,
    error,
    actionPending,
    createRoom,
    joinRoom,
    fillAI,
    addAI,
    removeAI,
    fillSeatsWithAITo,
    startGame,
    discardTile,
    performAction,
    leaveRoom,
  } = useOnlineMahjongGame();

  const [nickName, setNickName] = useState(localStorage.getItem('online_player_name') || '');
  const [nickNameSubmitted, setNickNameSubmitted] = useState(!!localStorage.getItem('online_player_name'));
  const [lanIPs, setLanIPs] = useState<string[]>([]);
  const [frontendPort, setFrontendPort] = useState(5173);
  const [selectedHost, setSelectedHost] = useState('');
  const [autoJoinLastNickname, setAutoJoinLastNickname] = useState(true);

  // Fetch network info from server on startup
  useEffect(() => {
    const socketUrl = (import.meta as any).env?.VITE_SOCKET_URL || `${window.location.protocol}//${window.location.hostname}:3001`;
    fetch(`${socketUrl}/network-info`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.lanIPs) setLanIPs(data.lanIPs);
          if (data.frontendPort) setFrontendPort(data.frontendPort);
        }
      })
      .catch(() => {});
  }, []);

  // Determine URL candidates
  const candidates = buildJoinUrlCandidates({
    currentProtocol: typeof window !== 'undefined' ? window.location.protocol : 'http:',
    currentHostname: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
    frontendPort,
    roomId: roomId || '',
    lanIPs
  });

  // Select recommended host initially when candidates are loaded or roomId changes
  useEffect(() => {
    if (candidates.length > 0) {
      const rec = selectRecommendedJoinUrl(candidates);
      const currentIsLoopback = selectedHost === 'localhost' || selectedHost === '127.0.0.1' || selectedHost === '0.0.0.0' || selectedHost === '';
      if (currentIsLoopback && !rec.isLoopback) {
        setSelectedHost(rec.host);
      } else if (!selectedHost) {
        setSelectedHost(rec.host);
      }
    }
  }, [lanIPs, roomId]);

  // Handle auto-joining logic if nickname exists and roomId is in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoomId = params.get('roomId');
      const savedName = localStorage.getItem('online_player_name');
      if (urlRoomId && savedName && autoJoinLastNickname && !nickNameSubmitted) {
        setNickName(savedName);
        setNickNameSubmitted(true);
      }
    }
  }, []);

  // Auto join if roomId is in URL and nickname is already submitted
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoomId = params.get('roomId');
      const savedRoomId = localStorage.getItem('online_room_id');
      
      // If we are already connected to or synching with this room, don't join again
      if (urlRoomId && (urlRoomId === savedRoomId || urlRoomId === roomId)) {
        return;
      }

      if (urlRoomId && nickNameSubmitted && nickName.trim() && !roomId) {
        joinRoom(urlRoomId, nickName.trim());
      }
    }
  }, [nickNameSubmitted, roomId]);

  const handleSetNickname = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickName.trim()) {
      localStorage.setItem('online_player_name', nickName.trim());
      setNickNameSubmitted(true);
    }
  };

  const handleCreate = () => {
    if (actionPending) return;
    createRoom(nickName.trim());
  };

  const handleJoin = (targetRoomId: string) => {
    if (actionPending) return;
    joinRoom(targetRoomId, nickName.trim());
  };

  const handleExit = () => {
    if (confirm('确定退出房间吗？退出后座位会释放。')) {
      leaveRoom('user_leave').catch(() => {});
    }
  };

  const gameView = view && view.phase !== 'waiting' ? view : null;
  const gamePageActive = gameView !== null;

  useEffect(() => {
    onGamePageActiveChange?.(gamePageActive);
    return () => onGamePageActiveChange?.(false);
  }, [gamePageActive, onGamePageActiveChange]);

  // If game has started, render game board
  if (gamePageActive) {
    return (
      <OnlineGamePage 
        view={gameView}
        roomId={roomId}
        seat={seat}
        connected={connected}
        discardTile={discardTile}
        performAction={performAction}
        actionPending={actionPending}
        leaveRoom={leaveRoom}
      />
    );
  }

  const getParticipantStats = () => {
    let humans = 1; // self
    let ais = 0;
    const emptySeats: number[] = [];

    if (view && view.opponents) {
      view.opponents.forEach((opp: any) => {
        if (opp.playerName === '') {
          emptySeats.push(opp.seat);
        } else if (opp.isAI) {
          ais++;
        } else {
          humans++;
        }
      });
    }

    return {
      humans,
      ais,
      total: humans + ais,
      emptySeats
    };
  };

  const stats = getParticipantStats();

  const handleAddOneAI = () => {
    if (stats.emptySeats.length > 0) {
      addAI(stats.emptySeats[0] as 0 | 1 | 2 | 3);
    }
  };

  const nonLoopbackCandidate = candidates.find(c => !c.isLoopback && c.isLan);
  const selectedCandidate = (selectedHost && !['localhost', '127.0.0.1', '0.0.0.0'].includes(selectedHost))
    ? (candidates.find(c => c.host === selectedHost) || nonLoopbackCandidate || candidates[0])
    : (nonLoopbackCandidate || candidates[0]);
  const joinUrl = roomId && selectedCandidate ? selectedCandidate.url : '';

  return (
    <div className="mahjong-app-container" style={{ fontFamily: 'Outfit, sans-serif', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="app-header" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1>长沙麻将 🀄 多人联机大厅</h1>
        <p className="app-subtitle">
          服务器状态: {connected ? <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>● 已连接</span> : <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>● 断开连接，正在重连...</span>}
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(231, 76, 60, 0.2)',
          border: '1px solid #e74c3c',
          padding: '12px',
          borderRadius: '6px',
          color: '#f5b7b1',
          marginBottom: '20px',
          textAlign: 'center',
          fontWeight: 'bold',
          width: '100%',
          maxWidth: '500px',
          boxSizing: 'border-box'
        }}>
          ⚠️ {error}
        </div>
      )}

      {actionPending && (
        <div style={{
          background: 'rgba(241, 196, 15, 0.15)',
          border: '1px solid var(--gold-accent)',
          padding: '10px',
          borderRadius: '6px',
          color: '#fff',
          marginBottom: '20px',
          textAlign: 'center',
          fontSize: '0.95rem',
          width: '100%',
          maxWidth: '500px',
          boxSizing: 'border-box'
        }}>
          ⏳ 服务端处理中，请稍候...
        </div>
      )}


      {!nickNameSubmitted ? (
        <div className="start-screen-panel" style={{ maxWidth: '450px', width: '100%' }}>
          {(() => {
            const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const urlRoomId = params?.get('roomId');
            return (
              <>
                <h2 style={{ textAlign: 'center', color: '#f1c40f', marginBottom: '10px' }}>
                  {urlRoomId ? `加入房间 ${urlRoomId}` : '输入你的昵称'}
                </h2>
                {urlRoomId && (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
                    请输入昵称后加入房间
                  </div>
                )}
              </>
            );
          })()}
          <form onSubmit={handleSetNickname}>
            <input 
              type="text" 
              placeholder="请输入游戏昵称"
              value={nickName}
              onChange={(e) => setNickName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: '#1a2b21',
                color: '#fff',
                fontSize: '1.1rem',
                boxSizing: 'border-box',
                marginBottom: '12px',
              }}
              required
            />
            {localStorage.getItem('online_player_name') && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={autoJoinLastNickname} 
                  onChange={(e) => setAutoJoinLastNickname(e.target.checked)} 
                />
                自动加入上次使用的昵称
              </label>
            )}
            <button type="submit" className="start-btn-primary">进入大厅</button>
          </form>
        </div>
      ) : !roomId ? (
        <div className="start-screen-panel" style={{ maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
            <span style={{ fontSize: '1.1rem' }}>当前昵称: <strong>{nickName}</strong></span>
            <button 
              onClick={() => setNickNameSubmitted(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f1c40f',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              修改昵称
            </button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button 
              onClick={handleCreate} 
              className="start-btn-primary" 
              disabled={actionPending}
              style={{ margin: 0, width: '100%', opacity: actionPending ? 0.6 : 1 }}
            >
              创建新对局
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
            <span style={{ color: 'var(--text-secondary)' }}>或者</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          </div>

          <RoomJoinPanel onJoin={handleJoin} disabled={actionPending} />
        </div>
      ) : (
        <div className="start-screen-panel" style={{ maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minWidth: '0' }}>
            {/* Left Col: Seats and AI fill */}
            <div>
              <h3 style={{ color: 'var(--gold-accent)', marginTop: 0, marginBottom: '15px' }}>玩家座位</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {view && view.opponents && (
                  <>
                    {/* Self Seat */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(241, 196, 15, 0.1)',
                      border: '1px solid rgba(241, 196, 15, 0.3)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ background: 'var(--gold-accent)', color: '#111', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                          {seat}
                        </span>
                        <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{(view.self as any).playerName || nickName} (你)</span>
                      </div>
                      <span style={{ color: connected ? '#2ecc71' : '#e74c3c', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {connected ? '● 在线' : '● 离线'}
                      </span>
                    </div>

                    {/* Opponents Seats */}
                    {view.opponents.map((opp: any) => {
                      const hasPlayer = opp.playerName !== '';
                      return (
                        <div key={opp.seat} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: hasPlayer ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          padding: '10px 14px',
                          borderRadius: '8px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--text-primary)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                              {opp.seat}
                            </span>
                            <span style={{ fontSize: '0.95rem', color: hasPlayer ? 'var(--text-primary)' : 'rgba(255,255,255,0.3)' }}>
                              {hasPlayer ? opp.playerName : '等待加入...'}
                            </span>
                          </div>
                          
                          {hasPlayer ? (
                            opp.isAI ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: 'var(--gold-accent)', fontSize: '0.85rem', fontWeight: 'bold' }}>🤖 AI</span>
                                <button
                                  onClick={() => removeAI(opp.seat)}
                                  disabled={actionPending}
                                  style={{
                                    background: 'rgba(231, 76, 60, 0.15)',
                                    border: '1px solid #e74c3c',
                                    color: '#f5b7b1',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  移除机器人
                                </button>
                              </div>
                            ) : opp.connected ? (
                              <span style={{ color: '#2ecc71', fontSize: '0.85rem', fontWeight: 'bold' }}>● 在线</span>
                            ) : (
                              <span style={{ color: '#e74c3c', fontSize: '0.85rem', fontWeight: 'bold' }}>● 离线</span>
                            )
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>空席</span>
                              <button
                                onClick={() => addAI(opp.seat)}
                                disabled={actionPending}
                                style={{
                                  background: 'rgba(46, 204, 113, 0.15)',
                                  border: '1px solid #2ecc71',
                                  color: '#9febc6',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
                                添加机器人
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            {/* Right Col: QR Code */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <JoinQRCode roomId={roomId} joinUrl={joinUrl} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px', width: '100%' }}>
            {/* Participant stats display */}
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '4px' }}>
              当前状态: <strong style={{ color: '#fff' }}>{stats.humans} 真人 + {stats.ais} AI</strong> (共 {stats.total} 人)
            </div>

            {/* AI Control Buttons row */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={handleAddOneAI} 
                disabled={actionPending || stats.total >= 4}
                className="start-btn-primary" 
                style={{
                  margin: 0,
                  flex: 1,
                  minWidth: '120px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-primary)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: 'none',
                  opacity: (actionPending || stats.total >= 4) ? 0.5 : 1,
                  fontSize: '0.85rem',
                  padding: '8px 12px'
                }}
              >
                ➕ 添加 1 个机器人
              </button>
              
              <button 
                onClick={() => fillSeatsWithAITo(3)} 
                disabled={actionPending || stats.total >= 3}
                className="start-btn-primary" 
                style={{
                  margin: 0,
                  flex: 1,
                  minWidth: '90px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-primary)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: 'none',
                  opacity: (actionPending || stats.total >= 3) ? 0.5 : 1,
                  fontSize: '0.85rem',
                  padding: '8px 12px'
                }}
              >
                🤖 补到 3 人
              </button>

              <button 
                onClick={() => fillSeatsWithAITo(4)} 
                disabled={actionPending || stats.total >= 4}
                className="start-btn-primary" 
                style={{
                  margin: 0,
                  flex: 1,
                  minWidth: '90px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-primary)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: 'none',
                  opacity: (actionPending || stats.total >= 4) ? 0.5 : 1,
                  fontSize: '0.85rem',
                  padding: '8px 12px'
                }}
              >
                🤖 补到 4 人
              </button>
            </div>

            {/* Start Game Button row */}
            <div style={{ display: 'flex', marginTop: '5px' }}>
              <button 
                onClick={() => startGame({ requestedPlayerCount: stats.total as 2 | 3 | 4 })} 
                className="start-btn-primary" 
                disabled={actionPending || stats.total < 2}
                style={{ 
                  margin: 0, 
                  flex: 1, 
                  opacity: (actionPending || stats.total < 2) ? 0.6 : 1,
                  fontSize: '1rem',
                  padding: '12px'
                }}
              >
                {stats.total >= 2 ? `🎮 开始 ${stats.total} 人局` : '🎮 开始游戏 (请添加机器人或等待玩家)'}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <button 
              onClick={handleExit}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e74c3c',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              🚪 退出并解绑房间
            </button>
          </div>
        </div>
      )}

      {/* Connection and Diagnostic panels */}
      <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '600px', alignItems: 'center' }}>
        <LanConnectPanel candidates={candidates} selectedHost={selectedHost} onSelectHost={setSelectedHost} />
        <OnlineHelpPanel />
        <ConnectionDiagnosticPanel 
          connected={connected}
          roomId={roomId}
          seat={seat}
          socketId={undefined}
          lastError={error}
          serverUrl={undefined}
        />
      </div>
    </div>
  );
}
