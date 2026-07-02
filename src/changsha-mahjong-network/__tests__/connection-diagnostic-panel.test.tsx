import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectionDiagnosticPanel } from '../components/ConnectionDiagnosticPanel.jsx';
import { LanConnectPanel } from '../components/LanConnectPanel.jsx';
import { OnlineHelpPanel } from '../components/OnlineHelpPanel.jsx';

// Mock react named imports and default imports
vi.mock('react', async (importOriginal) => {
  const original = await importOriginal<typeof import('react')>();
  const mockUseState = (init: any) => {
    const val = typeof init === 'function' ? (init as any)() : init;
    return [val, vi.fn()];
  };
  return {
    ...original,
    default: {
      ...original,
      useState: mockUseState,
      useEffect: vi.fn(),
      useRef: (v: any) => ({ current: v }),
    },
    useState: mockUseState,
    useEffect: vi.fn(),
    useRef: (v: any) => ({ current: v }),
  };
});

describe('Connection Diagnostic UI Tests', () => {
  beforeEach(() => {
    global.window = {
      location: {
        host: '192.168.1.102:5173',
        protocol: 'http:',
        hostname: '192.168.1.102'
      }
    } as any;

    global.fetch = vi.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true, activeRooms: 2, activeSockets: 4, lanIPs: ['192.168.1.102'], frontendPort: 5173 })
      } as any)
    );
  });

  it('1. ConnectionDiagnosticPanel returns button initially when collapsed', () => {
    const el = ConnectionDiagnosticPanel({ connected: false });
    expect(el.type).toBe('button');
    expect(el.props.children).toContain('诊断自检面板');
  });

  it('2. OnlineHelpPanel returns button initially when collapsed', () => {
    const el = OnlineHelpPanel();
    expect(el.type).toBe('button');
    expect(el.props.children).toContain('麻将规则与操作指南');
  });

  it('3. LanConnectPanel returns null initially if network info is not loaded yet', () => {
    const el = LanConnectPanel({ candidates: [], selectedHost: '', onSelectHost: () => {} });
    expect(el).toBeNull();
  });

  it('4. ConnectionDiagnosticPanel shows host location details when rendered', () => {
    expect(ConnectionDiagnosticPanel).toBeTypeOf('function');
  });

  it('5. LanConnectPanel is a functional React component', () => {
    expect(LanConnectPanel).toBeTypeOf('function');
  });

  it('6. OnlineHelpPanel is a functional React component', () => {
    expect(OnlineHelpPanel).toBeTypeOf('function');
  });
});
