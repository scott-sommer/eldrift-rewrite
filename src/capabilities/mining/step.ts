import type { Outcome } from '../../core/execution/model';
import type { IntentResult } from '../../core/execution/action-arbiter';
import { approachOutcome, issuedOutcome } from '../actions/outcome';
export interface MinerView {
  tick: number;
  spawning: boolean;
  unsafe: boolean;
  target: 'visible' | 'unseen' | 'missing';
  assigned: boolean;
  atStation: boolean;
  carried: number;
  energy: number;
  freeCapacity: number;
  carryCapacity: number;
  establish: boolean;
  repair: boolean;
  readiness?: Outcome;
}
export interface MinerPorts {
  approach(): Outcome;
  retreat(): Outcome;
  establish(): Outcome;
  repair(): IntentResult;
  handoff(): IntentResult;
  harvest(): IntentResult;
  rejected(code: number): Outcome;
}
/** Continuous station work; arrival and successful actions never complete the station task. */
export function minerStep(view: MinerView, ports: MinerPorts): Outcome {
  if (view.spawning) return { status: 'blocked', reason: 'spawning', retryAt: view.tick + 1 };
  if (view.unsafe) return approachOutcome(ports.retreat());
  if (view.target === 'missing') return { status: 'failed', reason: 'station-target-missing' };
  if (!view.assigned) return { status: 'blocked', reason: 'station-unassigned', retryAt: view.tick + 1 };
  if (view.target === 'unseen' || !view.atStation) return approachOutcome(ports.approach());
  return workAtStation(view, ports);
}
function workAtStation(view: MinerView, ports: MinerPorts): Outcome {
  if (view.establish && view.energy > 0) return approachOutcome(ports.establish());
  if (view.repair && view.energy > 0) return issuedOutcome(ports.repair(), view.tick, ports.rejected);
  if (needsHandoff(view)) return issuedOutcome(ports.handoff(), view.tick, ports.rejected);
  if (view.readiness) return view.readiness;
  // Zero-CARRY miners may harvest directly to the ground/container below them.
  if (view.carryCapacity > 0 && view.freeCapacity === 0) return { status: 'blocked', reason: 'store-full', retryAt: view.tick + 1 };
  return issuedOutcome(ports.harvest(), view.tick, ports.rejected);
}

function depleted(outcome: Outcome | undefined): boolean {
  return outcome?.status === 'blocked' && ['source-depleted', 'mineral-depleted'].includes(outcome.reason);
}

function needsHandoff(view: MinerView): boolean {
  return view.carried > 0 && (view.freeCapacity === 0 || depleted(view.readiness));
}
