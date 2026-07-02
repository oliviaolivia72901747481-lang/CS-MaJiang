import React, { useState, useEffect } from 'react';
import { useMahjongGame } from '../hooks/useMahjongGame.js';
import { getPlayerDisplayState } from '../adapters/ui-game-adapter.js';
import { GameStatusBar } from './GameStatusBar.jsx';
import { GameTable } from './GameTable.jsx';
import { ActionPanel } from './ActionPanel.jsx';
import { GameLogPanel } from './GameLogPanel.jsx';
import { SettlementModal } from './SettlementModal.jsx';
import { RuleConfigPanel } from './RuleConfigPanel.jsx';
import { DebugPanel } from './DebugPanel.jsx';
import { LastActionToast } from './LastActionToast.jsx';
import { useMahjongCoach } from '../hooks/useMahjongCoach.js';
import { CoachPanel } from './CoachPanel.jsx';
import { ReplayReportModal } from './ReplayReportModal.jsx';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { PendingAction } from '../../changsha-mahjong/types/game.js';

export function MahjongGamePage() {
  const [aiProfiles, setAiProfiles] = useState<string[]>(['balanced', 'fastHu', 'bigHu', 'defensive']);
  const [customConfig, setCustomConfig] = useState<any>(null);
  const [modalClosed, setModalClosed] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const {
    state,
    selectedTileInstanceId,
    availableHumanActions,
    isWaitingForHumanUser,
    startNewRound,
    selectTile,
    discardSelectedTile,
    performHumanAction,
    resetGame,
  } = useMahjongGame(aiProfiles);

  const coach = useMahjongCoach();

  // Refresh coach advice on state change
  useEffect(() => {
    if (state && coach.coachEnabled) {
      coach.refreshAdvice(state);
    }
  }, [state, coach.coachEnabled, coach.refreshAdvice]);

  // Generate replay report on game end
  const isEnded = state ? (state.roundEnded || state.phase === 'ended' || state.phase === 'settlement') : false;
  useEffect(() => {
    if (state && isEnded) {
      coach.buildReport(state);
    }
  }, [isEnded, state]);

  const handleConfigChange = (newConfig: any) => {
    setCustomConfig(newConfig);
    handleResetGame();
  };

  const handleStartGame = () => {
    const seed = 'seed_' + Math.random().toString(36).substring(2, 9);
    setModalClosed(false);
    setReportModalOpen(false);
    coach.resetCoach();
    startNewRound(seed, customConfig);
  };

  const handleResetGame = () => {
    setModalClosed(false);
    setReportModalOpen(false);
    coach.resetCoach();
    resetGame();
  };

  const handleTileClick = (tile: Tile) => {
    if (selectedTileInstanceId === tile.instanceId && state) {
      // User is double-clicking to discard this tile
      coach.recordDecision({
        stateBefore: state,
        stateAfter: state,
        actualAction: 'discard',
        actualTileKey: `${tile.suit}_${tile.rank}`,
      });
    }
    selectTile(tile);
  };

  const handleDiscardSelectedTile = () => {
    if (!state || !selectedTileInstanceId) return;
    const player = state.players.find(p => p.seat === 0);
    if (!player) return;
    const tile = player.hand.find(t => t.instanceId === selectedTileInstanceId);
    if (!tile) return;

    coach.recordDecision({
      stateBefore: state,
      stateAfter: state,
      actualAction: 'discard',
      actualTileKey: `${tile.suit}_${tile.rank}`,
    });
    discardSelectedTile();
  };

  const handlePerformHumanAction = (action: PendingAction) => {
    if (state) {
      coach.recordDecision({
        stateBefore: state,
        stateAfter: state,
        actualAction: action.type,
        actualTileKey: action.tile ? `${action.tile.suit}_${action.tile.rank}` : undefined,
      });
    }
    performHumanAction(action);
  };

  // Convert engine state into display state
  const displayPlayers = state ? getPlayerDisplayState(state, 0) : [];
  const lastDiscardTileId = state?.lastDiscard?.tile?.instanceId;
  const canDiscard = state ? (state.phase === 'playing' && state.currentSeat === 0) : false;

  return (
    <div className="mahjong-app-container">
      <header className="app-header">
        <h1>🀄 长沙麻将单机陪练版 v0.6</h1>
        <p className="app-subtitle">人机对战训练模式 • AI 实时提示、危险牌分析与局后诊断复盘</p>
      </header>

      <main className="app-main">
        {/* Rule configuration at the start */}
        {!state && (
          <div className="start-screen-panel">
            <RuleConfigPanel onConfigChange={handleConfigChange} locked={false} />
            
            <div className="profile-selector">
              <h4>🤖 AI 对手性格配置</h4>
              <div className="profile-grid">
                {aiProfiles.map((p, idx) => (
                  <div key={idx} className="profile-slot">
                    <label htmlFor={`profile-${idx}`}>机器人 {idx}：</label>
                    <select
                      id={`profile-${idx}`}
                      value={p}
                      onChange={(e) => {
                        const next = [...aiProfiles];
                        next[idx] = e.target.value;
                        setAiProfiles(next);
                      }}
                    >
                      <option value="balanced">⚖️ 均衡型</option>
                      <option value="fastHu">🚀 快胡型</option>
                      <option value="bigHu">👑 大胡型</option>
                      <option value="defensive">🛡️ 防守型</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <button className="start-btn-primary" onClick={handleStartGame}>
              🀄 开始新局
            </button>
          </div>
        )}

        {state && (
          <div className="game-layout-wrapper">
            {/* Left Main Game Board */}
            <div className="active-game-board">
              {/* Topbar status */}
              <GameStatusBar
                currentSeat={state.currentSeat}
                wallCount={state.wall.length}
                dealerSeat={state.dealerSeat}
                phase={state.phase}
                isWaitingForHumanUser={isWaitingForHumanUser}
              />

              {/* Last action toast notifier */}
              <LastActionToast lastLog={state.logs.length > 0 ? state.logs[state.logs.length - 1] : undefined} />

              {/* Float review bar for game ended phase */}
              {isEnded && modalClosed && (
                <div className="review-game-bar">
                  <span className="review-text font-bold">🏁 本局对局已结束</span>
                  <div className="review-buttons">
                    <button className="review-btn btn-primary" onClick={() => setModalClosed(false)}>
                      🔍 查看结算详情
                    </button>
                    {coach.replayReport && (
                      <button className="review-btn btn-primary" onClick={() => setReportModalOpen(true)} style={{ background: '#f1c40f', color: '#111a14' }}>
                        🎓 查看 AI 复盘
                      </button>
                    )}
                    <button className="review-btn btn-secondary" onClick={handleStartGame}>
                      🀄 再来一局
                    </button>
                  </div>
                </div>
              )}

              {/* Main mahjong table */}
              <GameTable
                players={displayPlayers}
                currentSeat={state.currentSeat}
                wallCount={state.wall.length}
                dealerSeat={state.dealerSeat}
                phase={state.phase}
                isWaitingForHumanUser={isWaitingForHumanUser}
                selectedTileInstanceId={selectedTileInstanceId}
                onTileClick={handleTileClick}
                lastDiscardTileId={lastDiscardTileId}
                isEnded={isEnded}
              />

              {/* Rule panel locks dynamically during runtime */}
              <div className="runtime-config-container">
                <RuleConfigPanel locked={true} />
              </div>

              {/* Interaction console area */}
              <div className="interaction-console">
                {/* Human player actions */}
                <ActionPanel
                  actions={availableHumanActions}
                  onActionClick={handlePerformHumanAction}
                />

                {/* Human discard actions */}
                {canDiscard && (
                  <div className="discard-control-panel">
                    {selectedTileInstanceId ? (
                      <button className="discard-btn active animate-pulse-glow" onClick={handleDiscardSelectedTile}>
                        🀄 打出所选牌
                      </button>
                    ) : (
                      <div className="discard-prompt text-secondary">💡 请先点击下方您的手牌，然后在此处确认出牌</div>
                    )}
                  </div>
                )}
              </div>

              {/* Logs panel */}
              <GameLogPanel logs={state.logs} />

              {/* Dev Debug panels */}
              <DebugPanel state={state} />

              {/* Quit/Restart row */}
              <div className="game-utility-row">
                <button className="btn-utility btn-reset" onClick={handleResetGame}>
                  🚪 退出本局回到主菜单
                </button>
                <button className="btn-utility btn-restart" onClick={handleStartGame}>
                  🔄 重新开局
                </button>
              </div>
            </div>

            {/* Right Coach Sidebar Panel */}
            <div className="coach-sidebar">
              <CoachPanel
                state={state}
                handAdvice={coach.handAdvice}
                discardAdvices={coach.discardAdvices}
                actionAdvices={coach.actionAdvices}
                riskAdvices={coach.riskAdvices}
                coachEnabled={coach.coachEnabled}
                onToggleCoach={coach.toggleCoach}
                onSuggestionClick={(tileKey) => {
                  const player = state.players[0];
                  const tile = player.hand.find(t => `${t.suit}_${t.rank}` === tileKey);
                  if (tile) {
                    // Triggers the state selection
                    selectTile(tile);
                  }
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Settlement overlay */}
      {state && isEnded && !modalClosed && (
        <SettlementModal
          state={state}
          onRestart={handleStartGame}
          onClose={() => setModalClosed(true)}
          onShowCoachReport={() => setReportModalOpen(true)}
        />
      )}

      {/* Replay report overlay modal */}
      {reportModalOpen && coach.replayReport && (
        <ReplayReportModal
          report={coach.replayReport}
          onClose={() => setReportModalOpen(false)}
        />
      )}
    </div>
  );
}
