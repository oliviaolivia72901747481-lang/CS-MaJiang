import React, { useState } from 'react';
import { PlayerVisibleView, NetworkPlayerAction } from '../server/network-types.js';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { TileView } from './TileView.jsx';
import { MobilePlayerHand } from './MobilePlayerHand.jsx';
import { MobileActionBar } from './MobileActionBar.jsx';
import { MobileOpponentStrip } from './MobileOpponentStrip.jsx';
import { MobileGameLogDrawer } from './MobileGameLogDrawer.jsx';
import { SettlementModal } from './SettlementModal.jsx';
import { CurrentTurnBanner } from './CurrentTurnBanner.jsx';
import { RecentActionToast } from './RecentActionToast.jsx';
import { ConnectionDiagnosticPanel } from './ConnectionDiagnosticPanel.jsx';
import { OnlineHelpPanel } from './OnlineHelpPanel.jsx';
import { MobileMeldArea } from './MobileMeldArea.jsx';
import { MobileCenterDiscardArea, DiscardPlayerEntry } from './MobileCenterDiscardArea.jsx';
import { MobileLatestDiscardDock, LatestDiscardPlayer } from './MobileLatestDiscardDock.jsx';
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

export interface MobileOnlineGameLayoutProps {
  view: PlayerVisibleView;
  roomId?: string;
  seat?: 0 | 1 | 2 | 3;
  connected: boolean;
  discardTile: (tileInstanceId: string) => void;
  performAction: (action: NetworkPlayerAction) => void;
  actionPending: boolean;
  leaveRoom?: (reason?: 'user_leave' | 'back_to_lobby') => Promise<void>;
}

interface TablePlayerSeat {
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

export function MobileOnlineGameLayout({
  view,
  roomId,
  seat,
  connected,
  discardTile,
  performAction,
  actionPending,
  leaveRoom,
}: MobileOnlineGameLayoutProps) {
  const [selectedChiIndex, setSelectedChiIndex] = useState<number | null>(null);
  const [selectedGangIndex, setSelectedGangIndex] = useState<number | null>(null);
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyPlayerSeat, setHistoryPlayerSeat] = useState<0 | 1 | 2 | 3>(0);

  if (seat === undefined) return null;

  const isMyTurnToDiscard = view.phase === 'playing' && view.currentSeat === seat;

  React.useEffect(() => {
    if (!isMyTurnToDiscard) {
      setSelectedTileId(null);
    }
  }, [isMyTurnToDiscard]);

  const handleTileClick = (tileInstanceId: string) => {
    if (actionPending || !isMyTurnToDiscard) return;
    if (selectedTileId === tileInstanceId) {
      discardTile(tileInstanceId);
      setSelectedTileId(null);
    } else {
      setSelectedTileId(tileInstanceId);
    }
  };

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

  // Pending Actions mapping
  const passAction = view.pendingActions.find(a => a.type === 'pass');
  const huAction = view.pendingActions.find(a => a.type === 'hu' || a.type === 'ziMo');
  const pengAction = view.pendingActions.find(a => a.type === 'peng');
  const chiAction = view.pendingActions.find(a => a.type === 'chi');
  const gangAction = view.pendingActions.find(a => a.type === 'anGang' || a.type === 'mingGang' || a.type === 'buGang');

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

    // buGang: the tile to gang is in gangAction.tile, no options array
    if (gangAction.type === 'buGang' && gangAction.tile) {
      const tileKey = getTileKey(gangAction.tile);
      performAction({ type: 'gang', gangType: 'buGang', tileKey });
      return;
    }

    // anGang or mingGang with options
    if (gangAction.options && gangAction.options.length === 1) {
      const opt = gangAction.options[0];
      // anGang options are Tile[][] (array of 4-tile groups); mingGang options may differ
      const firstTile = Array.isArray(opt) ? opt[0] : opt;
      const tileKey = typeof firstTile === 'string' ? firstTile : getTileKey(firstTile as Tile);
      performAction({ type: 'gang', gangType: gangAction.type, tileKey });
    } else if (gangAction.options && gangAction.options.length > 1) {
      // Multiple gang options – show selection overlay
      setSelectedGangIndex(selectedGangIndex === null ? 0 : null);
    } else if (gangAction.tile) {
      // Fallback: use tile if present
      performAction({ type: 'gang', gangType: gangAction.type, tileKey: getTileKey(gangAction.tile) });
    }
  };

  const highlightModel = buildActionHighlightModel(view, seat);
  const actionSourceEvent = highlightModel.sourceEvent;
  const sourceTile = actionSourceEvent ? actionSourceEvent.tile : null;

  const latestDiscardEvent = getLatestDiscardEvent(view, seat);
  const lastDiscardTile = latestDiscardEvent && latestDiscardEvent.stillInRiver ? latestDiscardEvent.tile : undefined;

  const latestLog = view.logs.length > 0 ? view.logs[view.logs.length - 1] : null;

  const getHandTileHighlight = (t: Tile) => {
    if (hoveredCandidateId) {
      const activeCand = highlightModel.candidateGroups.find(c => c.id === hoveredCandidateId);
      if (activeCand && activeCand.handTiles.some(ht => ht.suit === t.suit && ht.rank === t.rank)) {
        return activeCand.actionType === 'chi' ? 'chi' : (activeCand.actionType === 'peng' ? 'peng' : 'hand-participant');
      }
      return undefined;
    }

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

  return (
    <div className="online-game-page" style={{ background: 'var(--table-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#fff', boxSizing: 'border-box', overflowX: 'hidden', position: 'relative' }}>
      
      {/* 1. Compact Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 10px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        fontSize: '0.8rem',
        boxSizing: 'border-box',
        zIndex: 10
      }}>
        <div>房号: <strong style={{ color: 'var(--gold-accent)' }}>{roomId}</strong></div>
        <div style={{ color: connected ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
          {connected ? '● 已连接' : '● 重连中...'}
        </div>
        <div>剩余牌: <strong style={{ color: 'var(--gold-accent)' }}>{view.wallRemainingCount}</strong></div>
      </div>

      {/* 2. Opponents compressed strips (Hides inactive seats automatically) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 10px', boxSizing: 'border-box' }}>
        {view.opponents.some(o => o.seat === pLeft.seat) && (
          <MobileOpponentStrip player={pLeft} isCurrent={view.currentSeat === pLeft.seat} />
        )}
        {view.opponents.some(o => o.seat === pTop.seat) && (
          <MobileOpponentStrip player={pTop} isCurrent={view.currentSeat === pTop.seat} />
        )}
        {view.opponents.some(o => o.seat === pRight.seat) && (
          <MobileOpponentStrip player={pRight} isCurrent={view.currentSeat === pRight.seat} />
        )}
      </div>

      {/* 3. Center compact table area – center discard area + status */}
      <div className="mobile-center-table" style={{ flex: 1, margin: '4px 10px', padding: '10px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center', alignItems: 'stretch', position: 'relative' }}>
        
        <CurrentTurnBanner view={view} seat={seat} getPlayerAtSeat={getPlayerAtSeat} />

        <RecentActionToast latestLog={latestLog} />

        {/* CENTER DISCARD AREA — Fix 3: all players' discards at center */}
        {(() => {
          const allSeats = [seat, ...view.opponents.map(o => o.seat)].sort((a, b) => a - b) as Array<0|1|2|3>;

          const dockPlayers: LatestDiscardPlayer[] = allSeats.map(s => {
            const isMe = s === seat;
            const player = getPlayerAtSeat(s);
            return {
              seat: s,
              playerName: isMe ? '我' : (player.playerName || `${s}号`),
              isMe,
              latestTile: player.discards && player.discards.length > 0 ? player.discards[player.discards.length - 1] : undefined
            };
          });

          const discardPlayers: DiscardPlayerEntry[] = allSeats.map(s => {
            const isMe = s === seat;
            const player = getPlayerAtSeat(s);
            return {
              seat: s,
              playerName: isMe ? '我' : (player.playerName || `${s}号`),
              discards: player.discards,
              isCurrent: view.currentSeat === s,
              isMe,
            };
          });

          return (
            <React.Fragment>
              <MobileLatestDiscardDock
                players={dockPlayers}
                globalLatestTile={lastDiscardTile}
                latestDiscardEvent={latestDiscardEvent}
              />
              <MobileCenterDiscardArea
                players={discardPlayers}
                lastDiscardTile={lastDiscardTile}
                onOpenHistory={(targetSeat) => {
                  setHistoryPlayerSeat(targetSeat as 0 | 1 | 2 | 3);
                  setHistoryDrawerOpen(true);
                }}
              />
            </React.Fragment>
          );
        })()}

        {isMyTurnToDiscard && (
          <div style={{
            background: 'rgba(241,196,15,0.15)',
            border: '1px solid var(--gold-accent)',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            color: '#fff',
            fontWeight: 'bold',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(241,196,15,0.2)'
          }}>
            {selectedTileId ? '再次点击该牌以确认打出 🀄' : '👉 请点击下方手牌选择出牌'}
          </div>
        )}
      </div>

      {/* 4. Action bar floating above hand */}
      {view.pendingActions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginBottom: '8px', width: '100%', padding: '0 10px', boxSizing: 'border-box' }}>
          <ActionSourceTileBanner sourceEvent={highlightModel.sourceEvent} />
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
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
                className="mobile-action-btn action-pass"
                style={{
                  minHeight: '44px',
                  minWidth: '60px',
                  fontSize: '0.95rem',
                  padding: '6px 14px',
                  borderRadius: '22px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  flexShrink: 0
                }}
              >
                过
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. My own melds (Fix 1: visible melds above hand) */}
      {pBottom.melds && pBottom.melds.length > 0 && (
        <div style={{
          padding: '4px 10px',
          boxSizing: 'border-box',
          width: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', marginBottom: '3px' }}>我的副露</div>
          <MobileMeldArea melds={pBottom.melds} />
        </div>
      )}

      {/* 6. Fixed bottom hand container */}
      <div className="mobile-hand" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px' }}>
        {pBottom.hand && (
          <MobilePlayerHand
            hand={pBottom.hand}
            isMyTurnToDiscard={isMyTurnToDiscard}
            actionPending={actionPending}
            selectedTileId={selectedTileId}
            onTileClick={handleTileClick}
            getHandTileHighlight={getHandTileHighlight}
          />
        )}
      </div>

      {/* 6. Utility Collapsed Drawer Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px', background: 'rgba(0,0,0,0.6)', gap: '10px', fontSize: '0.75rem' }}>
        <button 
          onClick={() => {
            const isSettlement = view.phase === 'settlement' || view.phase === 'ended';
            const msg = isSettlement 
              ? '确定离开结算页面吗？' 
              : '对局已开始，退出后将由 AI 托管，是否确认？';
            if (confirm(msg)) {
              if (leaveRoom) {
                leaveRoom('user_leave').catch(() => {});
              } else {
                localStorage.removeItem('online_room_id');
                window.location.reload();
              }
            }
          }}
          style={{ background: 'rgba(231, 76, 60, 0.2)', border: '1px solid #e74c3c', borderRadius: '4px', padding: '6px 10px', color: '#f5b7b1', cursor: 'pointer', fontWeight: 'bold' }}
        >
          🚪 离开
        </button>

        <button 
          onClick={() => setLogDrawerOpen(true)}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '6px 10px', color: '#fff', cursor: 'pointer' }}
        >
          📖 日志
        </button>

        <ConnectionDiagnosticPanel 
          connected={connected}
          roomId={roomId}
          seat={seat}
          socketId={undefined}
          lastError={undefined}
        />

        <OnlineHelpPanel />
      </div>

      {/* 7. Log bottom sheet drawer overlay */}
      <MobileGameLogDrawer
        isOpen={logDrawerOpen}
        onClose={() => setLogDrawerOpen(false)}
        logs={view.logs}
      />

      {/* 8. Settlement Overlay (same as desktop but scrollable) */}
      {view.settlement && (
        <SettlementModal
          settlement={view.settlement}
          seat={seat}
          getPlayerAtSeat={getPlayerAtSeat}
          onExitGame={() => {
            if (confirm('确定离开结算页面吗？')) {
              if (leaveRoom) {
                leaveRoom('back_to_lobby').catch(() => {});
              } else {
                localStorage.removeItem('online_room_id');
                window.location.reload();
              }
            }
          }}
          activeSeats={view.opponents.map(o => o.seat).concat(seat).sort()}
        />
      )}

      {/* 9. Discard History Drawer */}
      {(() => {
        const historyPlayer = getPlayerAtSeat(historyPlayerSeat);
        const isMe = historyPlayerSeat === seat;
        return (
          <MobileDiscardHistoryDrawer
            isOpen={historyDrawerOpen}
            onClose={() => setHistoryDrawerOpen(false)}
            playerName={isMe ? '我' : historyPlayer.playerName}
            isMe={isMe}
            discards={historyPlayer.discards || []}
            globalLatestTile={lastDiscardTile}
          />
        );
      })()}
    </div>
  );
}
