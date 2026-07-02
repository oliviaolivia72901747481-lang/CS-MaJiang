import { useEffect, useState, useRef } from 'react';
import { getSocket } from './socket-client.js';
import { PlayerVisibleView, NetworkPlayerAction } from '../server/network-types.js';

export interface OnlineSessionState {
  roomId: string;
  seat: 0 | 1 | 2 | 3;
  playerName: string;
  sessionId: string;
  token: string;
  createdAt: number;
  lastSyncedAt?: number;
}

export function saveOnlineSession(session: {
  roomId: string;
  seat: 0 | 1 | 2 | 3;
  playerName: string;
  sessionId?: string;
  token: string;
}): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('online_room_id', session.roomId);
  localStorage.setItem('online_seat', session.seat.toString());
  localStorage.setItem('online_player_name', session.playerName);
  localStorage.setItem('online_session_id', session.sessionId || 'compat-session-id');
  localStorage.setItem('online_token', session.token);
}

export function loadOnlineSession(): OnlineSessionState | null {
  if (typeof localStorage === 'undefined') return null;
  const roomId = localStorage.getItem('online_room_id') || undefined;
  const seatStr = localStorage.getItem('online_seat');
  const playerName = localStorage.getItem('online_player_name') || undefined;
  const sessionId = localStorage.getItem('online_session_id') || undefined;
  const token = localStorage.getItem('online_token') || undefined;
  
  const seat = seatStr !== null ? (parseInt(seatStr, 10) as 0 | 1 | 2 | 3) : undefined;
  if (!roomId || seat === undefined || !playerName || !sessionId || !token) {
    return null;
  }
  return { roomId, seat, playerName, sessionId, token, createdAt: Date.now() };
}

export function clearOnlineSession(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('online_room_id');
  localStorage.removeItem('online_seat');
  localStorage.removeItem('online_player_name');
  localStorage.removeItem('online_session_id');
  localStorage.removeItem('online_token');
}

export interface UseOnlineMahjongGameResult {
  connected: boolean;
  roomId?: string;
  seat?: 0 | 1 | 2 | 3;
  view: PlayerVisibleView | null;
  error?: string;
  actionPending: boolean;

  createRoom: (playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  fillAI: () => void;
  addAI: (seat: number) => void;
  removeAI: (seat: number) => void;
  fillSeatsWithAITo: (targetCount: number) => void;
  startGame: (options?: { requestedPlayerCount?: number; fillAIToPlayerCount?: number }) => void;
  discardTile: (tileInstanceId: string) => void;
  performAction: (action: NetworkPlayerAction) => void;
  sync: () => void;
  leaveRoom: (reason?: 'user_leave' | 'back_to_lobby') => Promise<void>;
}

export function useOnlineMahjongGame(serverUrl?: string): UseOnlineMahjongGameResult {
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | undefined>();
  const [seat, setSeat] = useState<0 | 1 | 2 | 3 | undefined>();
  const [view, setView] = useState<PlayerVisibleView | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [actionPending, setActionPending] = useState(false);

  const socketRef = useRef(getSocket(serverUrl));

  useEffect(() => {
    const socket = socketRef.current;
    
    socket.connect();
    setConnected(socket.connected);

    const handleConnect = () => {
      setConnected(true);
      const session = loadOnlineSession();
      if (session) {
        setRoomId(session.roomId);
        setSeat(session.seat);
        socket.emit('game:sync', { 
          roomId: session.roomId, 
          seat: session.seat, 
          sessionId: session.sessionId, 
          token: session.token 
        });
      }
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleRoomCreated = ({ roomId: rId, seat: sSeat, sessionId: sId, token }: any) => {
      setRoomId(rId);
      setSeat(sSeat);
      const savedName = localStorage.getItem('online_player_name') || '';
      saveOnlineSession({ roomId: rId, seat: sSeat, playerName: savedName, sessionId: sId, token });
      setActionPending(false);
    };

    const handleRoomJoined = ({ roomId: rId, seat: sSeat, sessionId: sId, token }: any) => {
      setRoomId(rId);
      setSeat(sSeat);
      const savedName = localStorage.getItem('online_player_name') || '';
      saveOnlineSession({ roomId: rId, seat: sSeat, playerName: savedName, sessionId: sId, token });
      setActionPending(false);
    };

    const handleRoomUpdated = (roomData: any) => {
      setActionPending(false);
      const mySeat = roomData.mySeat;
      const seats = roomData.seats;
      const aiSeats = roomData.aiSeats;

      const mySession = seats[mySeat];
      const self = {
        seat: mySeat,
        hand: [],
        melds: [],
        discards: [],
        score: 1000,
        playerName: mySession ? mySession.playerName : '',
      };

      const opponents = [0, 1, 2, 3]
        .filter(s => s !== mySeat)
        .map(s => {
          const session = seats[s as 0 | 1 | 2 | 3];
          return {
            seat: s as 0 | 1 | 2 | 3,
            handCount: 0,
            melds: [],
            discards: [],
            score: 1000,
            connected: session ? session.connected : false,
            isAI: aiSeats.includes(s) || session?.connectionState === 'ai',
            playerName: session ? session.playerName : '',
            connectionState: session?.connectionState,
          };
        });

      setView({
        roomId: roomData.roomId,
        seat: mySeat,
        phase: 'waiting',
        currentSeat: 0,
        dealerSeat: 0,
        self,
        opponents,
        pendingActions: [],
        logs: [],
        wallRemainingCount: 108,
      } as any);
    };

    const handleGameState = (gView: PlayerVisibleView) => {
      setActionPending(false);
      setView(gView);
    };

    const handleSyncFailed = ({ code, message }: any) => {
      setActionPending(false);
      setError(message || `同步失败: ${code}`);
      clearOnlineSession();
      setRoomId(undefined);
      setSeat(undefined);
      setView(null);
      setTimeout(() => setError(undefined), 5000);
    };

    const handleError = (errMsg: string) => {
      setActionPending(false);
      setError(errMsg);
      if (
        errMsg.includes('not found') || 
        errMsg.includes('no longer in this room') || 
        errMsg.includes('Session authentication failed') ||
        errMsg.includes('failed to join')
      ) {
        clearOnlineSession();
        setRoomId(undefined);
        setSeat(undefined);
        setView(null);
      }
      setTimeout(() => setError(undefined), 5000);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room:created', handleRoomCreated);
    socket.on('room:joined', handleRoomJoined);
    socket.on('room:updated', handleRoomUpdated);
    socket.on('game:state', handleGameState);
    socket.on('game:sync-failed', handleSyncFailed);
    socket.on('error', handleError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room:created', handleRoomCreated);
      socket.off('room:joined', handleRoomJoined);
      socket.off('room:updated', handleRoomUpdated);
      socket.off('game:state', handleGameState);
      socket.off('game:sync-failed', handleSyncFailed);
      socket.off('error', handleError);
    };
  }, []);

  const createRoom = (playerName: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('online_player_name', playerName);
    }
    setActionPending(true);
    socketRef.current.emit('room:create', { playerName });
  };

  const joinRoom = (rId: string, playerName: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('online_player_name', playerName);
    }
    setActionPending(true);
    socketRef.current.emit('room:join', { roomId: rId, playerName });
  };

  const fillAI = () => {
    if (!roomId || actionPending) return;
    setActionPending(true);
    socketRef.current.emit('room:fill-ai', { roomId });
  };

  const addAI = (s: number) => {
    if (!roomId || actionPending) return;
    setActionPending(true);
    socketRef.current.emit('room:add-ai', { roomId, seat: s });
  };

  const removeAI = (s: number) => {
    if (!roomId || actionPending) return;
    setActionPending(true);
    socketRef.current.emit('room:remove-ai', { roomId, seat: s });
  };

  const fillSeatsWithAITo = (targetCount: number) => {
    if (!roomId || actionPending) return;
    setActionPending(true);
    socketRef.current.emit('room:fill-ai', { roomId, targetCount });
  };

  const startGame = (options?: { requestedPlayerCount?: number; fillAIToPlayerCount?: number }) => {
    if (!roomId || actionPending) return;
    setActionPending(true);
    socketRef.current.emit('game:start', { roomId, ...options });
  };

  const discardTile = (tileInstanceId: string) => {
    if (!roomId || seat === undefined || actionPending) return;
    setActionPending(true);
    const actionId = `act-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
    socketRef.current.emit('game:discard', { roomId, seat, tileInstanceId, actionId });
  };

  const performAction = (action: NetworkPlayerAction) => {
    if (!roomId || seat === undefined || actionPending) return;
    setActionPending(true);
    const actionId = `act-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
    const actionWithId = { ...action, actionId };
    socketRef.current.emit('game:action', { roomId, seat, action: actionWithId });
  };

  const sync = () => {
    if (!roomId || seat === undefined) return;
    const session = loadOnlineSession();
    if (session) {
      socketRef.current.emit('game:sync', { 
        roomId, 
        seat, 
        sessionId: session.sessionId || '', 
        token: session.token || '' 
      });
    }
  };

  const leaveRoom = (reason: 'user_leave' | 'back_to_lobby' = 'user_leave'): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!roomId || seat === undefined) {
        resolve();
        return;
      }
      
      const session = loadOnlineSession();
      if (!session) {
        clearOnlineSession();
        setRoomId(undefined);
        setSeat(undefined);
        setView(null);
        resolve();
        return;
      }

      if (!connected) {
        if (confirm("当前与服务器断开连接，确认本地清除席位信息吗？（服务端可能仍保留你的席位一段时间）")) {
          clearOnlineSession();
          setRoomId(undefined);
          setSeat(undefined);
          setView(null);
          resolve();
        } else {
          reject(new Error('Socket disconnected'));
        }
        return;
      }

      setActionPending(true);
      
      const onLeft = () => {
        socket.off('room:left', onLeft);
        socket.off('room:leave-failed', onFailed);
        clearOnlineSession();
        setRoomId(undefined);
        setSeat(undefined);
        setView(null);
        setActionPending(false);
        resolve();
      };

      const onFailed = (err: any) => {
        socket.off('room:left', onLeft);
        socket.off('room:leave-failed', onFailed);
        setError(err.message || '退出房间失败');
        setActionPending(false);
        setTimeout(() => setError(undefined), 5000);
        reject(new Error(err.message || '退出房间失败'));
      };

      socket.on('room:left', onLeft);
      socket.on('room:leave-failed', onFailed);

      socket.emit('room:leave', {
        roomId,
        seat,
        sessionId: session.sessionId,
        token: session.token,
        reason
      });
    });
  };

  return {
    connected,
    roomId,
    seat,
    view,
    error,
    actionPending,
    createRoom,
    joinRoom,
    fillAI,
    addAI,
    removeAI,
    fillSeatsWithAITo,
    startGame,
    discardTile,
    performAction,
    sync,
    leaveRoom,
  };
}
