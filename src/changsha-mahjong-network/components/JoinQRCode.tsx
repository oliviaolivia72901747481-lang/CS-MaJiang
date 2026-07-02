import React, { useState, useEffect } from 'react';
import { buildQRCodeDataUrl } from '../client/qrcode-utils.js';

export interface JoinQRCodeProps {
  roomId: string;
  joinUrl: string;
}

export function JoinQRCode({ roomId, joinUrl }: JoinQRCodeProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!joinUrl) {
      setQrDataUrl('');
      return;
    }
    buildQRCodeDataUrl(joinUrl)
      .then(url => {
        setQrDataUrl(url);
        setErrorMsg('');
      })
      .catch(err => {
        setErrorMsg(err.message || '生成二维码失败');
        setQrDataUrl('');
      });
  }, [joinUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isLoopback = joinUrl.includes('localhost') || joinUrl.includes('127.0.0.1') || joinUrl.includes('0.0.0.0');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      background: 'rgba(0, 0, 0, 0.4)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      color: '#fff',
      maxWidth: '320px',
      margin: '0 auto',
      fontFamily: 'Outfit, sans-serif',
      boxSizing: 'border-box'
    }}>
      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
        扫码加入对局
      </div>
      
      {/* Localhost warning warning */}
      {isLoopback && (
        <div style={{
          background: 'rgba(241, 196, 15, 0.15)',
          border: '1.5px solid var(--gold-accent)',
          borderRadius: '6px',
          padding: '8px',
          fontSize: '0.8rem',
          color: '#f1c40f',
          textAlign: 'center',
          marginBottom: '12px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          ⚠️ 警告: 手机不能使用 localhost，请在下方选择局域网 IP 链接生成二维码
        </div>
      )}

      {/* QR Code Container */}
      <div style={{
        background: '#fff',
        padding: '10px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '15px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        minHeight: '160px',
        minWidth: '160px'
      }}>
        {qrDataUrl ? (
          <img 
            src={qrDataUrl} 
            alt="扫码加入游戏" 
            style={{ width: '160px', height: '160px', display: 'block' }}
          />
        ) : (
          <div style={{ color: '#000', fontSize: '0.8rem', padding: '20px', textAlign: 'center' }}>
            {errorMsg || '正在生成二维码...'}
          </div>
        )}
      </div>

      {/* Info Rows */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>房间号: <strong style={{ color: 'var(--gold-accent)' }}>{roomId}</strong></span>
          <button 
            onClick={handleCopyCode}
            style={{
              padding: '4px 10px',
              fontSize: '0.8rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            {copiedCode ? '已复制' : '复制房间号'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>分享链接:</span>
            <button 
              onClick={handleCopyLink}
              style={{
                padding: '4px 10px',
                fontSize: '0.8rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              {copiedLink ? '已复制' : '复制链接'}
            </button>
          </div>
          <div style={{
            fontSize: '0.75rem',
            background: 'rgba(0,0,0,0.3)',
            padding: '6px',
            borderRadius: '4px',
            wordBreak: 'break-all',
            color: 'rgba(255,255,255,0.6)',
            maxHeight: '40px',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {joinUrl}
          </div>
        </div>
      </div>
    </div>
  );
}
