import { resolveTraffic } from '../traffic/resolve';
import { movementTransition, stepDirection } from '../transition';
import { validateTransitFrame } from './validation';
import { withinRange } from '../path-model';
import type { Occupant, TrafficRequest } from '../traffic/model';
import type { Position } from '../step';
import type { TransitPlan, TransitState } from './model';
export interface TransitFramePorts {
  legal: (request: TrafficRequest) => boolean;
  terrain: (position: Position) => 1 | 2 | 10;
}
/** One frame, using the runtime traffic solver. The caller owns service waits and plan changes. */
export function advanceTransitFrame(plans: readonly TransitPlan[],states: readonly TransitState[],tick: number,occupants: readonly Occupant[],ports: TransitFramePorts) {
  validateTransitFrame(plans,states,tick);
  const requests = states.flatMap((state,index) => request(plans[index]!,state,tick));
  const resolution = resolveTraffic(requests,[...occupants,...states.map(state => ({ unit: state.unit,position: state.position }))],ports.legal,64);
  const accepted = new Map(resolution.accepted.map(item => [item.unit,item]));
  const next = states.map((state,index) => advance(plans[index]!,state,accepted.get(state.unit),tick,ports));
  return { states: next,resolution };
}
function request(plan: TransitPlan,state: TransitState,tick: number): TrafficRequest[] {
  const target = plan.path[state.index];
  if (!target || tick < state.readyAt || state.fatigue > 0) return [];
  const step = movementTransition(state.position,stepDirection(state.position,target));
  if (!step || !withinRange(step.landing,target,0)) throw new Error('Invalid transit next step');
  return [{ unit: state.unit,owner: plan.owner,from: { ...state.position },to: step.landing,priority: plan.priority,mobile: true,
    ...(plan.group ? { group: plan.group } : {}),...(plan.order === undefined ? {} : { order: plan.order }),...(step.local.room !== step.landing.room ? { via: step.local } : {}) }];
}
function advance(plan: TransitPlan,state: TransitState,move: TrafficRequest | undefined,tick: number,ports: TransitFramePorts): TransitState {
  if (!move) return { ...state,lastAt: tick,position: { ...state.position },fatigue: Math.max(0,state.fatigue-plan.recovery) };
  const local = move.via ?? move.to;
  const transported = move.via !== undefined && !edge(state.position);
  const fatigue = transported ? 0 : Math.max(0,plan.weight*ports.terrain(local)-plan.recovery);
  const index = state.index+1;
  return { ...state,lastAt: tick,index,position: { ...move.to },fatigue,...(index === plan.path.length ? { arrivedAt: tick+1 } : {}) };
}
function edge(point: Position): boolean { return point.x === 0 || point.x === 49 || point.y === 0 || point.y === 49; }
