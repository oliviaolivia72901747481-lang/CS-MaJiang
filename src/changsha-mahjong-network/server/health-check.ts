import { IncomingMessage, ServerResponse } from 'http';
import { getAllRooms } from './room-manager.js';
import { getLocalNetworkInfo } from './network-info.js';

export interface ServerHealthStatus {
  ok: boolean;
  serverTime: number;
  socketPort: number;
  activeRooms: number;
  activeSockets: number;
}

export function handleHealthCheckRequest(
  req: IncomingMessage,
  res: ServerResponse,
  ioInstance?: any
): boolean {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    res.end();
    return true;
  }

  const url = req.url || '';

  if (url === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    });

    const activeRooms = getAllRooms().length;
    const activeSockets = ioInstance ? ioInstance.engine.clientsCount : 0;

    const status: ServerHealthStatus = {
      ok: true,
      serverTime: Date.now(),
      socketPort: 3001,
      activeRooms,
      activeSockets,
    };

    res.end(JSON.stringify(status));
    return true;
  }

  if (url === '/network-info') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    });

    const info = getLocalNetworkInfo({ frontendPort: 5173, socketPort: 3001 });
    res.end(JSON.stringify(info));
    return true;
  }

  return false;
}
