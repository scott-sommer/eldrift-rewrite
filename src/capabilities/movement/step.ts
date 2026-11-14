import type { Outcome } from '../../core/execution/model';
import type { IntentResult } from '../../core/execution/action-arbiter';
import { issuedOutcome } from '../actions/outcome';
export interface Position { room: string; x: number; y: number }
export type RouteStep = { status: 'ready'; direction: number; incomplete: boolean } | { status: 'unavailable'; retryAt: number; reason: string };
export interface MovementView {
  tick: number;
  position: Position;
  destination: Position;
  range: number;
  fatigue: number;
  allowPartial: boolean;
}
export interface MovementPorts {
  route(): RouteStep;
  move(direction: number): IntentResult;
  rejected(code: number): Outcome;
}
function arrived(view: MovementView): boolean {
  return view.position.room === view.destination.room
    && Math.max(Math.abs(view.position.x - view.destination.x), Math.abs(view.position.y - view.destination.y)) <= view.range;
}
export function movementStep(view: MovementView, ports: MovementPorts): Outcome {
  if (arrived(view)) return { status: 'done' };
  if (view.fatigue > 0) return { status: 'blocked', reason: 'fatigue', retryAt: view.tick + 1 };
  const route = ports.route();
  if (route.status === 'unavailable') return { status: 'blocked', reason: route.reason, retryAt: route.retryAt };
  if (route.incomplete && !view.allowPartial) return { status: 'blocked', reason: 'incomplete-path', retryAt: view.tick + 1 };
  if (!Number.isInteger(route.direction) || route.direction < 1 || route.direction > 8) return { status: 'failed', reason: 'invalid-direction' };
  return issuedOutcome(ports.move(route.direction), view.tick, ports.rejected);
}
