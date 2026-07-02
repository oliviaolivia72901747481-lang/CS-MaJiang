import { describe, it, expect } from 'vitest';
import { buildJoinUrlCandidates, selectRecommendedJoinUrl } from '../client/lan-url-resolver.js';

describe('Join URL Resolver Tests', () => {
  it('1. current host localhost resolves to lanIP[0] as recommended candidate', () => {
    const candidates = buildJoinUrlCandidates({
      currentProtocol: 'http:',
      currentHostname: 'localhost',
      frontendPort: 5173,
      roomId: '123456',
      lanIPs: ['192.168.1.100', '10.0.0.5']
    });

    expect(candidates).toHaveLength(3); // localhost + 2 LAN IPs
    expect(candidates[0].isLoopback).toBe(true);
    expect(candidates[0].recommended).toBe(false);

    expect(candidates[1].host).toBe('192.168.1.100');
    expect(candidates[1].isLan).toBe(true);
    expect(candidates[1].recommended).toBe(true); // first LAN IP recommended

    const rec = selectRecommendedJoinUrl(candidates);
    expect(rec.host).toBe('192.168.1.100');
  });

  it('2. current host 127.0.0.1 resolves to first LAN IP as recommended', () => {
    const candidates = buildJoinUrlCandidates({
      currentProtocol: 'http:',
      currentHostname: '127.0.0.1',
      frontendPort: 5173,
      roomId: '123456',
      lanIPs: ['10.0.0.5']
    });
    expect(candidates[1].recommended).toBe(true);
  });

  it('3. current host 0.0.0.0 resolves to first LAN IP as recommended', () => {
    const candidates = buildJoinUrlCandidates({
      currentProtocol: 'http:',
      currentHostname: '0.0.0.0',
      frontendPort: 5173,
      roomId: '123456',
      lanIPs: ['172.16.0.2']
    });
    expect(candidates[1].recommended).toBe(true);
  });

  it('4. current host already LAN IP resolves to itself as recommended', () => {
    const candidates = buildJoinUrlCandidates({
      currentProtocol: 'http:',
      currentHostname: '192.168.1.100',
      frontendPort: 5173,
      roomId: '123456',
      lanIPs: ['192.168.1.100', '10.0.0.5']
    });
    expect(candidates[0].host).toBe('192.168.1.100');
    expect(candidates[0].recommended).toBe(true); // itself is recommended
  });

  it('5. returns multiple candidates when multiple LAN IPs exist without duplicates', () => {
    const candidates = buildJoinUrlCandidates({
      currentProtocol: 'http:',
      currentHostname: 'localhost',
      frontendPort: 5173,
      roomId: '123456',
      lanIPs: ['192.168.1.100', '10.0.0.5']
    });
    const hosts = candidates.map(c => c.host);
    expect(hosts).toContain('localhost');
    expect(hosts).toContain('192.168.1.100');
    expect(hosts).toContain('10.0.0.5');
  });

  it('6. roomId is encoded properly using encodeURIComponent', () => {
    const candidates = buildJoinUrlCandidates({
      currentProtocol: 'http:',
      currentHostname: 'localhost',
      frontendPort: 5173,
      roomId: 'hello room?',
      lanIPs: ['192.168.1.100']
    });
    expect(candidates[0].url).toContain('roomId=hello%20room%3F');
  });

  it('7. token is never included in the URL candidates', () => {
    const candidates = buildJoinUrlCandidates({
      currentProtocol: 'http:',
      currentHostname: 'localhost',
      frontendPort: 5173,
      roomId: '123',
      lanIPs: ['192.168.1.100']
    });
    expect(candidates[0].url).not.toContain('token');
  });
});
