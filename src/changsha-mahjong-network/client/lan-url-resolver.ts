export interface JoinUrlCandidate {
  label: string;
  host: string;
  url: string;
  isLoopback: boolean;
  isLan: boolean;
  recommended: boolean;
}

export function buildJoinUrlCandidates(input: {
  currentProtocol: string;
  currentHostname: string;
  frontendPort: number;
  roomId: string;
  lanIPs: string[];
}): JoinUrlCandidate[] {
  const { currentProtocol, currentHostname, frontendPort, roomId, lanIPs } = input;
  const candidates: JoinUrlCandidate[] = [];

  const checkLoopback = (host: string) => {
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
  };

  const checkLan = (host: string) => {
    return (
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.')
    );
  };

  const currentIsLoopback = checkLoopback(currentHostname);
  const currentIsLan = checkLan(currentHostname);
  const protocol = currentProtocol.endsWith(':') ? currentProtocol : `${currentProtocol}:`;

  const makeUrl = (h: string) => `${protocol}//${h}:${frontendPort}/?mode=online&roomId=${encodeURIComponent(roomId)}`;

  candidates.push({
    label: currentIsLoopback ? '本地环回 (手机不可用)' : (currentIsLan ? '当前局域网地址' : '当前访问地址'),
    host: currentHostname,
    url: makeUrl(currentHostname),
    isLoopback: currentIsLoopback,
    isLan: currentIsLan,
    recommended: false
  });

  for (const ip of lanIPs) {
    if (ip !== currentHostname) {
      candidates.push({
        label: '局域网推荐地址',
        host: ip,
        url: makeUrl(ip),
        isLoopback: false,
        isLan: true,
        recommended: false
      });
    }
  }

  // Determine recommended index
  let recommendedIndex = 0;
  if (currentIsLoopback) {
    const firstLanIdx = candidates.findIndex(c => c.isLan);
    if (firstLanIdx !== -1) {
      recommendedIndex = firstLanIdx;
    }
  }

  if (candidates.length > 0) {
    candidates[recommendedIndex].recommended = true;
  }

  return candidates;
}

export function selectRecommendedJoinUrl(candidates: JoinUrlCandidate[]): JoinUrlCandidate {
  const rec = candidates.find(c => c.recommended);
  return rec || candidates[0];
}
