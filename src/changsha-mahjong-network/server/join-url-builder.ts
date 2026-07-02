export function buildJoinUrl(ip: string, port: number, roomId: string): string {
  const cleanIp = ip.trim();
  return `http://${cleanIp}:${port}/?mode=online&roomId=${encodeURIComponent(roomId)}`;
}
