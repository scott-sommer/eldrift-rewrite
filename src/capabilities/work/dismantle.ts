import type { Outcome } from '../../core/execution/model';
import type { WorkPorts } from './step';
import { approachOutcome, issuedOutcome } from '../actions/outcome';
export interface DismantleView { tick: number; complete: boolean; target: 'visible' | 'unseen' | 'missing'; inRange: boolean }
/** Dismantling consumes WORK capacity, not carried energy. Completion is supplied by the owning policy. */
export function dismantleStep(view: DismantleView, ports: WorkPorts): Outcome {
  if (view.complete) return { status: 'done' };
  if (view.target === 'missing') return { status: 'failed', reason: 'target-missing' };
  if (view.target === 'unseen' || !view.inRange) return approachOutcome(ports.approach());
  return issuedOutcome(ports.act(), view.tick, ports.rejected);
}
