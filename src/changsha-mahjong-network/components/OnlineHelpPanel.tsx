import React, { useState } from 'react';

export function OnlineHelpPanel() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          padding: '6px 12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '4px',
          color: 'var(--text-secondary)',
          fontSize: '0.8rem',
          cursor: 'pointer',
          fontFamily: 'Outfit, sans-serif'
        }}
      >
        📖 查看长沙麻将规则与操作指南
      </button>
    );
  }

  return (
    <div style={{
      background: 'rgba(10, 20, 15, 0.95)',
      border: '1.5px solid var(--border-color)',
      borderRadius: '8px',
      padding: '15px',
      color: '#fff',
      fontSize: '0.85rem',
      fontFamily: 'Outfit, sans-serif',
      boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      maxWidth: '450px',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', marginBottom: '10px' }}>
        <h4 style={{ margin: 0, color: 'var(--gold-accent)' }}>长沙麻将玩法与联机说明</h4>
        <button 
          onClick={() => setIsOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ff4d4d',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem'
          }}
        >
          ✕ 折叠
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
        <div style={{ fontWeight: 'bold', color: 'var(--gold-accent)' }}>基本规则:</div>
        <ul style={{ margin: 0, paddingLeft: '16px' }}>
          <li>只使用筒、条、万，共 108 张牌，无风牌及字牌。</li>
          <li>支持吃、碰、杠、胡。吃碰杠时需亮明牌组。</li>
          <li>起手大胡检测：起手四喜、板板胡、缺一色、六六顺可直接胡牌。</li>
          <li>终局结算以扎鸟计算加分。</li>
        </ul>

        <div style={{ fontWeight: 'bold', color: 'var(--gold-accent)' }}>联机说明:</div>
        <ul style={{ margin: 0, paddingLeft: '16px' }}>
          <li>创建房间后，将分配专属 6 位数房间号，可通过链接或二维码邀请朋友。</li>
          <li>未满 4 人时，点击“机器人补位”可快速引入 Advanced Lite AI 陪练。</li>
          <li>如果游戏断网或中途刷新，系统会通过本地保存的 Token 自动执行断线归位恢复。</li>
        </ul>
      </div>
    </div>
  );
}
