import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { MahjongGamePage } from './changsha-mahjong-ui/components/MahjongGamePage.jsx';
import { OnlineLobbyPage } from './changsha-mahjong-network/components/OnlineLobbyPage.jsx';
import './changsha-mahjong-ui/styles/mahjong.css';

export function shouldHideModeSwitch(
  mode: 'local' | 'online',
  roomUrl: boolean,
  onlineGamePageActive: boolean
) {
  return mode === 'online' && (roomUrl || onlineGamePageActive);
}

export function MainApp() {
  const isRoomUrl = () => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get('roomId'));
  };

  const getInitialMode = (): 'local' | 'online' => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get('mode');
      const urlRoomId = params.get('roomId');

      if (urlRoomId) {
        return 'online';
      }

      if (urlMode) {
        const lowerMode = urlMode.toLowerCase();
        if (lowerMode === 'solo' || lowerMode === 'practice' || lowerMode === 'local') {
          return 'local';
        }
        if (lowerMode === 'online') {
          return 'online';
        }
      }
    }
    return 'online';
  };

  const [mode, setMode] = useState<'local' | 'online'>(getInitialMode);
  const [onlineGamePageActive, setOnlineGamePageActive] = useState(false);
  const hideModeSwitch = shouldHideModeSwitch(mode, isRoomUrl(), onlineGamePageActive);

  const handleModeChange = (newMode: 'local' | 'online') => {
    setMode(newMode);
    if (newMode === 'local') {
      setOnlineGamePageActive(false);
    }
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (newMode === 'local') {
        url.searchParams.set('mode', 'solo');
        url.searchParams.delete('roomId');
      } else {
        url.searchParams.set('mode', 'online');
      }
      window.history.pushState({}, '', url.toString());
    }
  };

  return (
    <div>
      {/* Mode Switch Bar */}
      {!hideModeSwitch && (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        background: '#111a14',
        padding: '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        gap: '20px',
        fontFamily: 'Outfit, sans-serif'
      }}>
        <button
          onClick={() => handleModeChange('local')}
          style={{
            padding: '8px 18px',
            background: mode === 'local' ? 'linear-gradient(135deg, var(--gold-accent) 0%, #d4ac0d 100%)' : 'rgba(255,255,255,0.05)',
            color: mode === 'local' ? '#111' : '#fff',
            border: 'none',
            borderRadius: '20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: mode === 'local' ? '0 4px 12px rgba(241,196,15,0.3)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          🎴 单机陪练模式
        </button>
        <button
          onClick={() => handleModeChange('online')}
          style={{
            padding: '8px 18px',
            background: mode === 'online' ? 'linear-gradient(135deg, var(--gold-accent) 0%, #d4ac0d 100%)' : 'rgba(255,255,255,0.05)',
            color: mode === 'online' ? '#111' : '#fff',
            border: 'none',
            borderRadius: '20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: mode === 'online' ? '0 4px 12px rgba(241,196,15,0.3)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          🌐 多人联机模式 (v0.8)
        </button>
      </div>
      )}

      {mode === 'local'
        ? <MahjongGamePage />
        : <OnlineLobbyPage onGamePageActiveChange={setOnlineGamePageActive} />}
    </div>
  );
}

if (typeof document !== 'undefined') {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MainApp />
    </React.StrictMode>
  );
}
