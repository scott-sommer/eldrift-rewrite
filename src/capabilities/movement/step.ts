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
export type MovementIntent = IntentResult | { status: 'queued' } | { status: 'blocked'; reason: string };
export interface MovementPorts {
  route(): RouteStep;
  move(direction: number): MovementIntent;
  rejected(code: number): Outcome;
}
export function movementArrived(view: Pick<MovementView, 'position' | 'destination' | 'range'>): boolean {
  return view.position.room === view.destination.room && (onExit(view.destination) || !onExit(view.position))
    && Math.max(Math.abs(view.position.x - view.destination.x), Math.abs(view.position.y - view.destination.y)) <= view.range;
}
export function movementStep(view: MovementView, ports: MovementPorts): Outcome {
  if (movementArrived(view)) return { status: 'done' };
  if (view.fatigue > 0) return { status: 'blocked', reason: 'fatigue', retryAt: view.tick + 1 };
  const route = ports.route();
  if (route.status === 'unavailable') return { status: 'blocked', reason: route.reason, retryAt: route.retryAt };
  if (route.incomplete && !view.allowPartial) return { status: 'blocked', reason: 'incomplete-path', retryAt: view.tick + 1 };
  if (!Number.isInteger(route.direction) || route.direction < 1 || route.direction > 8) return { status: 'failed', reason: 'invalid-direction' };
  return movementOutcome(ports.move(route.direction), view.tick, ports.rejected);
}
function movementOutcome(intent: MovementIntent, tick: number, rejected: MovementPorts['rejected']): Outcome {
  if (intent.status === 'queued') return { status: 'running' };
  if (intent.status === 'blocked') return { status: 'blocked', reason: intent.reason, retryAt: tick + 1 };
  return issuedOutcome(intent, tick, rejected);
}

function onExit(position: Position): boolean {
  return position.x === 0 || position.x === 49 || position.y === 0 || position.y === 49;
}
