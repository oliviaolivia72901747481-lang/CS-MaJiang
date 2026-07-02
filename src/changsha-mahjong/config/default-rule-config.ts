import { ChangshaRuleConfig } from '../types/rule-config.js';

export const DEFAULT_RULE_CONFIG: ChangshaRuleConfig = {
  baseScore: 1,
  scoreMode: 'changsha_6_7',

  smallHu: {
    need258Jiang: true,
    dianPao: 1,
    ziMoEach: 2,
  },

  bigHu: {
    dianPao: 6,
    ziMoEach: 7,
    allowStacking: true,
  },

  gang: {
    mingGang: 2,
    buGang: 1,
    anGang: 3,
    settleImmediately: true,
    refundOnDraw: false,
  },

  bird: {
    enabled: true,
    count: 2,
  },

  openDoor: {
    needOpenDoorForDianPaoHu: true,
  },

  startingHu: {
    enabled: true,
    scoreEach: 2,
    dealerBonusEach: 1,
  },
};

export const RULE_CONFIG_6_6: ChangshaRuleConfig = {
  ...DEFAULT_RULE_CONFIG,
  scoreMode: 'changsha_6_6',
  bigHu: {
    ...DEFAULT_RULE_CONFIG.bigHu,
    ziMoEach: 6,
  },
};
