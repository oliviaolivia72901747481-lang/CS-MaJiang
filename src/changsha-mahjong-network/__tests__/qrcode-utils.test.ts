import { describe, it, expect } from 'vitest';
import { buildQRCodeDataUrl } from '../client/qrcode-utils.js';

describe('QR Code Generation Utils Tests', () => {
  it('1. can successfully generate a data URL base64 image representation of a link', async () => {
    const url = 'http://192.168.1.100:5173/?mode=online&roomId=123456';
    const dataUrl = await buildQRCodeDataUrl(url);
    expect(dataUrl).toBeDefined();
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('2. throws an error when an empty or blank string is provided', async () => {
    await expect(buildQRCodeDataUrl('')).rejects.toThrow('Link text cannot be empty');
    await expect(buildQRCodeDataUrl('   ')).rejects.toThrow('Link text cannot be empty');
  });

  it('3. generates offline without triggering external fetch requests', async () => {
    const dataUrl = await buildQRCodeDataUrl('http://offline-check');
    expect(dataUrl).toContain('data:image/png;base64,');
  });

  it('4. rejects undefined or null values implicitly', async () => {
    await expect(buildQRCodeDataUrl(undefined as any)).rejects.toThrow();
  });
});
