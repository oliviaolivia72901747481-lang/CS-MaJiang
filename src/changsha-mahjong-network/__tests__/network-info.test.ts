import { describe, it, expect } from 'vitest';
import { getLocalNetworkInfo } from '../server/network-info.js';

describe('Network Info Extraction Tests', () => {
  it('1. can successfully get local network info and hostname is not empty', () => {
    const info = getLocalNetworkInfo({ frontendPort: 5173, socketPort: 3001 });
    expect(info.hostname).toBeDefined();
    expect(info.hostname.length).toBeGreaterThan(0);
  });

  it('2. filters out loopback interface IP address 127.0.0.1 from lanIPs list', () => {
    const info = getLocalNetworkInfo({ frontendPort: 5173, socketPort: 3001 });
    expect(info.lanIPs).not.toContain('127.0.0.1');
  });

  it('3. generates frontend access URLs correctly including localhost', () => {
    const info = getLocalNetworkInfo({ frontendPort: 5173, socketPort: 3001 });
    expect(info.frontendUrls[0]).toBe('http://localhost:5173');
    if (info.lanIPs.length > 0) {
      expect(info.frontendUrls[1]).toBe(`http://${info.lanIPs[0]}:5173`);
    }
  });

  it('4. generates socket.io endpoint URLs correctly including localhost', () => {
    const info = getLocalNetworkInfo({ frontendPort: 5173, socketPort: 3001 });
    expect(info.socketUrls[0]).toBe('http://localhost:3001');
    if (info.lanIPs.length > 0) {
      expect(info.socketUrls[1]).toBe(`http://${info.lanIPs[0]}:3001`);
    }
  });

  it('5. returns correct port mapping back in structure', () => {
    const info = getLocalNetworkInfo({ frontendPort: 8080, socketPort: 9090 });
    expect(info.frontendPort).toBe(8080);
    expect(info.socketPort).toBe(9090);
    expect(info.frontendUrls[0]).toBe('http://localhost:8080');
    expect(info.socketUrls[0]).toBe('http://localhost:9090');
  });
});
