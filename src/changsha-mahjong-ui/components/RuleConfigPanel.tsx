import React, { useState } from 'react';

export interface RuleConfigPanelProps {
  onConfigChange?: (config: any) => void;
  locked?: boolean;
}

export function RuleConfigPanel({ onConfigChange, locked }: RuleConfigPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [birdCount, setBirdCount] = useState(2);
  const [birdEnabled, setBirdEnabled] = useState(true);
  const [gangScoreMode, setGangScoreMode] = useState<'immediate' | 'end'>('immediate');
  const [scoreMode, setScoreMode] = useState<'changsha_6_7' | 'changsha_6_6'>('changsha_6_7');
  const [needOpenDoor, setNeedOpenDoor] = useState(false);

  const handleSave = () => {
    if (locked) return;
    if (onConfigChange) {
      onConfigChange({
        scoreMode,
        bird: {
          enabled: birdEnabled,
          count: birdCount,
        },
        gang: {
          settleImmediately: gangScoreMode === 'immediate',
        },
        openDoor: {
          needOpenDoorForDianPaoHu: needOpenDoor,
        }
      });
    }
    setIsCollapsed(true);
  };

  return (
    <div className={`rule-config-panel ${isCollapsed ? 'collapsed' : ''} ${locked ? 'is-locked' : ''}`}>
      <div className="panel-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span className="panel-title">⚙️ 长沙麻将玩法配置 {locked && <span className="locked-indicator">🔒 已锁定</span>}</span>
        <button className="collapse-btn">{isCollapsed ? '展开' : '折叠'}</button>
      </div>

      {!isCollapsed && (
        <div className="panel-body">
          {locked && (
            <div className="config-locked-alert">
              ⚠️ 对局已经开始，规则已锁定。如需修改，请重置游戏。
            </div>
          )}
          
          <div className="config-form">
            {/* Score Mode Option */}
            <div className="form-group">
              <label htmlFor="scoreMode">计分模式：</label>
              <select 
                id="scoreMode"
                value={scoreMode} 
                onChange={(e) => setScoreMode(e.target.value as any)}
                disabled={locked}
              >
                <option value="changsha_6_7">6/7 分制 (标准长沙麻将)</option>
                <option value="changsha_6_6">6/6 分制 (传统长沙麻将)</option>
              </select>
            </div>

            {/* Open Door Option */}
            <div className="form-group">
              <label>起胡门槛：</label>
              <div className="checkbox-group">
                <input 
                  type="checkbox" 
                  id="needOpenDoor"
                  checked={needOpenDoor} 
                  onChange={(e) => setNeedOpenDoor(e.target.checked)} 
                  disabled={locked}
                />
                <label htmlFor="needOpenDoor">点炮胡需已开门 (吃碰杠)</label>
              </div>
            </div>

            {/* Bird enabled */}
            <div className="form-group">
              <label>扎鸟设置：</label>
              <div className="checkbox-group">
                <input 
                  type="checkbox" 
                  id="birdEnabled"
                  checked={birdEnabled} 
                  onChange={(e) => setBirdEnabled(e.target.checked)} 
                  disabled={locked}
                />
                <label htmlFor="birdEnabled">开启扎鸟</label>
              </div>
            </div>

            {birdEnabled && (
              <div className="form-group">
                <label htmlFor="birdCount">扎鸟数量：</label>
                <select 
                  id="birdCount"
                  value={birdCount} 
                  onChange={(e) => setBirdCount(Number(e.target.value))}
                  disabled={locked}
                >
                  <option value={1}>扎 1 鸟</option>
                  <option value={2}>扎 2 鸟</option>
                </select>
              </div>
            )}

            {/* Gang score mode */}
            <div className="form-group">
              <label htmlFor="gangScoreMode">杠分模式：</label>
              <select 
                id="gangScoreMode"
                value={gangScoreMode} 
                onChange={(e) => setGangScoreMode(e.target.value as any)}
                disabled={locked}
              >
                <option value="immediate">立即计分 (标准)</option>
                <option value="end">局尾计分</option>
              </select>
            </div>

            {!locked && (
              <div className="form-actions">
                <button className="save-btn" onClick={handleSave}>保存当前配置</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
