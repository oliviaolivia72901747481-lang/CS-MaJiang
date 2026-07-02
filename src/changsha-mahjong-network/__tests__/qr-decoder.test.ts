import { describe, it, expect } from 'vitest';
import { extractRoomIdFromScanResult } from '../client/qr-decoder.js';

describe('QR Decoder Utility Tests', () => {
  it('1. extracts roomId from absolute LAN URL format', () => {
    const url = 'http://192.168.1.100:5173/?mode=online&roomId=987654';
    expect(extractRoomIdFromScanResult(url)).toBe('987654');
  });

  it('2. extracts roomId from relative query format', () => {
    const query = '?roomId=ABCDEF';
    expect(extractRoomIdFromScanResult(query)).toBe('ABCDEF');
  });

  it('3. returns raw 6-character room code when scanned text is simple string code', () => {
    const rawCode = '12A45B';
    expect(extractRoomIdFromScanResult(rawCode)).toBe('12A45B');
  });

  it('4. returns null when scanned text is invalid or unrelated', () => {
    expect(extractRoomIdFromScanResult('hello world')).toBeNull();
    expect(extractRoomIdFromScanResult('')).toBeNull();
    expect(extractRoomIdFromScanResult('http://google.com')).toBeNull();
  });
});
