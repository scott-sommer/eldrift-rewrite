import { movementStep } from './step';
import { withinRange } from './path-model';
import { movementTransition,stepDirection } from './transition';
import type { TransitPlan } from './transit/model';
import type { TrafficRequest } from './traffic/model';
import type { MovementIntent,Position } from './step';
import type { RoutePolicy } from './room-route';
export interface PlannedMovementView { tick: number; unit: string; name: string; position: Position; fatigue: number; mobile: boolean; spawning: boolean }
export interface PlannedMovementCommand { owner: string; destination: Position; range: number; policy: Pick<RoutePolicy,'blockedRooms' | 'allowedRooms'> }
/** Fixed-path execution only; caller owns route/cursor, admission, shared traffic and action arbitration. */
export function followPlannedMovement(view: PlannedMovementView,command: PlannedMovementCommand,plan: TransitPlan,index: number,submit: (request: TrafficRequest) => MovementIntent) {
  const from = view.position,refusal = validateBinding(view,command,plan,index);
  if (refusal) return blocked(refusal,view.tick);
  if (view.spawning || !view.mobile) return blocked('planned-movement-unavailable',view.tick);
  const next = plan.path[index];
  if (!next) return { status: 'done' as const };
  const direction = stepDirection(from,next),transition = movementTransition(from,direction);
  if (!transition || !withinRange(transition.landing,next,0)) return blocked('planned-movement-step',view.tick);
  if (!allowedStep(command,transition.landing.room)) return blocked('planned-movement-room-policy',view.tick);
  return movementStep({ tick: view.tick,position: from,destination: command.destination,range: command.range,fatigue: view.fatigue,allowPartial: false },{
    route: () => ({ status: 'ready',direction,incomplete: false }),
    move: () => submit({ unit: view.unit,order: view.name,owner: command.owner,from,to: transition.landing,via: transition.local,priority: plan.priority,mobile: true,...(plan.group ? { group: plan.group } : {}) }),
    rejected: code => ({ status: 'blocked',reason: 'planned-movement-intent:'+code,retryAt: view.tick+1 }),
  });
}
function blocked(reason: string, tick: number) { return { status: 'blocked' as const,reason,retryAt: tick+1 }; }

function validateBinding(view: PlannedMovementView,command: PlannedMovementCommand,plan: TransitPlan,index: number): string | undefined {
  if (!validPlanPosition(view,plan,index)) return 'planned-movement-position';
  if ((plan.order ?? plan.unit) !== view.name || !withinRange(plan.path.at(-1) ?? plan.origin,command.destination,command.range)) return 'planned-movement-binding';
  return undefined;
}

function validPlanPosition(view: PlannedMovementView,plan: TransitPlan,index: number): boolean {
  if (!Number.isSafeInteger(index) || index < 0 || index > plan.path.length) return false;
  const expected = index === 0 ? plan.origin : plan.path[index-1];
  return !!expected && withinRange(view.position,expected,0);
}

function allowedStep(command: PlannedMovementCommand,room: string): boolean {
  if (command.policy.blockedRooms.includes(room)) return false;
  return command.policy.allowedRooms === undefined || command.policy.allowedRooms.includes(room);
}
