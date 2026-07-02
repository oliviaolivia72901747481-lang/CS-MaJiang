import { Room, PlayerSession, GameSession } from './network-types.js';
import { randomBytes } from 'crypto';

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function createRoom(): Room {
  const roomId = generateRoomId();
  const room: Room = {
    roomId,
    createdAt: Date.now(),
    status: 'waiting',
    seats: {
      0: null,
      1: null,
      2: null,
      3: null,
    },
    aiSeats: [],
  };
  rooms.set(roomId, room);
  return room;
}

export function joinRoom(roomId: string, playerName: string): { room: Room; seat: 0 | 1 | 2 | 3 } {
  const room = rooms.get(roomId);
  if (!room) {
    throw new Error(`Room ${roomId} not found.`);
  }

  // Prevent duplicate player names in the room
  for (const s of [0, 1, 2, 3] as const) {
    const seatPlayer = room.seats[s];
    if (seatPlayer && seatPlayer.playerName === playerName) {
      throw new Error(`玩家名称 "${playerName}" 已在对局房间中，请修改昵称重新加入`);
    }
  }

  // Find first empty seat
  let targetSeat: 0 | 1 | 2 | 3 | null = null;
  for (const s of [0, 1, 2, 3] as const) {
    if (room.seats[s] === null) {
      targetSeat = s;
      break;
    }
  }

  if (targetSeat === null) {
    throw new Error('Room is full.');
  }

  const sessionId = randomBytes(16).toString('hex');
  const token = randomBytes(16).toString('hex');
  const session: PlayerSession = {
    seat: targetSeat,
    playerName,
    sessionId,
    token,
    socketId: null,
    connectionState: 'online',
    connected: true,
    isAI: false,
    joinedAt: Date.now(),
    lastSeenAt: Date.now(),
  };

  room.seats[targetSeat] = session;
  room.emptySince = undefined;
  return { room, seat: targetSeat };
}

export function leaveWaitingRoom(roomId: string, seat: 0 | 1 | 2 | 3): void {
  const room = rooms.get(roomId);
  if (!room) return;

  room.seats[seat] = null;
  const idx = room.aiSeats.indexOf(seat);
  if (idx !== -1) {
    room.aiSeats.splice(idx, 1);
  }

  // Check if room is empty of human players
  const hasHumans = Object.values(room.seats).some(s => s !== null && !s.isAI && s.connectionState !== 'left');
  if (!hasHumans && !room.emptySince) {
    room.emptySince = Date.now();
  }
}

export function markPlayerLeftDuringGame(roomId: string, seat: 0 | 1 | 2 | 3): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const session = room.seats[seat];
  if (session) {
    session.connectionState = 'left';
    session.connected = false;
    session.disconnectedAt = Date.now();
  }
}

export function leaveSettlementRoom(roomId: string, seat: 0 | 1 | 2 | 3): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const session = room.seats[seat];
  if (session) {
    session.connectionState = 'left';
    session.connected = false;
    session.disconnectedAt = Date.now();
  }
}

export function addSingleAI(roomId: string, seat: 0 | 1 | 2 | 3): void {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.status !== 'waiting') return;

  if (room.seats[seat] === null) {
    room.seats[seat] = {
      seat,
      playerName: `AI_Seat_${seat}`,
      sessionId: `ai-session-${seat}`,
      token: `ai-token-${seat}`,
      socketId: null,
      connectionState: 'ai',
      connected: true,
      isAI: true,
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
    };
    if (!room.aiSeats.includes(seat)) {
      room.aiSeats.push(seat);
    }
  }
}

export function removeAI(roomId: string, seat: number): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  if (room.status !== 'waiting') return false;

  const seatKey = Number(seat) as 0 | 1 | 2 | 3;
  if (isNaN(seatKey) || seatKey < 0 || seatKey > 3) return false;

  const session = room.seats[seatKey];
  if (session && session.isAI) {
    room.seats[seatKey] = null;
    const idx = room.aiSeats.indexOf(seatKey);
    if (idx !== -1) {
      room.aiSeats.splice(idx, 1);
    }
    return true;
  }
  return false;
}

export function fillSeatsWithAITo(roomId: string, targetCount: number): void {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.status !== 'waiting') return;

  const currentCount = Object.values(room.seats).filter(s => s !== null).length;
  if (currentCount >= targetCount) return;

  let needed = targetCount - currentCount;
  for (const s of [0, 1, 2, 3] as const) {
    if (needed <= 0) break;
    if (room.seats[s] === null) {
      addSingleAI(roomId, s);
      needed--;
    }
  }
}

export function fillEmptySeatsWithAI(roomId: string): void {
  fillSeatsWithAITo(roomId, 4);
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function clearAllRooms(): void {
  rooms.clear();
}

export function getAllRooms(): Room[] {
  return Array.from(rooms.values());
}

export function deleteRoom(roomId: string): void {
  rooms.delete(roomId);
}

// In-memory cleanup task
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    // Cleanup if older than 2 hours
    if (now - room.createdAt > 7200000) {
      rooms.delete(roomId);
    }
  }
}, 300000);
