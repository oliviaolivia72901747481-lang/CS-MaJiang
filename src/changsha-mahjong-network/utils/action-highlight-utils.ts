import { Tile, Meld, PendingAction, ActionType } from '../../changsha-mahjong/index.js';
import { PlayerVisibleView } from '../server/network-types.js';
import { getActionSourceEvent, ActionSourceEvent } from './latest-discard-helper.js';

export type HighlightRole =
  | 'source'
  | 'hand-participant'
  | 'candidate'
  | 'meld-new';

export interface ActionCandidateGroup {
  id: string;
  actionType: ActionType;
  label: string;

  sourceSeat?: number;
  sourcePlayerLabel?: string;
  sourceTile?: Tile;
  sourceTileKey?: string;

  handTiles: Tile[];
  tiles: Tile[];

  submitPayload: any;
}

export interface ActionHighlightModel {
  sourceEvent: ActionSourceEvent | null;
  candidateGroups: ActionCandidateGroup[];
  highlightedHandTileKeys: string[];
  latestFormedMeldId?: string;
}

export function getTileChineseName(tile: Tile): string {
  const suitNames: Record<string, string> = {
    wan: '万',
    tong: '筒',
    tiao: '条'
  };
  return `${tile.rank}${suitNames[tile.suit] || tile.suit}`;
}

export function extractTileKey(opt: any): string {
  if (Array.isArray(opt)) {
    if (opt.length === 0) return '';
    return extractTileKey(opt[0]);
  }
  if (typeof opt === 'string') {
    return opt;
  }
  if (opt && opt.suit && opt.rank) {
    return `${opt.suit}_${opt.rank}`;
  }
  return '';
}

export function buildChiCandidates(view: PlayerVisibleView, selfSeat: number): ActionCandidateGroup[] {
  const chiAction = view.pendingActions.find(a => a.type === 'chi');
  if (!chiAction || !chiAction.options) return [];
  const sourceTile = chiAction.tile;
  if (!sourceTile) return [];

  const actionSourceEvent = getActionSourceEvent(view, selfSeat);

  return chiAction.options.map((opt, idx) => {
    const optionId = opt.map(t => `${t.suit}_${t.rank}`).sort().join(',');
    
    let sourceIndex = opt.findIndex(t => t.instanceId === sourceTile.instanceId);
    if (sourceIndex === -1) {
      sourceIndex = opt.findIndex(t => t.suit === sourceTile.suit && t.rank === sourceTile.rank);
    }
    
    const handTiles = opt.filter((_, tIdx) => tIdx !== sourceIndex);
    
    // Map to actual hand tile references if available
    const matchedHandTiles = handTiles.map(ht => {
      const found = view.self.hand.find(handTile => handTile.suit === ht.suit && handTile.rank === ht.rank);
      return found || ht;
    });

    return {
      id: `chi-${idx}`,
      actionType: 'chi',
      label: `吃 ${opt.map(t => getTileChineseName(t)).join('')}`,
      sourceSeat: actionSourceEvent?.seat,
      sourcePlayerLabel: actionSourceEvent?.playerLabel,
      sourceTile: sourceTile,
      sourceTileKey: `${sourceTile.suit}_${sourceTile.rank}`,
      handTiles: matchedHandTiles,
      tiles: opt,
      submitPayload: { type: 'chi', optionId }
    };
  });
}

export function buildPengCandidate(view: PlayerVisibleView, selfSeat: number): ActionCandidateGroup | null {
  const pengAction = view.pendingActions.find(a => a.type === 'peng');
  if (!pengAction || !pengAction.tile) return null;
  const sourceTile = pengAction.tile;
  const actionSourceEvent = getActionSourceEvent(view, selfSeat);

  const handTiles = view.self.hand.filter(t => t.suit === sourceTile.suit && t.rank === sourceTile.rank).slice(0, 2);
  const tiles = [sourceTile, ...handTiles];

  return {
    id: 'peng-0',
    actionType: 'peng',
    label: `碰 ${getTileChineseName(sourceTile)}`,
    sourceSeat: actionSourceEvent?.seat,
    sourcePlayerLabel: actionSourceEvent?.playerLabel,
    sourceTile: sourceTile,
    sourceTileKey: `${sourceTile.suit}_${sourceTile.rank}`,
    handTiles,
    tiles,
    submitPayload: { type: 'peng' }
  };
}

export function buildMingGangCandidate(view: PlayerVisibleView, selfSeat: number): ActionCandidateGroup | null {
  const gangAction = view.pendingActions.find(a => a.type === 'mingGang');
  if (!gangAction || !gangAction.tile) return null;
  const sourceTile = gangAction.tile;
  const actionSourceEvent = getActionSourceEvent(view, selfSeat);

  const handTiles = view.self.hand.filter(t => t.suit === sourceTile.suit && t.rank === sourceTile.rank).slice(0, 3);
  const tiles = [sourceTile, ...handTiles];

  return {
    id: 'mingGang-0',
    actionType: 'mingGang',
    label: `直杠 ${getTileChineseName(sourceTile)}`,
    sourceSeat: actionSourceEvent?.seat,
    sourcePlayerLabel: actionSourceEvent?.playerLabel,
    sourceTile: sourceTile,
    sourceTileKey: `${sourceTile.suit}_${sourceTile.rank}`,
    handTiles,
    tiles,
    submitPayload: { type: 'gang', gangType: 'mingGang', tileKey: `${sourceTile.suit}_${sourceTile.rank}` }
  };
}

export function buildAnGangCandidates(view: PlayerVisibleView): ActionCandidateGroup[] {
  const gangAction = view.pendingActions.find(a => a.type === 'anGang');
  if (!gangAction) return [];

  const options = gangAction.options || (gangAction.tile ? [gangAction.tile] : []);
  return options.map((opt: any, idx: number) => {
    const tileKey = extractTileKey(opt);
    const [suit, rankStr] = tileKey.split('_');
    const rank = parseInt(rankStr, 10);

    let handTiles: Tile[] = [];
    if (Array.isArray(opt) && opt.length === 4 && typeof opt[0] !== 'string') {
      handTiles = opt;
    } else {
      handTiles = view.self.hand.filter(t => t.suit === suit && t.rank === rank).slice(0, 4);
    }

    return {
      id: `anGang-${idx}`,
      actionType: 'anGang',
      label: `暗杠 ${getTileChineseName({ suit, rank } as Tile)}`,
      handTiles,
      tiles: handTiles,
      submitPayload: { type: 'gang', gangType: 'anGang', tileKey }
    };
  });
}

export function buildBuGangCandidates(view: PlayerVisibleView): ActionCandidateGroup[] {
  const gangAction = view.pendingActions.find(a => a.type === 'buGang');
  if (!gangAction) return [];

  const options = gangAction.options || (gangAction.tile ? [gangAction.tile] : []);
  return options.map((opt: any, idx: number) => {
    const tileKey = extractTileKey(opt);
    const [suit, rankStr] = tileKey.split('_');
    const rank = parseInt(rankStr, 10);

    const matchingHandTile = view.self.hand.find(t => t.suit === suit && t.rank === rank);
    const handTiles = matchingHandTile ? [matchingHandTile] : [];

    const matchingMeld = view.self.melds.find(
      m => m.type === 'peng' && m.tiles.length > 0 && m.tiles[0].suit === suit && m.tiles[0].rank === rank
    );
    const meldTiles = matchingMeld ? matchingMeld.tiles : [];
    const tiles = [...meldTiles, ...handTiles];

    return {
      id: `buGang-${idx}`,
      actionType: 'buGang',
      label: `补杠 ${getTileChineseName({ suit, rank } as Tile)}`,
      handTiles,
      tiles,
      submitPayload: { type: 'gang', gangType: 'buGang', tileKey }
    };
  });
}

export function buildHuCandidate(view: PlayerVisibleView, selfSeat: number): ActionCandidateGroup | null {
  const huAction = view.pendingActions.find(a => a.type === 'hu' || a.type === 'ziMo');
  if (!huAction) return null;

  const actionSourceEvent = getActionSourceEvent(view, selfSeat);
  const sourceTile = huAction.tile || actionSourceEvent?.tile;

  return {
    id: 'hu-0',
    actionType: huAction.type === 'ziMo' ? 'ziMo' : 'hu',
    label: huAction.type === 'ziMo' ? '自摸' : '胡牌',
    sourceSeat: actionSourceEvent?.seat,
    sourcePlayerLabel: actionSourceEvent?.playerLabel,
    sourceTile,
    sourceTileKey: sourceTile ? `${sourceTile.suit}_${sourceTile.rank}` : undefined,
    handTiles: [],
    tiles: [],
    submitPayload: { type: 'hu' }
  };
}

export function getHighlightedHandTileKeys(candidateGroups: ActionCandidateGroup[]): string[] {
  const keys = new Set<string>();
  for (const cand of candidateGroups) {
    for (const tile of cand.handTiles) {
      keys.add(`${tile.suit}_${tile.rank}`);
      if (tile.instanceId) {
        keys.add(tile.instanceId);
      }
    }
  }
  return Array.from(keys);
}

export function buildActionHighlightModel(view: PlayerVisibleView, selfSeat: number): ActionHighlightModel {
  const sourceEvent = getActionSourceEvent(view, selfSeat);
  const candidateGroups: ActionCandidateGroup[] = [];

  candidateGroups.push(...buildChiCandidates(view, selfSeat));

  const pengCand = buildPengCandidate(view, selfSeat);
  if (pengCand) candidateGroups.push(pengCand);

  const mingGangCand = buildMingGangCandidate(view, selfSeat);
  if (mingGangCand) candidateGroups.push(mingGangCand);

  candidateGroups.push(...buildAnGangCandidates(view));
  candidateGroups.push(...buildBuGangCandidates(view));

  const huCand = buildHuCandidate(view, selfSeat);
  if (huCand) candidateGroups.push(huCand);

  const highlightedHandTileKeys = getHighlightedHandTileKeys(candidateGroups);

  return {
    sourceEvent,
    candidateGroups,
    highlightedHandTileKeys
  };
}

export function normalizeActionCandidateOptions(action: PendingAction): ActionCandidateGroup[] {
  return [];
}

export function getCandidateSubmitPayload(candidate: ActionCandidateGroup): any {
  return candidate.submitPayload;
}
