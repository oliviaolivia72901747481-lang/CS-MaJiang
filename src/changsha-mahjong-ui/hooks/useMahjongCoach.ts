import { useState, useCallback } from 'react';
import { GameState } from '../../changsha-mahjong/types/game.js';
import {
  HandAdvice,
  DiscardAdvice,
  ActionAdvice,
  RiskAdvice,
  PlayerDecisionRecord,
  ReplayReport,
} from '../../changsha-mahjong/coach/coach-types.js';
import { analyzeHumanHand } from '../../changsha-mahjong/coach/hand-advisor.js';
import { recommendDiscards } from '../../changsha-mahjong/coach/discard-advisor.js';
import { adviseHumanAction } from '../../changsha-mahjong/coach/action-advisor.js';
import { analyzeDiscardRisks } from '../../changsha-mahjong/coach/risk-advisor.js';
import { recordHumanDecision, analyzeReplay } from '../../changsha-mahjong/coach/replay-analyzer.js';
import { getHumanAvailableActions } from '../adapters/ui-game-adapter.js';

export interface UseMahjongCoachResult {
  handAdvice: HandAdvice | null;
  discardAdvices: DiscardAdvice[];
  actionAdvices: ActionAdvice[];
  riskAdvices: RiskAdvice[];
  replayReport: ReplayReport | null;
  coachEnabled: boolean;

  toggleCoach: () => void;
  refreshAdvice: (state: GameState) => void;
  recordDecision: (input: {
    stateBefore: GameState;
    stateAfter: GameState;
    actualAction: string;
    actualTileKey?: string;
  }) => void;
  buildReport: (finalState: GameState) => ReplayReport;
  resetCoach: () => void;
}

export function useMahjongCoach(): UseMahjongCoachResult {
  const [coachEnabled, setCoachEnabled] = useState(true);
  const [handAdvice, setHandAdvice] = useState<HandAdvice | null>(null);
  const [discardAdvices, setDiscardAdvices] = useState<DiscardAdvice[]>([]);
  const [actionAdvices, setActionAdvices] = useState<ActionAdvice[]>([]);
  const [riskAdvices, setRiskAdvices] = useState<RiskAdvice[]>([]);
  const [decisionRecords, setDecisionRecords] = useState<PlayerDecisionRecord[]>([]);
  const [replayReport, setReplayReport] = useState<ReplayReport | null>(null);

  const toggleCoach = useCallback(() => {
    setCoachEnabled(prev => !prev);
  }, []);

  const refreshAdvice = useCallback((state: GameState) => {
    if (!state) return;
    
    // Only analyze for Seat 0 (Human Player)
    try {
      const handAdv = analyzeHumanHand({ state, humanSeat: 0 });
      setHandAdvice(handAdv);

      const discAdv = recommendDiscards({ state, humanSeat: 0, topN: 3 });
      setDiscardAdvices(discAdv);

      const availableActions = getHumanAvailableActions(state, 0);
      const actAdv = adviseHumanAction({ state, humanSeat: 0, availableActions });
      setActionAdvices(actAdv);

      const rskAdv = analyzeDiscardRisks({ state, humanSeat: 0 });
      setRiskAdvices(rskAdv);
    } catch (err) {
      console.error('Error refreshing AI coach advice:', err);
    }
  }, []);

  const recordDecision = useCallback((input: {
    stateBefore: GameState;
    stateAfter: GameState;
    actualAction: string;
    actualTileKey?: string;
  }) => {
    try {
      const record = recordHumanDecision({
        stateBefore: input.stateBefore,
        stateAfter: input.stateAfter,
        humanSeat: 0,
        actualAction: input.actualAction,
        actualTileKey: input.actualTileKey,
      });
      setDecisionRecords(prev => [...prev, record]);
    } catch (err) {
      console.error('Error recording player decision for replay:', err);
    }
  }, []);

  const buildReport = useCallback((finalState: GameState): ReplayReport => {
    const report = analyzeReplay({
      finalState,
      decisionRecords,
      humanSeat: 0,
    });
    setReplayReport(report);
    return report;
  }, [decisionRecords]);

  const resetCoach = useCallback(() => {
    setHandAdvice(null);
    setDiscardAdvices([]);
    setActionAdvices([]);
    setRiskAdvices([]);
    setDecisionRecords([]);
    setReplayReport(null);
  }, []);

  return {
    handAdvice,
    discardAdvices,
    actionAdvices,
    riskAdvices,
    replayReport,
    coachEnabled,
    toggleCoach,
    refreshAdvice,
    recordDecision,
    buildReport,
    resetCoach,
  };
}
