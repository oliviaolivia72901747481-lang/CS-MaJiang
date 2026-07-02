import React from 'react';
import { JoinUrlCandidate } from '../client/lan-url-resolver.js';

export interface LanConnectPanelProps {
  candidates: JoinUrlCandidate[];
  selectedHost: string;
  onSelectHost: (host: string) => void;
}

export function LanConnectPanel({ candidates, selectedHost, onSelectHost }: LanConnectPanelProps) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '8px',
      padding: '12px 15px',
      color: '#fff',
      fontSize: '0.85rem',
      fontFamily: 'Outfit, sans-serif',
      boxSizing: 'border-box',
      width: '100%'
    }}>
      <div style={{ fontWeight: 'bold', color: 'var(--gold-accent)', marginBottom: '6px' }}>
        📢 局域网联机二维码地址切换
      </div>
      <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.8rem' }}>
        如果房主通过 localhost 启动，手机无法直接连 localhost。请选择下方的局域网 IP 生成二维码：
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {candidates.map((cand, idx) => {
          const isSelected = cand.host === selectedHost;
          return (
            <div 
              key={idx} 
              onClick={() => onSelectHost(cand.host)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                background: isSelected ? 'rgba(241,196,15,0.1)' : 'rgba(0,0,0,0.2)',
                border: isSelected ? '1px solid var(--gold-accent)' : '1px solid rgba(255,255,255,0.05)',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: isSelected ? 'var(--gold-accent)' : '#fff', fontSize: '0.85rem' }}>
                  {cand.host} {cand.recommended && <span style={{ color: '#2ecc71', fontSize: '0.75rem', marginLeft: '6px', background: 'rgba(46,204,113,0.15)', padding: '2px 6px', borderRadius: '3px' }}>★ 推荐手机扫码使用</span>}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                  {cand.label}
                </span>
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.5)',
                wordBreak: 'break-all',
                fontFamily: 'monospace'
              }}>
                {cand.url}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
