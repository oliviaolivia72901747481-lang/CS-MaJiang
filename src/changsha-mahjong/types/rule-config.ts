export type ScoreMode = 'changsha_6_7' | 'changsha_6_6';

export interface ChangshaRuleConfig {
  baseScore: number;
  scoreMode: ScoreMode;

  smallHu: {
    need258Jiang: boolean;
    dianPao: number;
    ziMoEach: number;
  };

  bigHu: {
    dianPao: number;
    ziMoEach: number;
    allowStacking: boolean;
  };

  gang: {
    mingGang: number;
    buGang: number;
    anGang: number;
    settleImmediately: boolean;
    refundOnDraw: boolean;
  };

  bird: {
    enabled: boolean;
    count: 1 | 2;
  };

  openDoor: {
    needOpenDoorForDianPaoHu: boolean;
  };

  startingHu: {
    enabled: boolean;
    scoreEach: number;
    dealerBonusEach: number;
  };
}
