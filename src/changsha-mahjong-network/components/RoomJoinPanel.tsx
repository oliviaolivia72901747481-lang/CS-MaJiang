import React, { useState, useRef } from 'react';
import { decodeQRCodeFromFile, extractRoomIdFromScanResult } from '../client/qr-decoder.js';

export interface RoomJoinPanelProps {
  onJoin: (roomId: string) => void;
  disabled?: boolean;
}

export function RoomJoinPanel({ onJoin, disabled }: RoomJoinPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanError, setScanError] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('roomId') || '';
    }
    return '';
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomIdInput.trim() && !disabled) {
      onJoin(roomIdInput.trim());
    }
  };

  const handleScanClick = () => {
    if (disabled || scanning) return;
    setScanError('');
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const decodedText = await decodeQRCodeFromFile(file);
      const extractedRoomId = extractRoomIdFromScanResult(decodedText);
      if (extractedRoomId) {
        setRoomIdInput(extractedRoomId);
        onJoin(extractedRoomId);
      } else {
        setScanError('未能从二维码中解析出房间号');
      }
    } catch (err: any) {
      setScanError(err.message || '二维码识别失败，请对准二维码重新拍照');
    } finally {
      setScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--gold-accent)', fontFamily: 'Outfit, sans-serif' }}>
        加入已有房间
      </h3>
      
      <input 
        type="file" 
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="请输入 6 位房间号"
          value={roomIdInput}
          onChange={(e) => setRoomIdInput(e.target.value)}
          disabled={disabled || scanning}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: '#1a2b21',
            color: '#fff',
            fontSize: '1rem',
            fontFamily: 'Outfit, sans-serif'
          }}
          required
        />
        <button 
          type="button" 
          onClick={handleScanClick}
          disabled={disabled || scanning}
          style={{
            padding: '12px 18px',
            fontSize: '1rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            color: '#fff',
            cursor: (disabled || scanning) ? 'not-allowed' : 'pointer',
            opacity: (disabled || scanning) ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          📷 {scanning ? '扫描中...' : '扫码'}
        </button>
        <button 
          type="submit" 
          className="start-btn-primary" 
          disabled={disabled || scanning}
          style={{
            margin: 0,
            width: 'auto',
            padding: '12px 24px',
            fontSize: '1rem',
            opacity: (disabled || scanning) ? 0.6 : 1,
            cursor: (disabled || scanning) ? 'not-allowed' : 'pointer'
          }}
        >
          加入
        </button>
      </div>

      {scanError && (
        <div style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '2px', fontWeight: 'bold' }}>
          ⚠️ {scanError}
        </div>
      )}
    </form>
  );
}
