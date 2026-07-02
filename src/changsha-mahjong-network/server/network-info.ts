import os from 'os';

export interface LocalNetworkInfo {
  hostname: string;
  lanIPs: string[];
  frontendPort: number;
  socketPort: number;
  frontendUrls: string[];
  socketUrls: string[];
}

export function getLocalNetworkInfo(input: {
  frontendPort: number;
  socketPort: number;
}): LocalNetworkInfo {
  const { frontendPort, socketPort } = input;
  const hostname = os.hostname();
  const lanIPs: string[] = [];

  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const list = interfaces[name];
    if (!list) continue;
    for (const info of list) {
      // We only care about IPv4 non-internal loopbacks
      if (info.family === 'IPv4' && !info.internal) {
        lanIPs.push(info.address);
      }
    }
  }

  // Sort LAN IPs to prioritize common private ranges
  lanIPs.sort((a, b) => {
    const isPrivate = (ip: string) => {
      return (
        ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        ip.startsWith('172.')
      );
    };
    const aPri = isPrivate(a) ? 1 : 0;
    const bPri = isPrivate(b) ? 1 : 0;
    return bPri - aPri;
  });

  const frontendUrls = [
    `http://localhost:${frontendPort}`,
    ...lanIPs.map(ip => `http://${ip}:${frontendPort}`)
  ];

  const socketUrls = [
    `http://localhost:${socketPort}`,
    ...lanIPs.map(ip => `http://${ip}:${socketPort}`)
  ];

  return {
    hostname,
    lanIPs,
    frontendPort,
    socketPort,
    frontendUrls,
    socketUrls
  };
}
