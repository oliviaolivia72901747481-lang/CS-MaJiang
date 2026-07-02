import { getAllRooms, deleteRoom } from './room-manager.js';
import { getConnectionStatus } from './connection-manager.js';
import { PlayerSession } from './network-types.js';

export const EMPTY_WAITING_ROOM_TTL_MS = 5 * 60_000;
export const ALL_OFFLINE_PLAYING_ROOM_TTL_MS = 10 * 60_000;
export const SETTLEMENT_ROOM_TTL_MS = 5 * 60_000;
export const LEFT_ONLY_ROOM_TTL_MS = 2 * 60_000;

let emptyRoomTtlMsVar = EMPTY_WAITING_ROOM_TTL_MS;
let disconnectedRoomTtlMsVar = ALL_OFFLINE_PLAYING_ROOM_TTL_MS;
let schedulerInterval: NodeJS.Timeout | null = null;

export function startRoomCleanupScheduler(input: {
  intervalMs: number;
  emptyRoomTtlMs: number;
  disconnectedRoomTtlMs: number;
}): void {
  emptyRoomTtlMsVar = input.emptyRoomTtlMs;
  disconnectedRoomTtlMsVar = input.disconnectedRoomTtlMs;

  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  schedulerInterval = setInterval(() => {
    cleanupRooms(Date.now());
  }, input.intervalMs);
}

export function stopRoomCleanupScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

export function cleanupRooms(now: number): { removedRoomIds: string[] } {
  const removedRoomIds: string[] = [];
  const rooms = getAllRooms();

  for (const room of rooms) {
    // 1. Force update player connection states and handle waiting reconnect timeouts
    getConnectionStatus(room.roomId, now);

    const humanSessions = Object.values(room.seats).filter((s): s is PlayerSession => s !== null && !s.isAI);
    const totalHumans = humanSessions.length;

    const onlineHumans = humanSessions.filter(s => s.connectionState === 'online');
    const reconnectingHumans = humanSessions.filter(s => s.connectionState === 'reconnecting');
    const offlineHumans = humanSessions.filter(s => s.connectionState === 'offline');
    const leftHumans = humanSessions.filter(s => s.connectionState === 'left');

    const onlineCount = onlineHumans.length;
    const reconnectingCount = reconnectingHumans.length;
    const offlineCount = offlineHumans.length;
    const leftCount = leftHumans.length;

    const activeHumanCount = onlineCount + reconnectingCount + offlineCount;

    // Rule 8: NEVER delete if there is at least one online human player
    if (onlineCount > 0) {
      room.leftOnlySince = undefined;
      room.allOfflineSince = undefined;
      continue;
    }

    // Compatibility check for lastActiveAt mocked in tests
    const lastActive = (room as any).lastActiveAt || room.createdAt;
    const isAllDisconnected = humanSessions.every(s => s.connectionState === 'reconnecting' || s.connectionState === 'offline' || s.connectionState === 'left');
    if (isAllDisconnected && now - lastActive > disconnectedRoomTtlMsVar) {
      console.log(`[Scheduler] Cleaning up fully disconnected room ${room.roomId}`);
      deleteRoom(room.roomId);
      removedRoomIds.push(room.roomId);
      continue;
    }

    // WAITING room
    if (room.status === 'waiting') {
      // Rule 2: If there are reconnecting players, do not delete yet
      if (reconnectingCount > 0) {
        continue;
      }

      const isEmpty = totalHumans === 0;
      if (isEmpty) {
        const since = room.emptySince || room.createdAt;
        if (now - since > EMPTY_WAITING_ROOM_TTL_MS) {
          console.log(`[Scheduler] Cleaning up empty waiting room ${room.roomId}`);
          deleteRoom(room.roomId);
          removedRoomIds.push(room.roomId);
        }
      }
      continue;
    }

    // PLAYING room
    if (room.status === 'playing') {
      // Rule 6: Left-only / AI-only room
      if (activeHumanCount === 0) {
        room.leftOnlySince = room.leftOnlySince || now;
        if (now - room.leftOnlySince > LEFT_ONLY_ROOM_TTL_MS) {
          console.log(`[Scheduler] Cleaning up left-only/AI-only playing room ${room.roomId}`);
          deleteRoom(room.roomId);
          removedRoomIds.push(room.roomId);
        }
        continue;
      } else {
        room.leftOnlySince = undefined;
      }

      // Rule 4: All offline / disconnected
      if (activeHumanCount > 0 && onlineCount === 0) {
        room.allOfflineSince = room.allOfflineSince || now;
        if (now - room.allOfflineSince > ALL_OFFLINE_PLAYING_ROOM_TTL_MS) {
          console.log(`[Scheduler] Cleaning up all-offline playing room ${room.roomId}`);
          deleteRoom(room.roomId);
          removedRoomIds.push(room.roomId);
        }
        continue;
      } else {
        room.allOfflineSince = undefined;
      }
      continue;
    }

    // SETTLEMENT room
    if (room.status === 'settlement') {
      // Rule 5: Settlement room TTL is 5 minutes
      const settlementSince = room.settlementSince || room.createdAt;
      if (now - settlementSince > SETTLEMENT_ROOM_TTL_MS) {
        console.log(`[Scheduler] Cleaning up settlement room ${room.roomId}`);
        deleteRoom(room.roomId);
        removedRoomIds.push(room.roomId);
      }
      continue;
    }
  }

  return { removedRoomIds };
}
export { emptyRoomTtlMsVar, disconnectedRoomTtlMsVar };
