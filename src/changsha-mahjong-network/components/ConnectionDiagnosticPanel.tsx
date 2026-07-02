import React, { useState, useEffect } from 'react';
import { getSocket } from '../client/socket-client.js';

export interface ConnectionDiagnosticPanelProps {
  connected: boolean;
  roomId?: string;
  seat?: number;
  socketId?: string;
  lastError?: string;
  serverUrl?: string;
}

export function ConnectionDiagnosticPanel({
  connected,
  roomId,
  seat,
  socketId,
  lastError,
  serverUrl
}: ConnectionDiagnosticPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [httpHealth, setHttpHealth] = useState<'testing' | 'success' | 'failed'>('testing');
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [resolvedUrl, setResolvedUrl] = useState('');

  useEffect(() => {
    // Resolve the socket server url
    const socket = getSocket(serverUrl);
    setResolvedUrl((socket.io as any).uri || '');

    // Ping health check endpoint
    const pingHealth = async () => {
      try {
        const socketUri = (socket.io as any).uri || '';
        const healthUrl = `${socketUri}/health`;
        const res = await fetch(healthUrl, { method: 'GET', mode: 'cors' });
        if (res.ok) {
          const data = await res.json();
          setHttpHealth('success');
          setHealthStatus(data);
        } else {
          setHttpHealth('failed');
        }
      } catch (err) {
        setHttpHealth('failed');
      }
    };

    pingHealth();
    const interval = setInterval(pingHealth, 10000);
    return () => clearInterval(interval);
  }, [serverUrl, connected]);

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
        🔍 打开局域网诊断自检面板
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
        <h4 style={{ margin: 0, color: 'var(--gold-accent)' }}>局域网自检诊断面板</h4>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div>前端状态: <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>已加载</span></div>
        <div>
          Socket 服务: {' '}
          <span style={{ color: connected ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
            {connected ? '已连接' : '未连接'}
          </span>
        </div>
        <div>
          HTTP Health 检查: {' '}
          <span style={{ color: httpHealth === 'success' ? '#2ecc71' : httpHealth === 'failed' ? '#e74c3c' : '#f1c40f', fontWeight: 'bold' }}>
            {httpHealth === 'success' ? '健康 (ok)' : httpHealth === 'failed' ? '连接失败 (fail)' : '检测中...'}
          </span>
          {healthStatus && (
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginLeft: '8px' }}>
              (活跃房: {healthStatus.activeRooms}, 连接: {healthStatus.activeSockets})
            </span>
          )}
        </div>
        <div>当前访问 Host: <span style={{ color: 'rgba(255,255,255,0.7)' }}>{typeof window !== 'undefined' ? window.location.host : 'localhost'}</span></div>
        <div>Socket 连接地址: <span style={{ color: 'rgba(255,255,255,0.7)' }}>{resolvedUrl}</span></div>
        {roomId && <div>房间号: <span style={{ color: 'var(--gold-accent)' }}>{roomId}</span></div>}
        {seat !== undefined && <div>我的座位: <span>{seat} 号位</span></div>}
        {socketId && <div>当前 Socket ID: <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{socketId}</span></div>}
        {lastError && (
          <div style={{ color: '#ff4d4d', marginTop: '5px', background: 'rgba(255,77,77,0.1)', padding: '6px', borderRadius: '4px', borderLeft: '3px solid #ff4d4d' }}>
            错误: {lastError}
          </div>
        )}
      </div>

      {/* Troubleshooting Tips if disconnected */}
      {(!connected || httpHealth === 'failed') && (
        <div style={{
          marginTop: '12px',
          background: 'rgba(231,76,60,0.1)',
          border: '1px solid rgba(231,76,60,0.3)',
          borderRadius: '6px',
          padding: '10px'
        }}>
          <div style={{ fontWeight: 'bold', color: '#f5b7b1', marginBottom: '5px' }}>💡 故障排查建议:</div>
          <ol style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', color: '#e59866' }}>
            <li>确认房主电脑上运行了 <code style={{ background: 'rgba(0,0,0,0.5)', padding: '2px 4px', borderRadius: '3px' }}>npm run dev:online</code> 且未中断；</li>
            <li>确认手机和房主电脑连接在同一个 WiFi 局域网或手机热点上；</li>
            <li>确认手机访问的是 <code style={{ background: 'rgba(0,0,0,0.5)', padding: '2px 4px', borderRadius: '3px' }}>http://电脑IP:5173</code>，<strong>不要</strong> 访问 localhost；</li>
            <li>手机在浏览器打开 <code style={{ background: 'rgba(0,0,0,0.5)', padding: '2px 4px', borderRadius: '3px' }}>{resolvedUrl}/health</code> 检查是否返回 ok；</li>
            <li>确认房主电脑防火墙或杀毒软件未拦截 Node.js 服务端口 (3001)；</li>
            <li>如果多次尝试失败，尝试在电脑终端重启 <code style={{ background: 'rgba(0,0,0,0.5)', padding: '2px 4px', borderRadius: '3px' }}>npm run dev:online</code>。</li>
          </ol>
        </div>
      )}
    </div>
  );
}
