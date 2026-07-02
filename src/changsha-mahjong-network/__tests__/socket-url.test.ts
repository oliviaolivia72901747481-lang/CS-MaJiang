import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSocket, clearClientSocket } from '../client/socket-client.js';

describe('Socket URL Resolution Tests', () => {
  const originalWindow = global.window;
  const originalEnv = process.env;

  beforeEach(() => {
    clearClientSocket();
    vi.mock('socket.io-client', () => {
      return {
        io: (url: string) => {
          return { 
            io: { uri: url }, 
            connect: () => {}, 
            disconnect: () => {}, 
            on: () => {}, 
            off: () => {} 
          };
        }
      };
    });
  });

  afterEach(() => {
    global.window = originalWindow;
    process.env = originalEnv;
    clearClientSocket();
  });

  it('1. localhost hostname resolves to localhost socket url', () => {
    global.window = {
      location: {
        protocol: 'http:',
        hostname: 'localhost'
      }
    } as any;

    const socket = getSocket();
    expect((socket as any).io.uri).toBe('http://localhost:3001');
  });

  it('2. custom LAN IP resolves to the matching LAN socket URL', () => {
    global.window = {
      location: {
        protocol: 'http:',
        hostname: '192.168.12.34'
      }
    } as any;

    const socket = getSocket();
    expect((socket as any).io.uri).toBe('http://192.168.12.34:3001');
  });

  it('3. explicit parameter overrides dynamic hostname resolution', () => {
    global.window = {
      location: {
        protocol: 'http:',
        hostname: '192.168.12.34'
      }
    } as any;

    const socket = getSocket('http://custom-server:9000');
    expect((socket as any).io.uri).toBe('http://custom-server:9000');
  });

  it('4. uses https protocol if current page is accessed via secure connection', () => {
    global.window = {
      location: {
        protocol: 'https:',
        hostname: '10.0.0.5'
      }
    } as any;

    const socket = getSocket();
    expect((socket as any).io.uri).toBe('https://10.0.0.5:3001');
  });

  it('5. fallback resolves to localhost if window location is undefined', () => {
    global.window = undefined as any;

    const socket = getSocket();
    expect((socket as any).io.uri).toBe('http://localhost:3001');
  });
});
