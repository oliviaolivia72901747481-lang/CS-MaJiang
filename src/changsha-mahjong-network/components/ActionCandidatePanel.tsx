import React from 'react';
import { ActionCandidateGroup, getTileChineseName } from '../utils/action-highlight-utils.js';
import { TileView } from './TileView.jsx';

export interface ActionCandidatePanelProps {
  candidates: ActionCandidateGroup[];
  actionPending: boolean;
  onSelect: (payload: any) => void;
  hoveredCandidateId?: string | null;
  onHoverCandidate?: (id: string | null) => void;
  compactTitle?: string;
  style?: React.CSSProperties;
}

export function ActionCandidatePanel({
  candidates,
  actionPending,
  onSelect,
  hoveredCandidateId,
  onHoverCandidate,
  compactTitle,
  style
}: ActionCandidatePanelProps) {
  if (!candidates || candidates.length === 0) return null;

  const groups = candidates.map((cand) => {
    const isHovered = hoveredCandidateId === cand.id;
    const isHuAction = cand.actionType === 'hu' || cand.actionType === 'ziMo';

    const actionColors: Record<string, string> = {
      chi: '#3498db',
      peng: '#f1c40f',
      mingGang: '#2ecc71',
      anGang: '#9b59b6',
      buGang: '#2ecc71',
      hu: '#e74c3c',
      ziMo: '#e74c3c'
    };
    const badgeColor = actionColors[cand.actionType] || '#888';

    const typeLabels: Record<string, string> = {
      chi: '吃',
      peng: '碰',
      mingGang: '明杠',
      anGang: '暗杠',
      buGang: '补杠',
      hu: '胡牌',
      ziMo: '自摸'
    };
    const badgeText = typeLabels[cand.actionType] || cand.actionType;

    return (
      <div
        key={cand.id}
        className={`action-candidate-group ${isHovered ? 'tile-candidate-selected' : ''}`}
        onClick={!actionPending ? () => onSelect(cand.submitPayload) : undefined}
        onMouseEnter={() => onHoverCandidate?.(cand.id)}
        onMouseLeave={() => onHoverCandidate?.(null)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          background: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
          border: isHovered ? `1px solid ${badgeColor}` : '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '6px 10px',
          cursor: actionPending ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: actionPending ? 0.6 : 1,
          minWidth: '70px',
          userSelect: 'none'
        }}
      >
        <span
          className="action-candidate-label"
          style={{
            fontSize: '0.68rem',
            fontWeight: 'bold',
            color: '#fff',
            background: badgeColor,
            padding: '2px 6px',
            borderRadius: '4px',
            marginBottom: '2px'
          }}
        >
          {badgeText}
        </span>

        {!isHuAction && cand.tiles && cand.tiles.length > 0 ? (
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            {cand.tiles.map((t, tIdx) => {
              const isSource = cand.sourceTile && (
                t.instanceId === cand.sourceTile.instanceId ||
                (t.suit === cand.sourceTile.suit && t.rank === cand.sourceTile.rank && tIdx === 1)
              );
              const isAnGang = cand.actionType === 'anGang';
              const isHidden = isAnGang && tIdx >= 1 && tIdx <= 2;

              return (
                <div key={tIdx} style={{ transform: 'scale(0.8)', margin: '-2px' }}>
                  <TileView
                    tile={t}
                    hidden={isHidden}
                    highlightType={isSource ? 'source' : 'hand-participant'}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <span style={{ fontSize: '0.72rem', color: '#ff6b6b' }}>
            {cand.sourceTile ? getTileChineseName(cand.sourceTile) : ''}
          </span>
        )}
      </div>
    );
  });

  const panel = (
    <div
      className="action-candidate-panel"
      style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        padding: '8px 16px',
        borderRadius: '20px',
        background: 'rgba(17, 26, 20, 0.95)',
        border: '2px solid var(--gold-accent, #f1c40f)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.85)',
        maxWidth: '90vw',
        overflowX: 'auto',
        justifyContent: 'center',
        ...style
      }}
    >
      {groups}
    </div>
  );

  if (!compactTitle) return panel;

  return (
    <div
      className="action-candidate-panel-shell"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', maxWidth: '94vw' }}
    >
      <div
        className="action-candidate-compact-title"
        style={{
          maxWidth: '92vw',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '0.72rem',
          lineHeight: 1.2,
          color: '#f8e9a1',
          fontWeight: 'bold',
          textAlign: 'center',
        }}
      >
        {compactTitle}
      </div>
      {panel}
    </div>
  );
}
