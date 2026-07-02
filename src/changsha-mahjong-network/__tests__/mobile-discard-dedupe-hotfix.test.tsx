/**
 * mobile-discard-dedupe-hotfix.test.tsx
 *
 * v0.8.6-hotfix-mobile-discard-dedupe
 *
 * Verifies that the mobile opponent strip no longer renders ordinary discards.
 * Discards are only shown in the center area (MobileCenterDiscardArea,
 * MobileDiscardHistoryDrawer).
 * Player-facing areas only show melds (chi/peng/gang).
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers: tile / meld factories
// ---------------------------------------------------------------------------

function makeTile(suit: string, rank: number, instanceId?: string) {
  return {
    suit,
    rank,
    instanceId: instanceId || `${suit}_${rank}_${Math.random().toString(36).slice(2, 8)}`,
  };
}

function makeChiMeld(suit: string, startRank: number) {
  return {
    type: 'chi',
    tiles: [
      makeTile(suit, startRank),
      makeTile(suit, startRank + 1),
      makeTile(suit, startRank + 2),
    ],
  };
}

function makePengMeld(suit: string, rank: number) {
  return {
    type: 'peng',
    tiles: [makeTile(suit, rank), makeTile(suit, rank), makeTile(suit, rank)],
  };
}

function makeMingGangMeld(suit: string, rank: number) {
  return {
    type: 'mingGang',
    tiles: [
      makeTile(suit, rank),
      makeTile(suit, rank),
      makeTile(suit, rank),
      makeTile(suit, rank),
    ],
  };
}

function makeAnGangMeld(suit: string, rank: number) {
  return {
    type: 'anGang',
    tiles: [
      makeTile(suit, rank),
      makeTile(suit, rank),
      makeTile(suit, rank),
      makeTile(suit, rank),
    ],
  };
}

function makeBuGangMeld(suit: string, rank: number) {
  return {
    type: 'buGang',
    tiles: [
      makeTile(suit, rank),
      makeTile(suit, rank),
      makeTile(suit, rank),
      makeTile(suit, rank),
    ],
  };
}

// ---------------------------------------------------------------------------
// Import the actual MobileOpponentStrip source to verify discards are removed
// ---------------------------------------------------------------------------
import * as fs from 'fs';
import * as path from 'path';

const opponentStripPath = path.resolve(
  __dirname,
  '../components/MobileOpponentStrip.tsx'
);
const opponentStripSource = fs.readFileSync(opponentStripPath, 'utf-8');

const mobileLayoutPath = path.resolve(
  __dirname,
  '../components/MobileOnlineGameLayout.tsx'
);
const mobileLayoutSource = fs.readFileSync(mobileLayoutPath, 'utf-8');

const meldAreaPath = path.resolve(
  __dirname,
  '../components/MobileMeldArea.tsx'
);
const meldAreaSource = fs.readFileSync(meldAreaPath, 'utf-8');

// ---------------------------------------------------------------------------
// Scenario 1: Discards only in center area
// ---------------------------------------------------------------------------
describe('v0.8.6-hotfix-mobile-discard-dedupe', () => {
  describe('Scenario 1: Ordinary discards only displayed in center area', () => {
    it('MobileOpponentStrip does NOT render player.discards', () => {
      // The component should no longer reference .discards for rendering
      // Search for any JSX that iterates over discards to render tiles
      const hasDiscardMap = opponentStripSource.includes('discards.map');
      const hasDiscardSlice = opponentStripSource.includes('discards.slice');
      const hasDiscardRiver = opponentStripSource.includes('mobile-discard-river');

      expect(hasDiscardMap).toBe(false);
      expect(hasDiscardSlice).toBe(false);
      expect(hasDiscardRiver).toBe(false);
    });

    it('MobileOpponentStrip does NOT import TileView directly (uses MobileMeldArea instead)', () => {
      // After the fix, TileView is no longer directly imported since we delegate to MobileMeldArea
      const importsTileView = opponentStripSource.includes("from './TileView");
      expect(importsTileView).toBe(false);
    });

    it('MobileOnlineGameLayout no longer renders the redundant MobileLatestDiscardDock', () => {
      expect(mobileLayoutSource).not.toContain('MobileLatestDiscardDock');
      expect(mobileLayoutSource).not.toContain('<MobileLatestDiscardDock');
    });

    it('MobileOnlineGameLayout still renders MobileCenterDiscardArea', () => {
      expect(mobileLayoutSource).toContain('MobileCenterDiscardArea');
      expect(mobileLayoutSource).toContain('<MobileCenterDiscardArea');
    });

    it('MobileOnlineGameLayout still renders MobileDiscardHistoryDrawer', () => {
      expect(mobileLayoutSource).toContain('MobileDiscardHistoryDrawer');
      expect(mobileLayoutSource).toContain('<MobileDiscardHistoryDrawer');
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: Player-facing area only shows melds
  // ---------------------------------------------------------------------------
  describe('Scenario 2: Player-facing area only shows melds', () => {
    it('MobileOpponentStrip imports and uses MobileMeldArea', () => {
      expect(opponentStripSource).toContain("from './MobileMeldArea");
      expect(opponentStripSource).toContain('<MobileMeldArea');
    });

    it('MobileOpponentStrip renders MobileMeldArea with compact=true', () => {
      expect(opponentStripSource).toContain('compact={true}');
    });

    it('MobileOpponentStrip passes player.melds to MobileMeldArea', () => {
      expect(opponentStripSource).toContain('melds={player.melds}');
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: Empty melds — no discards shown as substitute
  // ---------------------------------------------------------------------------
  describe('Scenario 3: No discards shown when melds is empty', () => {
    it('MobileOpponentStrip conditionally renders MobileMeldArea only when melds.length > 0', () => {
      expect(opponentStripSource).toContain('player.melds.length > 0');
    });

    it('MobileOpponentStrip does NOT fallback to rendering discards when melds is empty', () => {
      // There should be no conditional path that renders discards
      const rendersDiscards = opponentStripSource.includes('player.discards') &&
        (opponentStripSource.includes('<TileView') || opponentStripSource.includes('discards.map'));
      expect(rendersDiscards).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 4: My melds area preserved
  // ---------------------------------------------------------------------------
  describe('Scenario 4: My melds area preserved in MobileOnlineGameLayout', () => {
    it('MobileOnlineGameLayout keeps my melds while removing the redundant title', () => {
      expect(mobileLayoutSource).not.toContain('我的副露');
      expect(mobileLayoutSource).toContain('<MobileMeldArea melds={pBottom.melds}');
    });

    it('My melds section does NOT render discards', () => {
      // The "我的副露" section should pass melds, not discards
      const myMeldSection = mobileLayoutSource.includes('<MobileMeldArea melds={pBottom.discards}');
      expect(myMeldSection).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 5: latestDiscardEvent not affected
  // ---------------------------------------------------------------------------
  describe('Scenario 5: latest discard and action source still used in MobileOnlineGameLayout', () => {
    it('MobileOnlineGameLayout still calls getLatestDiscardEvent', () => {
      expect(mobileLayoutSource).toContain('getLatestDiscardEvent');
    });

    it('MobileOnlineGameLayout still derives action source from the highlight model', () => {
      expect(mobileLayoutSource).toContain('buildActionHighlightModel');
      expect(mobileLayoutSource).toContain('relativeActionSourceEvent');
      expect(mobileLayoutSource).toContain('sourcePlayerLabel: getRelativeLabel');
    });

    it('MobileOnlineGameLayout still resolves latest discard for the center river', () => {
      expect(mobileLayoutSource).toContain('const latestDiscardEvent = getLatestDiscardEvent(view, seat)');
      expect(mobileLayoutSource).toContain('const lastDiscardTile = latestDiscardEvent');
    });

    it('MobileOnlineGameLayout still passes lastDiscardTile to MobileCenterDiscardArea', () => {
      expect(mobileLayoutSource).toContain('lastDiscardTile={lastDiscardTile}');
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 6: Meld types rendered correctly
  // ---------------------------------------------------------------------------
  describe('Scenario 6: All meld types supported by MobileMeldArea', () => {
    it('MobileMeldArea supports chi meld type', () => {
      expect(meldAreaSource).toContain("chi: '吃'");
    });

    it('MobileMeldArea supports peng meld type', () => {
      expect(meldAreaSource).toContain("peng: '碰'");
    });

    it('MobileMeldArea supports mingGang meld type', () => {
      expect(meldAreaSource).toContain("mingGang:");
    });

    it('MobileMeldArea supports buGang meld type', () => {
      expect(meldAreaSource).toContain("buGang:");
    });

    it('MobileMeldArea supports anGang meld type with privacy (hidden tiles)', () => {
      expect(meldAreaSource).toContain("anGang:");
      // Verify anGang hides middle tiles for privacy
      expect(meldAreaSource).toContain("isAnGang");
      expect(meldAreaSource).toContain("hidden");
    });

    it('MobileMeldArea has compact mode for opponent strips', () => {
      expect(meldAreaSource).toContain('compact');
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 7: Structural unit tests for meld/discard data separation
  // ---------------------------------------------------------------------------
  describe('Scenario 7: Meld and discard data separation', () => {
    it('chi meld has correct structure with 3 tiles', () => {
      const meld = makeChiMeld('wan', 5);
      expect(meld.type).toBe('chi');
      expect(meld.tiles).toHaveLength(3);
      expect(meld.tiles[0].rank).toBe(5);
      expect(meld.tiles[1].rank).toBe(6);
      expect(meld.tiles[2].rank).toBe(7);
    });

    it('peng meld has correct structure with 3 identical tiles', () => {
      const meld = makePengMeld('tong', 3);
      expect(meld.type).toBe('peng');
      expect(meld.tiles).toHaveLength(3);
      meld.tiles.forEach(t => expect(t.rank).toBe(3));
    });

    it('mingGang meld has correct structure with 4 tiles', () => {
      const meld = makeMingGangMeld('tiao', 7);
      expect(meld.type).toBe('mingGang');
      expect(meld.tiles).toHaveLength(4);
    });

    it('anGang meld has correct structure with 4 tiles', () => {
      const meld = makeAnGangMeld('wan', 1);
      expect(meld.type).toBe('anGang');
      expect(meld.tiles).toHaveLength(4);
    });

    it('buGang meld has correct structure with 4 tiles', () => {
      const meld = makeBuGangMeld('tong', 9);
      expect(meld.type).toBe('buGang');
      expect(meld.tiles).toHaveLength(4);
    });

    it('discards are plain tiles, not melds', () => {
      const discards = [makeTile('tong', 9), makeTile('tong', 6)];
      // Discards are just Tile objects — they have no 'type' property like melds
      discards.forEach(t => {
        expect(t).toHaveProperty('suit');
        expect(t).toHaveProperty('rank');
        expect(t).toHaveProperty('instanceId');
        expect(t).not.toHaveProperty('type');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 8: Desktop layout not affected
  // ---------------------------------------------------------------------------
  describe('Scenario 8: Desktop layout not affected', () => {
    const desktopPath = path.resolve(
      __dirname,
      '../components/OnlineGamePage.tsx'
    );
    const desktopSource = fs.readFileSync(desktopPath, 'utf-8');

    it('OnlineGamePage (desktop) is unchanged — still renders center discard area', () => {
      expect(desktopSource).toContain('center-discard-area');
      expect(desktopSource).toContain('renderCenterDiscardArea');
    });

    it('OnlineGamePage (desktop) still uses latestDiscardEvent', () => {
      expect(desktopSource).toContain('getLatestDiscardEvent');
    });

    it('OnlineGamePage (desktop) still renders MobileDiscardHistoryDrawer for history', () => {
      expect(desktopSource).toContain('MobileDiscardHistoryDrawer');
    });
  });
});
