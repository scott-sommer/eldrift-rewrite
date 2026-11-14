import type { Outcome } from '../../core/execution/model';
import type { IntentResult } from '../../core/execution/action-arbiter';
import { approachOutcome, issuedOutcome } from '../actions/outcome';
export interface TransferView {
  tick: number;
  complete: boolean;
  target: 'visible' | 'unseen' | 'missing';
  inRange: boolean;
  available: number;
  capacity: number;
  remaining: number;
}
export interface TransferPorts {
  approach(): Outcome;
  transfer(amount: number): IntentResult;
  rejected(code: number): Outcome;
}
/** Caller orients source/destination for withdraw or delivery. */
export function transferStep(view: TransferView, ports: TransferPorts): Outcome {
  if (view.complete) return { status: 'done' };
  if (view.target === 'missing') return { status: 'failed', reason: 'target-missing' };
  if (view.target === 'unseen' || !view.inRange) return approachOutcome(ports.approach());
  if (view.available <= 0) return { status: 'blocked', reason: 'source-empty', retryAt: view.tick + 1 };
  if (view.capacity <= 0) return { status: 'blocked', reason: 'destination-full', retryAt: view.tick + 1 };
  const amount = Math.floor(Math.min(view.available, view.capacity, view.remaining));
  if (!Number.isSafeInteger(amount) || amount < 1) return { status: 'failed', reason: 'invalid-transfer-amount' };
  return issuedOutcome(ports.transfer(amount), view.tick, ports.rejected);
}

