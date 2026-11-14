import type { Outcome } from '../../core/execution/model';
import type { IntentResult } from '../../core/execution/action-arbiter';
export interface HarvestView {
  tick: number;
  stored: number;
  goal: number;
  target: 'visible' | 'unseen' | 'missing';
  inRange: boolean;
  available: number;
  retryAt: number;
}
export interface HarvestPorts {
  approach(): Outcome;
  harvest(): IntentResult;
  rejected(code: number): Outcome;
}
/** Finite collection task; stationary/no-CARRY miners use a separate station policy. */
export function harvestStep(view: HarvestView, ports: HarvestPorts): Outcome {
  if (view.stored >= view.goal) return { status: 'done' };
  if (view.target === 'missing') return { status: 'failed', reason: 'target-missing' };
  if (view.target === 'unseen' || !view.inRange) return ports.approach();
  if (view.available <= 0) return { status: 'blocked', reason: 'source-empty', retryAt: Math.max(view.tick + 1, view.retryAt) };
  const intent = ports.harvest();
  if (intent.status === 'issued') return { status: 'running' };
  if (intent.status === 'rejected') return ports.rejected(intent.code);
  return { status: 'blocked', reason: intent.reason, retryAt: view.tick + 1 };
}
