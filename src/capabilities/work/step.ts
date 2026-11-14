import type { Outcome } from '../../core/execution/model';
import type { IntentResult } from '../../core/execution/action-arbiter';
import { approachOutcome, issuedOutcome } from '../actions/outcome';
export interface WorkView {
  tick: number;
  complete: boolean;
  target: 'visible' | 'unseen' | 'missing';
  inRange: boolean;
  energy: number;
}
export interface WorkPorts {
  approach(): Outcome;
  act(): IntentResult;
  rejected(code: number): Outcome;
}
/** Build/repair/upgrade targets supply their own observed completion predicate. */
export function workStep(view: WorkView, ports: WorkPorts): Outcome {
  if (view.complete) return { status: 'done' };
  if (view.target === 'missing') return { status: 'failed', reason: 'target-missing' };
  if (view.target === 'unseen' || !view.inRange) return approachOutcome(ports.approach());
  if (view.energy <= 0) return { status: 'blocked', reason: 'energy-empty', retryAt: view.tick + 1 };
  return issuedOutcome(ports.act(), view.tick, ports.rejected);
}
