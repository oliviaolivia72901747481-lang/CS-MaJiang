import React, { useState, useEffect } from 'react';
import { PendingAction } from '../types/ui-types.js';
import { Tile } from '../../changsha-mahjong/types/tile.js';

export interface ActionPanelProps {
  actions: PendingAction[];
  onActionClick: (action: PendingAction) => void;
  disabled?: boolean;
}

export function ActionPanel({ actions, onActionClick, disabled: externalDisabled }: ActionPanelProps) {
  const [clicked, setClicked] = useState(false);

  // Reset when actions list changes
  useEffect(() => {
    setClicked(false);
  }, [actions]);

  if (!actions || actions.length === 0) return null;

  const handleAction = (act: PendingAction) => {
    if (clicked || externalDisabled) return;
    setClicked(true);
    onActionClick(act);
  };

  const renderMiniTile = (t: Tile) => {
    const suits: Record<string, string> = { wan: '万', tong: '筒', tiao: '条' };
    return (
      <span className={`mini-tile-ref suit-${t.suit}`}>
        <span className="mini-tile-rank">{t.rank}</span>
        <span className="mini-tile-suit">{suits[t.suit] || t.suit}</span>
      </span>
    );
  };

  const huGroup: React.ReactNode[] = [];
  const meldsGroup: React.ReactNode[] = [];
  let passButton: React.ReactNode = null;

  // 1. Hu / ZiMo actions
  const huActions = actions.filter(a => a.type === 'hu' || a.type === 'ziMo');
  huActions.forEach((act, idx) => {
    const label = act.type === 'ziMo' ? '自摸胡' : '胡牌';
    huGroup.push(
      <button 
        key={`hu-${idx}`} 
        className="action-btn btn-hu pulse-glow"
        onClick={() => handleAction(act)}
        disabled={clicked || externalDisabled}
        title="胡牌：点击直接胡牌赢得本局"
      >
        <span className="action-btn-icon">🀅</span>
        <span className="action-btn-text">{label}</span>
      </button>
    );
  });

  // 2. Gang actions (anGang, buGang, mingGang)
  const gangActions = actions.filter(a => a.type === 'anGang' || a.type === 'buGang' || a.type === 'mingGang');
  gangActions.forEach((act, idx) => {
    let label = '杠牌';
    if (act.type === 'anGang') label = '暗杠';
    if (act.type === 'buGang') label = '补杠';
    if (act.type === 'mingGang') label = '明杠';
    
    meldsGroup.push(
      <button 
        key={`gang-${idx}`} 
        className="action-btn btn-gang"
        onClick={() => handleAction(act)}
        disabled={clicked || externalDisabled}
        title={`${label}：公开此动作并摸一张补张牌`}
      >
        <span className="action-btn-text">{label}</span>
        {act.tile && renderMiniTile(act.tile)}
      </button>
    );
  });

  // 3. Peng action
  const pengActions = actions.filter(a => a.type === 'peng');
  pengActions.forEach((act, idx) => {
    meldsGroup.push(
      <button 
        key={`peng-${idx}`} 
        className="action-btn btn-peng"
        onClick={() => handleAction(act)}
        disabled={clicked || externalDisabled}
        title="碰牌：用手牌两张组成刻子公开"
      >
        <span className="action-btn-text">碰</span>
        {act.tile && renderMiniTile(act.tile)}
      </button>
    );
  });

  // 4. Chi actions with options
  const chiActions = actions.filter(a => a.type === 'chi');
  chiActions.forEach((act, chiIdx) => {
    if (act.options && act.options.length > 0) {
      act.options.forEach((opt, optIdx) => {
        const clonedAction: PendingAction = {
          ...act,
          options: [opt],
        };
        meldsGroup.push(
          <button 
            key={`chi-${chiIdx}-${optIdx}`} 
            className="action-btn btn-chi"
            onClick={() => handleAction(clonedAction)}
            disabled={clicked || externalDisabled}
            title="吃牌：与上家弃牌组合顺子"
          >
            <span className="action-btn-text">吃</span>
            <div className="action-btn-tiles">
              {opt.map((t, tIdx) => (
                <React.Fragment key={tIdx}>
                  {renderMiniTile(t)}
                  {tIdx < opt.length - 1 && <span className="tile-sep">+</span>}
                </React.Fragment>
              ))}
            </div>
          </button>
        );
      });
    } else {
      meldsGroup.push(
        <button 
          key={`chi-fallback-${chiIdx}`} 
          className="action-btn btn-chi"
          onClick={() => handleAction(act)}
          disabled={clicked || externalDisabled}
          title="吃牌：吃上家弃牌"
        >
          吃牌
        </button>
      );
    }
  });

  // 5. Pass action
  const passAction = actions.find(a => a.type === 'pass');
  if (passAction) {
    passButton = (
      <button 
        key="pass" 
        className="action-btn btn-pass"
        onClick={() => handleAction(passAction)}
        disabled={clicked || externalDisabled}
        title="过：放弃本次吃碰杠胡机会"
      >
        过
      </button>
    );
  }

  return (
    <div className="action-panel">
      <div className="action-panel-title">请选择您的操作：</div>
      <div className="action-groups">
        {huGroup.length > 0 && (
          <div className="action-group action-group-hu">
            {huGroup}
          </div>
        )}
        
        {meldsGroup.length > 0 && (
          <div className="action-group action-group-melds">
            {meldsGroup}
          </div>
        )}
        
        {passButton && (
          <div className="action-group action-group-pass">
            {passButton}
          </div>
        )}
      </div>
    </div>
  );
}
