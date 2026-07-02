import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { buildJoinUrlCandidates, selectRecommendedJoinUrl } from '../client/lan-url-resolver.js';
import { JoinQRCode } from '../components/JoinQRCode.jsx';

// Simple React mock
vi.mock('react', () => {
  const mockReactInstance = {
    useState: (initialValue: any) => [initialValue, () => {}],
    useRef: (initialValue: any) => ({ current: initialValue }),
    useEffect: () => {},
    Fragment: ({ children }: any) => children,
    createElement: (type: any, props: any, ...children: any[]) => ({ type, props, children }),
  };
  return { ...mockReactInstance, default: mockReactInstance };
});

vi.mock('../client/qrcode-utils.js', () => ({
  buildQRCodeDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,mock')
}));

function findButtons(element: any): any[] {
  const results: any[] = [];
  function traverse(el: any) {
    if (!el) return;
    if (el.type === 'button') results.push(el);
    if (el.props && el.props.children) {
      const children = el.props.children;
      if (Array.isArray(children)) {
        children.flat(Infinity).forEach(traverse);
      } else {
        traverse(children);
      }
    }
  }
  traverse(element);
  return results;
}

describe('Join QR Code Hotfix Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. should resolve to LAN IP when current host is localhost', () => {
    const candidates = buildJoinUrlCandidates({
      currentProtocol: 'http:',
      currentHostname: 'localhost',
      frontendPort: 5173,
      roomId: '123456',
      lanIPs: ['192.168.1.100']
    });

    // Check first candidate is loopback, second is LAN IP
    expect(candidates[0].isLoopback).toBe(true);
    expect(candidates[1].isLan).toBe(true);
    expect(candidates[1].host).toBe('192.168.1.100');

    // Recommendation logic should recommend the LAN IP
    const rec = selectRecommendedJoinUrl(candidates);
    expect(rec.host).toBe('192.168.1.100');
    expect(rec.url).toContain('mode=online');
    expect(rec.url).toContain('roomId=123456');
    expect(rec.url).not.toContain('token');
  });

  it('2. should resolve to LAN IP when current host is 127.0.0.1', () => {
    const candidates = buildJoinUrlCandidates({
      currentProtocol: 'http:',
      currentHostname: '127.0.0.1',
      frontendPort: 5173,
      roomId: '123456',
      lanIPs: ['192.168.1.100']
    });

    const rec = selectRecommendedJoinUrl(candidates);
    expect(rec.host).toBe('192.168.1.100');
  });

  it('3. should use current host if it is already a LAN IP', () => {
    const candidates = buildJoinUrlCandidates({
      currentProtocol: 'http:',
      currentHostname: '192.168.1.100',
      frontendPort: 5173,
      roomId: '123456',
      lanIPs: ['192.168.1.100']
    });

    const rec = selectRecommendedJoinUrl(candidates);
    expect(rec.host).toBe('192.168.1.100');
  });

  it('4. JoinQRCode component should render copy link and copy room ID buttons', () => {
    const el = JoinQRCode({ roomId: '123456', joinUrl: 'http://192.168.1.100:5173/?mode=online&roomId=123456' });
    const buttons = findButtons(el);
    
    const copyLinkBtn = buttons.find(btn => btn.props.children === '复制链接');
    const copyRoomIdBtn = buttons.find(btn => btn.props.children === '复制房间号');
    
    expect(copyLinkBtn).toBeDefined();
    expect(copyRoomIdBtn).toBeDefined();
  });
});
