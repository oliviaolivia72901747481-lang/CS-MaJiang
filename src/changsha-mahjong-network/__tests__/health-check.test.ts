import { describe, it, expect, vi } from 'vitest';
import { handleHealthCheckRequest } from '../server/health-check.js';
import { createRoom, clearAllRooms } from '../server/room-manager.js';

describe('HTTP Health Check Tests', () => {
  const mockResponse = () => {
    const res: any = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };
    return res;
  };

  it('1. returns 200 and ServerHealthStatus structure for /health endpoint', () => {
    clearAllRooms();
    createRoom();

    const req: any = { url: '/health', method: 'GET' };
    const res = mockResponse();
    const ioMock = { engine: { clientsCount: 3 } };

    const handled = handleHealthCheckRequest(req, res, ioMock);
    expect(handled).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    expect(res.end).toHaveBeenCalled();

    const json = JSON.parse(res.end.mock.calls[0][0]);
    expect(json.ok).toBe(true);
    expect(json.activeRooms).toBe(1);
    expect(json.activeSockets).toBe(3);
    expect(json.socketPort).toBe(3001);
  });

  it('2. returns network info JSON structure for /network-info endpoint', () => {
    const req: any = { url: '/network-info', method: 'GET' };
    const res = mockResponse();

    const handled = handleHealthCheckRequest(req, res);
    expect(handled).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));

    const json = JSON.parse(res.end.mock.calls[0][0]);
    expect(json.hostname).toBeDefined();
    expect(json.lanIPs).toBeDefined();
  });

  it('3. responds with 204 preflight details for OPTIONS requests', () => {
    const req: any = { url: '/health', method: 'OPTIONS' };
    const res = mockResponse();

    const handled = handleHealthCheckRequest(req, res);
    expect(handled).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(204, expect.any(Object));
  });

  it('4. returns false and does not write to response for unhandled routes', () => {
    const req: any = { url: '/other-route', method: 'GET' };
    const res = mockResponse();

    const handled = handleHealthCheckRequest(req, res);
    expect(handled).toBe(false);
    expect(res.writeHead).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  it('5. health status has serverTime within acceptable range of now', () => {
    const req: any = { url: '/health', method: 'GET' };
    const res = mockResponse();

    handleHealthCheckRequest(req, res);
    const json = JSON.parse(res.end.mock.calls[0][0]);
    expect(Math.abs(json.serverTime - Date.now())).toBeLessThan(5000);
  });
});
