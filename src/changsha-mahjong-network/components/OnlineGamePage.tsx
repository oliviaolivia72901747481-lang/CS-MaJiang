import React, { useState, useEffect } from 'react';
import { PlayerVisibleView, NetworkPlayerAction } from '../server/network-types.js';
import { TileView } from './TileView.jsx';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { sortTiles } from '../../changsha-mahjong/engine/tile-engine.js';
import { formatLog } from '../../changsha-mahjong/controller/game-log.js';
import { RoomStatusPanel } from './RoomStatusPanel.jsx';
import { PlayerConnectionStatus } from './PlayerConnectionStatus.jsx';
import { clearOnlineSession } from '../client/useOnlineMahjongGame.js';
import { MobileOnlineGameLayout } from './MobileOnlineGameLayout.jsx';
import { MobileDiscardHistoryDrawer } from './MobileDiscardHistoryDrawer.jsx';
import { ActionSourceTileBanner } from './ActionSourceTileBanner.jsx';
import { ActionCandidatePanel } from './ActionCandidatePanel.jsx';
import { buildActionHighlightModel } from '../utils/action-highlight-utils.js';
import { 
  getLatestDiscardEvent, 
  getActionSourceEvent,
  getPlayerLabelBySeat,
  getPlayerDiscardsBySeat
} from '../utils/latest-discard-helper.js';
import '../styles/online-mobile.css';

interface OnlineGamePageProps {
  view: PlayerVisibleView;
  roomId?: string;
  seat?: 0 | 1 | 2 | 3;
  connected: boolean;
  discardTile: (tileInstanceId: string) => void;
  performAction: (action: NetworkPlayerAction) => void;
  actionPending: boolean;
  leaveRoom?: (reason?: 'user_leave' | 'back_to_lobby') => Promise<void>;
}

export interface TablePlayerSeat {
  seat: 0 | 1 | 2 | 3;
  playerName: string;
  connected: boolean;
  isAI: boolean;
  handCount: number;
  hand?: Tile[];
  melds: any[];
  discards: Tile[];
  score: number;
  connectionState?: string;
}

export function OnlineGamePage({
  view,
  roomId,
  seat,
  connected,
  discardTile,
  performAction,
  actionPending,
  leaveRoom,
}: OnlineGamePageProps) {
  const [selectedChiIndex, setSelectedChiIndex] = useState<number | null>(null);
  const [selectedGangIndex, setSelectedGangIndex] = useState<number | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [hoveredChiIndex, setHoveredChiIndex] = useState<number | null>(null);
  const [hoveredGangIndex, setHoveredGangIndex] = useState<number | null>(null);
  const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(null);
  const [historyPlayerSeat, setHistoryPlayerSeat] = useState<0 | 1 | 2 | 3 | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  if (seat === undefined) return null;

  if (isMobile) {
    return (
      <MobileOnlineGameLayout 
        view={view}
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

  const isMyTurnToDiscard = view.phase === 'playing' && view.currentSeat === seat;

  const getPlayerAtSeat = (s: number): TablePlayerSeat => {
    if (s === seat) {
      return {
        seat: seat,
        playerName: view.self.playerName || '你',
        connected: connected,
        isAI: false,
        handCount: view.self.hand.length,
        hand: view.self.hand,
        melds: view.self.melds,
        discards: view.self.discards,
        score: view.self.score,
        connectionState: (view.self as any).connectionState || 'online',
      };
    }
    const opp = view.opponents.find(o => o.seat === s);
    return {
      seat: s as 0 | 1 | 2 | 3,
      playerName: opp?.playerName || `玩家 ${s}`,
      connected: opp?.connected ?? false,
      isAI: opp?.isAI ?? true,
      handCount: opp?.handCount ?? 0,
      hand: opp?.hand,
      melds: opp?.melds || [],
      discards: opp?.discards || [],
      score: opp?.score ?? 1000,
      connectionState: opp ? (opp as any).connectionState : 'offline',
    };
  };

  const pBottom = getPlayerAtSeat(seat);
  const pRight = getPlayerAtSeat(((seat + 1) % 4) as 0 | 1 | 2 | 3);
  const pTop = getPlayerAtSeat(((seat + 2) % 4) as 0 | 1 | 2 | 3);
  const pLeft = getPlayerAtSeat(((seat + 3) % 4) as 0 | 1 | 2 | 3);

  const getTileKey = (t: Tile) => `${t.suit}_${t.rank}`;

  // Find standard action types
  const passAction = view.pendingActions.find(a => a.type === 'pass');
  const huAction = view.pendingActions.find(a => a.type === 'hu' || a.type === 'ziMo');
  const pengAction = view.pendingActions.find(a => a.type === 'peng');
  const chiAction = view.pendingActions.find(a => a.type === 'chi');
  const gangAction = view.pendingActions.find(a => a.type === 'anGang' || a.type === 'mingGang' || a.type === 'buGang');

  // Compute unified action highlights
  const highlightModel = buildActionHighlightModel(view, seat);
  const actionSourceEvent = highlightModel.sourceEvent;
  const sourceTile = actionSourceEvent ? actionSourceEvent.tile : null;

  // Card highlight computation for player's hand
  const getHandTileHighlight = (t: Tile) => {
    // If hovering a specific candidate, only highlight its handTiles
    if (hoveredCandidateId) {
      const activeCand = highlightModel.candidateGroups.find(c => c.id === hoveredCandidateId);
      if (activeCand && activeCand.handTiles.some(ht => ht.suit === t.suit && ht.rank === t.rank)) {
        return activeCand.actionType === 'chi' ? 'chi' : (activeCand.actionType === 'peng' ? 'peng' : 'hand-participant');
      }
      return undefined;
    }

    // Default: soft highlight all hand tiles that participate in ANY of the pending actions
    const tileKey = `${t.suit}_${t.rank}`;
    const isPart = highlightModel.highlightedHandTileKeys.includes(tileKey) || 
                  (t.instanceId && highlightModel.highlightedHandTileKeys.includes(t.instanceId));
    if (isPart) {
      const matchedCand = highlightModel.candidateGroups.find(c => c.handTiles.some(ht => ht.suit === t.suit && ht.rank === t.rank));
      if (matchedCand) {
        if (matchedCand.actionType === 'chi') return 'chi';
        if (matchedCand.actionType === 'peng') return 'peng';
        if (matchedCand.actionType === 'anGang' || matchedCand.actionType === 'mingGang' || matchedCand.actionType === 'buGang') return 'gang';
      }
      return 'hand-participant';
    }

    return undefined;
  };

  // Render Exposed Melds with color borders, labels, and anGang privacy
  const renderExposedMelds = (melds: any[], isMe: boolean) => {
    if (!melds || melds.length === 0) return null;
    return (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {melds.map((m, idx) => {
          const meldType = m.type;
          const labelMap: Record<string, string> = {
            chi: '吃',
            peng: '碰',
            mingGang: '明杠',
            buGang: '补杠',
            anGang: '暗杠'
          };
          const label = labelMap[meldType] || meldType;

          const isLatest = idx === melds.length - 1;
          const containerClass = `exposed-meld-container meld-${meldType} ${isLatest ? 'meld-newly-formed' : ''}`;

          return (
            <div key={idx} className={containerClass}>
              <span className={`meld-label-badge ${meldType} meld-type-label`}>{label}</span>
              <div className="exposed-meld-tiles">
                {m.tiles.map((t: Tile, tIdx: number) => {
                  const isAnGang = meldType === 'anGang';
                  const hidden = isAnGang && !isMe && tIdx >= 1 && tIdx <= 2;
                  return (
                    <TileView key={t.instanceId || tIdx} tile={t} hidden={hidden} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Unified Center Discard Area
  const renderCenterDiscardArea = (latestTile: Tile | undefined) => {
    const activeSeatsList = [seat, ...view.opponents.map(o => o.seat)].sort((a, b) => a - b) as Array<0|1|2|3>;

    return (
      <div className="center-discard-area">
        {activeSeatsList.map(s => {
          const isMe = s === seat;
          const player = getPlayerAtSeat(s);
          const isCurrent = view.currentSeat === s;
          const displayName = isMe ? '我' : player.playerName;

          const discards = player.discards || [];
          const reversedDiscards = [...discards].reverse();
          const visibleDiscards = reversedDiscards.slice(0, 12);
          const hiddenCount = discards.length - 12;

          return (
            <div 
              key={s} 
              className="center-discard-row" 
              style={{ cursor: 'pointer', padding: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.01)', transition: 'background 0.2s' }}
              onClick={() => {
                setHistoryPlayerSeat(s);
                setHistoryDrawerOpen(true);
              }}
            >
              <span className={`center-discard-label ${isCurrent ? 'active' : ''}`} style={{ minWidth: '48px' }}>
                {displayName}:
              </span>
              <div className="center-discard-river" style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                {visibleDiscards.map((t: Tile, idx: number) => {
                  const isLatest = latestTile && t.instanceId === latestTile.instanceId;
                  const isSource = sourceTile !== null && t.instanceId === sourceTile.instanceId;
                  return (
                    <TileView 
                      key={t.instanceId || idx} 
                      tile={t} 
                      highlightType={isSource ? 'source' : (isLatest ? 'latest' : undefined)}
                      isLatestDiscard={!!isLatest}
                    />
                  );
                })}
                {hiddenCount > 0 && (
                  <button
                    data-testid={`history-badge-btn-${s}`}
                    style={{
                      background: 'rgba(241,196,15,0.18)',
                      border: '1px solid var(--gold-accent)',
                      color: 'var(--gold-accent)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '0.62rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginLeft: '4px'
                    }}
                  >
                    +{hiddenCount} 历史
                  </button>
                )}
                {discards.length === 0 && (
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.18)', fontStyle: 'italic', marginLeft: '4px' }}>
                    未出牌
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleChiClick = () => {
    if (actionPending) return;
    if (!chiAction || !chiAction.options) return;
    if (chiAction.options.length === 1) {
      const opt = chiAction.options[0];
      const optionId = opt.map(getTileKey).sort().join(',');
      performAction({ type: 'chi', optionId });
    } else {
      setSelectedChiIndex(selectedChiIndex === null ? 0 : null);
    }
  };

  const handleGangClick = () => {
    if (actionPending) return;
    if (!gangAction) return;

    if (gangAction.type === 'buGang' && gangAction.tile) {
      const tileKey = getTileKey(gangAction.tile);
      performAction({ type: 'gang', gangType: 'buGang', tileKey });
      return;
    }

    if (gangAction.options && gangAction.options.length === 1) {
      const opt = gangAction.options[0];
      const firstTile = Array.isArray(opt) ? opt[0] : opt;
      const tileKey = typeof firstTile === 'string' ? firstTile : getTileKey(firstTile as Tile);
      performAction({ type: 'gang', gangType: gangAction.type, tileKey });
    } else if (gangAction.options && gangAction.options.length > 1) {
      setSelectedGangIndex(selectedGangIndex === null ? 0 : null);
    } else if (gangAction.tile) {
      performAction({ type: 'gang', gangType: gangAction.type, tileKey: getTileKey(gangAction.tile) });
    }
  };

  useEffect(() => {
    if (!isMyTurnToDiscard) {
      setSelectedTileId(null);
    }
  }, [isMyTurnToDiscard]);

  const handleDiscardClick = (tileInstanceId: string) => {
    if (actionPending || !isMyTurnToDiscard) return;
    if (selectedTileId === tileInstanceId) {
      discardTile(tileInstanceId);
      setSelectedTileId(null);
    } else {
      setSelectedTileId(tileInstanceId);
    }
  };

  const handleExitGame = () => {
    const isSettlement = view.phase === 'settlement' || view.phase === 'ended';
    const msg = isSettlement 
      ? '确定离开结算页面吗？' 
      : '对局已开始，退出后将由 AI 托管，是否确认？';
    if (confirm(msg)) {
      if (leaveRoom) {
        leaveRoom('user_leave').catch(() => {});
      } else {
        clearOnlineSession();
        window.location.reload();
      }
    }
  };

  const getSortedBottomHand = () => {
    const hand = pBottom.hand;
    if (!hand || hand.length === 0) return [];
    const hasDrawnTile = hand.length % 3 === 2;
    if (hasDrawnTile) {
      const mainHand = hand.slice(0, hand.length - 1);
      const sortedMain = sortTiles(mainHand);
      return [...sortedMain, hand[hand.length - 1]];
    }
    return sortTiles(hand);
  };
  const sortedBottomHand = getSortedBottomHand();

  const getCompressedLogText = (log: any) => {
    const formatted = formatLog(log);
    if (formatted.includes('[Advanced') || formatted.includes('[Basic')) {
      const colonIndex = formatted.indexOf('：[');
      if (colonIndex !== -1) {
        return formatted.substring(0, colonIndex) + ' (AI决策)';
      }
    }
    return formatted;
  };

  const latestDiscardEvent = getLatestDiscardEvent(view, seat);
  const desktopLatestTile = latestDiscardEvent && latestDiscardEvent.stillInRiver ? latestDiscardEvent.tile : undefined;

  const latestLog = view.logs.length > 0 ? view.logs[view.logs.length - 1] : null;

  return (
    <div className="desktop-game-page" style={{ fontFamily: 'Outfit, sans-serif' }}>
      
      {/* 1. Header Status Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <RoomStatusPanel 
          roomId={roomId || ''}
          wallRemainingCount={view.wallRemainingCount}
          connected={connected}
          dealerSeat={view.dealerSeat}
          phase={view.phase}
          onExit={handleExitGame}
        />
        {actionPending && (
          <div style={{
            background: 'rgba(241, 196, 15, 0.15)',
            border: '1px solid var(--gold-accent)',
            padding: '6px',
            borderRadius: '6px',
            color: '#fff',
            textAlign: 'center',
            fontSize: '0.85rem',
          }}>
            ⏳ 正在同步动作至服务器，请勿重复点击...
          </div>
        )}
      </div>
 
      {/* 2. Main Game Table Area (Height constrained) */}
      <div className="desktop-main-layout">
        
        {/* Game Board Grid (Hides inactive seats automatically) */}
        <div className="desktop-board-container">
          
          {/* Top Seat (Opponent 2) - Hidden if inactive */}
          {view.opponents.some(o => o.seat === pTop.seat) && (
            <div style={{ gridRow: '1', gridColumn: '2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
              <div style={{ marginBottom: '4px' }}>
                <PlayerConnectionStatus 
                  playerName={pTop.playerName}
                  connected={pTop.connected}
                  isAI={pTop.isAI}
                  seat={pTop.seat}
                  isCurrentTurn={view.currentSeat === pTop.seat}
                  score={pTop.score}
                  connectionState={pTop.connectionState}
                />
              </div>
              {renderExposedMelds(pTop.melds, false)}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <TileView hidden />
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--gold-accent)', whiteSpace: 'nowrap' }}>
                  x{pTop.handCount}
                </span>
              </div>
            </div>
          )}
 
          {/* Left Seat (Opponent 3) - Hidden if inactive */}
          {view.opponents.some(o => o.seat === pLeft.seat) && (
            <div style={{ gridRow: '2', gridColumn: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
              <div style={{ marginBottom: '4px' }}>
                <PlayerConnectionStatus 
                  playerName={pLeft.playerName}
                  connected={pLeft.connected}
                  isAI={pLeft.isAI}
                  seat={pLeft.seat}
                  isCurrentTurn={view.currentSeat === pLeft.seat}
                  score={pLeft.score}
                  connectionState={pLeft.connectionState}
                />
              </div>
              {renderExposedMelds(pLeft.melds, false)}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <TileView hidden />
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--gold-accent)', whiteSpace: 'nowrap' }}>
                  x{pLeft.handCount}
                </span>
              </div>
            </div>
          )}
 
          {/* Center Info & Unified Discard Panel */}
          <div className="desktop-center-panel">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <div style={{ fontSize: '1.1rem', color: 'var(--gold-accent)', fontWeight: 'bold', textAlign: 'center' }}>
                {view.phase === 'playing' ? `当前出牌: 玩家 ${view.currentSeat}` : `对局状态: ${view.phase}`}
              </div>
              {isMyTurnToDiscard && (
                <div style={{ background: 'rgba(241,196,15,0.15)', border: '1px solid var(--gold-accent)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center', color: '#fff' }}>
                  到你的回合，请点击手牌出牌！
                </div>
              )}
            </div>

            {/* Spotlight on the globally latest discard */}
            {latestDiscardEvent && latestDiscardEvent.stillInRiver && (
              <div 
                data-testid="latest-discard-spotlight"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  background: 'rgba(241, 196, 15, 0.08)', 
                  border: '1px solid rgba(241, 196, 15, 0.3)', 
                  borderRadius: '8px', 
                  padding: '4px 12px',
                  margin: '4px auto',
                  width: 'fit-content'
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--gold-accent)', fontWeight: 'bold' }}>
                  📢 最新出牌: {latestDiscardEvent.playerLabel} 打出
                </span>
                <div className="mobile-latest-discard" style={{ display: 'inline-block' }}>
                  <TileView tile={latestDiscardEvent.tile} highlightType="latest" isLatestDiscard />
                </div>
              </div>
            )}

            {/* Unified center discard rivers for active seats */}
            {renderCenterDiscardArea(desktopLatestTile)}
          </div>
 
          {/* Right Seat (Opponent 1) - Hidden if inactive */}
          {view.opponents.some(o => o.seat === pRight.seat) && (
            <div style={{ gridRow: '2', gridColumn: '3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
              <div style={{ marginBottom: '4px' }}>
                <PlayerConnectionStatus 
                  playerName={pRight.playerName}
                  connected={pRight.connected}
                  isAI={pRight.isAI}
                  seat={pRight.seat}
                  isCurrentTurn={view.currentSeat === pRight.seat}
                  score={pRight.score}
                  connectionState={pRight.connectionState}
                />
              </div>
              {renderExposedMelds(pRight.melds, false)}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <TileView hidden />
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--gold-accent)', whiteSpace: 'nowrap' }}>
                  x{pRight.handCount}
                </span>
              </div>
            </div>
          )}
 
          {/* Bottom Seat (Client Player) */}
          <div style={{ gridRow: '3', gridColumn: '2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
            {renderExposedMelds(pBottom.melds, true)}
            
            {/* Player Hand rendering */}
            <div className="player-hand-tiles" style={{ display: 'flex', gap: '4px', marginTop: '6px', position: 'relative', flexWrap: 'wrap', justifyContent: 'center' }}>
              
              {/* Chi Options Dropdown Overlay */}
              {selectedChiIndex !== null && chiAction && chiAction.options && (
                <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', background: '#111a14', border: '2px solid var(--gold-accent)', borderRadius: '8px', padding: '8px', zIndex: 10, display: 'flex', gap: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
                  {chiAction.options.map((opt: Tile[], idx: number) => {
                    const optId = opt.map(getTileKey).sort().join(',');
                    return (
                      <button 
                        key={idx}
                        disabled={actionPending}
                        onClick={() => {
                          performAction({ type: 'chi', optionId: optId });
                          setSelectedChiIndex(null);
                          setHoveredChiIndex(null);
                        }}
                        onMouseEnter={() => setHoveredChiIndex(idx)}
                        onMouseLeave={() => setHoveredChiIndex(null)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', cursor: 'pointer', display: 'flex', gap: '2px', opacity: actionPending ? 0.6 : 1 }}
                      >
                        {opt.map((t: Tile, tIdx: number) => (
                          <TileView key={tIdx} tile={t} />
                        ))}
                      </button>
                    );
                  })}
                </div>
              )}
 
              {/* Gang Options Dropdown Overlay */}
              {selectedGangIndex !== null && gangAction && gangAction.options && (
                <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', background: '#111a14', border: '2px solid var(--gold-accent)', borderRadius: '8px', padding: '8px', zIndex: 10, display: 'flex', gap: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
                  {gangAction.options.map((opt: any, idx: number) => {
                    const tileKey = typeof opt === 'string' ? opt : getTileKey(opt[0]);
                    return (
                      <button 
                        key={idx}
                        disabled={actionPending}
                        onClick={() => {
                          performAction({ type: 'gang', gangType: gangAction.type, tileKey });
                          setSelectedGangIndex(null);
                          setHoveredGangIndex(null);
                        }}
                        onMouseEnter={() => setHoveredGangIndex(idx)}
                        onMouseLeave={() => setHoveredGangIndex(null)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', color: '#fff', fontWeight: 'bold', opacity: actionPending ? 0.6 : 1 }}
                      >
                        杠 {tileKey}
                      </button>
                    );
                  })}
                </div>
              )}
 
              {/* Hand Tiles with Highlighting */}
              {sortedBottomHand && sortedBottomHand.map((t: Tile) => {
                const canClick = isMyTurnToDiscard && !actionPending;
                const highlight = getHandTileHighlight(t);
                return (
                  <TileView 
                    key={t.instanceId} 
                    tile={t} 
                    onClick={canClick ? () => handleDiscardClick(t.instanceId) : undefined}
                    disabled={!canClick}
                    selected={selectedTileId === t.instanceId}
                    highlightType={highlight}
                  />
                );
              })}
            </div>
 
            <div style={{ marginTop: '6px' }}>
              <PlayerConnectionStatus 
                playerName={pBottom.playerName}
                connected={pBottom.connected}
                isAI={pBottom.isAI}
                seat={pBottom.seat}
                isCurrentTurn={view.currentSeat === pBottom.seat}
                score={pBottom.score}
                connectionState={pBottom.connectionState}
              />
            </div>
          </div>
        </div>
 
        {/* 3. Right Sidebar Logs Panel (Scrollable internally) */}
        <div className="desktop-logs-sidebar">
          <h3 style={{ margin: '0 0 8px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', color: 'var(--gold-accent)', fontSize: '0.95rem' }}>
            对局日志
          </h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.82rem' }}>
            {view.logs.slice(-50).map((log, idx) => (
              <div key={idx} title={formatLog(log)} style={{ padding: '3px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.02)', borderLeft: log.seat !== undefined ? '3px solid var(--gold-accent)' : '3px solid rgba(255,255,255,0.1)', cursor: 'help' }}>
                {getCompressedLogText(log)}
              </div>
            ))}
          </div>
        </div>
      </div>
 
      {/* 4. Action Panel Overlay */}
      {view.pendingActions.length > 0 && (
        <div style={{ position: 'fixed', bottom: '150px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 100 }}>
          <ActionSourceTileBanner sourceEvent={highlightModel.sourceEvent} />
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <ActionCandidatePanel
              candidates={highlightModel.candidateGroups}
              actionPending={actionPending}
              onSelect={(payload) => performAction(payload)}
              hoveredCandidateId={hoveredCandidateId}
              onHoverCandidate={setHoveredCandidateId}
            />
            {passAction && (
              <button 
                disabled={actionPending}
                onClick={() => performAction({ type: 'pass' })}
                style={{ padding: '8px 20px', fontSize: '1rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px', cursor: 'pointer', opacity: actionPending ? 0.6 : 1 }}
              >
                过
              </button>
            )}
          </div>
        </div>
      )}
 
      {/* 5. Settlement Overlay */}
      {view.settlement && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div style={{ background: '#111a14', border: '2px solid var(--gold-accent)', borderRadius: '16px', padding: '25px', width: '500px', boxShadow: '0 8px 32px rgba(0,0,0,0.9)', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--gold-accent)', fontSize: '1.8rem', margin: '0 0 8px 0' }}>对局结算</h2>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '0.9rem' }}>
              赢家座位: {view.settlement.winnerSeats.length > 0 ? view.settlement.winnerSeats.join(', ') : '流局'}
            </div>
 
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {[0, 1, 2, 3].map(s => {
                const isWinner = view.settlement?.winnerSeats.includes(s as any);
                const delta = view.settlement?.scoreDeltas[s as 0 | 1 | 2 | 3] ?? 0;
                const opp = getPlayerAtSeat(s);
                const pName = s === seat ? '你' : opp.playerName;
                const pHands = opp.hand || [];
                
                // Do not render inactive seats in settlement
                const isActive = s === seat || view.opponents.some(o => o.seat === s);
                if (!isActive) return null;

                return (
                  <div key={s} style={{ display: 'flex', flexDirection: 'column', background: isWinner ? 'rgba(241,196,15,0.08)' : 'rgba(255,255,255,0.02)', border: isWinner ? '1px solid rgba(241,196,15,0.3)' : '1px solid rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.88rem' }}>
                      <span>{pName} (座位 {s})</span>
                      <span style={{ color: delta >= 0 ? '#2ecc71' : '#ff4d4d' }}>
                        {delta >= 0 ? `+${delta}` : delta} 分
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {sortTiles(pHands).map((t: Tile, idx: number) => (
                        <TileView key={idx} tile={t} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
 
            <button 
              onClick={handleExitGame}
              style={{ padding: '10px 24px', fontSize: '1rem', fontWeight: 'bold', background: 'linear-gradient(135deg, var(--gold-accent) 0%, #d4ac0d 100%)', color: '#111', border: 'none', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(241,196,15,0.4)' }}
            >
              返回联机大厅
            </button>
          </div>
        </div>
      )}

      {/* 6. Discard History Popover/Drawer Overlay */}
      {historyDrawerOpen && historyPlayerSeat !== null && (
        <MobileDiscardHistoryDrawer 
          isOpen={historyDrawerOpen}
          onClose={() => setHistoryDrawerOpen(false)}
          discards={getPlayerAtSeat(historyPlayerSeat).discards || []}
          playerName={historyPlayerSeat === seat ? '我' : getPlayerAtSeat(historyPlayerSeat).playerName}
          isMe={historyPlayerSeat === seat}
        />
      )}
    </div>
  );
}
