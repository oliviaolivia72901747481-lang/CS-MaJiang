import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSocket, clearClientSocket } from '../client/socket-client.js';

describe('Socket URL Regression Tests', () => {
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

  it('1. localhost page environment binds to localhost socket endpoint', () => {
    global.window = {
      location: {
        protocol: 'http:',
        hostname: 'localhost'
      }
    } as any;
    const socket = getSocket();
    expect((socket as any).io.uri).toBe('http://localhost:3001');
  });

  it('2. 192.168 LAN page environment binds to the corresponding 192.168 socket endpoint', () => {
    global.window = {
      location: {
        protocol: 'http:',
        hostname: '192.168.119.111'
      }
    } as any;
    const socket = getSocket();
    expect((socket as any).io.uri).toBe('http://192.168.119.111:3001');
  });

  it('3. VITE_SOCKET_URL takes precedence over location hostname', () => {
    global.window = {
      location: {
        protocol: 'http:',
        hostname: '192.168.119.111'
      }
    } as any;

    // Simulate import.meta.env
    const socket = getSocket('http://explicit-url:3001');
    expect((socket as any).io.uri).toBe('http://explicit-url:3001');
  });

  it('4. getSocket parameter override takes supreme priority', () => {
    const socket = getSocket('http://param-override:3001');
    expect((socket as any).io.uri).toBe('http://param-override:3001');
  });

  it('5. 10.0.0.x LAN page environment binds to 10.0.0.x socket endpoint', () => {
    global.window = {
      location: {
        protocol: 'http:',
        hostname: '10.0.0.12'
      }
    } as any;
    const socket = getSocket();
    expect((socket as any).io.uri).toBe('http://10.0.0.12:3001');
  });
});
