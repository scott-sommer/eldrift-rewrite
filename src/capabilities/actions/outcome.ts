import type { Outcome } from '../../core/execution/model';
import type { IntentResult } from '../../core/execution/action-arbiter';
export function issuedOutcome(intent: IntentResult, tick: number, rejected: (code: number) => Outcome): Outcome {
  if (intent.status === 'issued') return { status: 'running' };
  if (intent.status === 'rejected') return rejected(intent.code);
  return { status: 'blocked', reason: intent.reason, retryAt: tick + 1 };
}
/** Reaching a destination completes travel, not the parent work task. */
export function approachOutcome(outcome: Outcome): Outcome {
  return outcome.status === 'done' ? { status: 'running' } : outcome;
}
