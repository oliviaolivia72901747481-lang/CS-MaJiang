import React, { useEffect, useRef, useState } from 'react';
import { GameLogEntry } from '../../changsha-mahjong/types/game.js';

export interface GameLogPanelProps {
  logs: GameLogEntry[];
}

export function GameLogPanel({ logs }: GameLogPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && !isCollapsed) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, isCollapsed]);

  const getLogType = (entry: GameLogEntry) => {
    const act = entry.action;
    if (act.includes('打出牌') || act.includes('出牌')) return { type: 'discard', label: '出牌', className: 'tag-discard' };
    if (act.includes('摸牌') || act.includes('补牌')) return { type: 'draw', label: '摸牌', className: 'tag-draw' };
    if (act.includes('碰')) return { type: 'peng', label: '碰', className: 'tag-peng' };
    if (act.includes('吃')) return { type: 'chi', label: '吃', className: 'tag-chi' };
    if (act.includes('杠')) return { type: 'gang', label: '杠', className: 'tag-gang' };
    if (act.includes('胡') || act.includes('自摸')) return { type: 'hu', label: '胡', className: 'tag-hu' };
    if (act.includes('结算') || act.includes('流局') || act.includes('对局') || act.includes('扎鸟')) return { type: 'system', label: '系统', className: 'tag-system' };
    return { type: 'other', label: '动态', className: 'tag-other' };
  };

  const getSeatName = (seat?: number): string => {
    if (seat === undefined) return '系统';
    if (seat === 0) return '玩家本人 (我)';
    return `机器人 ${seat}`;
  };

  const formatTileName = (tileKey: string): string => {
    // e.g. "wan_5" -> "5万", "tiao_8" -> "8条"
    const parts = tileKey.split('_');
    if (parts.length < 2) return tileKey;
    const suitMap: Record<string, string> = { wan: '万', tong: '筒', tiao: '条' };
    return `${parts[1]}${suitMap[parts[0]] || parts[0]}`;
  };

  // Limit to last 100 logs
  const displayLogs = logs.slice(-100);

  return (
    <div className={`game-log-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="panel-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span className="panel-title">📜 对局动态日志 ({logs.length} 条)</span>
        <button className="collapse-btn">{isCollapsed ? '展开' : '折叠'}</button>
      </div>

      {!isCollapsed && (
        <div className="panel-body" ref={containerRef}>
          {displayLogs.map((log, index) => {
            const logMeta = getLogType(log);
            const playerStr = getSeatName(log.seat);
            const stepStr = String(log.step).padStart(3, '0');

            // Split detail by colon "：" to separate main action description from AI reasoning
            const detailParts = log.detail ? log.detail.split('：') : [];
            let mainDetail = detailParts[0] || '';
            const aiReason = detailParts[1] || '';

            // Format mainDetail if it contains raw tile keys like wan_5 or tiao_8
            if (mainDetail.includes('_')) {
              const tileKeyMatch = mainDetail.match(/[a-z]+_\d+/);
              if (tileKeyMatch) {
                mainDetail = mainDetail.replace(tileKeyMatch[0], formatTileName(tileKeyMatch[0]));
              }
            }

            return (
              <div key={index} className={`log-line type-${logMeta.type}`}>
                <div className="log-line-main">
                  <span className="log-step">#{stepStr}</span>
                  <span className={`log-tag ${logMeta.className}`}>{logMeta.label}</span>
                  <span className="log-actor font-bold">{playerStr}</span>
                  <span className="log-action-name">{log.action}</span>
                  {mainDetail && <span className="log-detail">({mainDetail})</span>}
                </div>
                {aiReason && (
                  <div className="log-ai-reason text-secondary">
                    💡 思考：{aiReason}
                  </div>
                )}
              </div>
            );
          })}
          {displayLogs.length === 0 && (
            <div className="empty-logs">暂无对局动态</div>
          )}
        </div>
      )}
    </div>
  );
}
