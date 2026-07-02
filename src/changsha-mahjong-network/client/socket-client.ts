import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(serverUrl?: string): Socket {
  let targetUrl = serverUrl;
  if (!targetUrl) {
    const envUrl = (import.meta as any).env?.VITE_SOCKET_URL;
    if (envUrl) {
      targetUrl = envUrl;
    } else if (typeof window !== 'undefined' && window.location) {
      targetUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
    } else {
      targetUrl = 'http://localhost:3001';
    }
  }

  if (!socket) {
    socket = io(targetUrl, {
      autoConnect: false,
      reconnection: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function clearClientSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}