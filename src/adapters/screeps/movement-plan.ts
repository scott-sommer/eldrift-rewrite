import { movementStep } from '../../capabilities/movement/step';
import { withinRange } from '../../capabilities/movement/path-model';
import { movementTransition,stepDirection } from '../../capabilities/movement/transition';
import { movementPosition } from './movement-traffic';
import { creepMobility } from './mobility';
import type { MovementCommand } from './movement-service';
import type { TransitPlan } from '../../capabilities/movement/transit/model';
import type { TrafficRequest } from '../../capabilities/movement/traffic/model';
import type { MovementIntent } from '../../capabilities/movement/step';
/** Caller owns the bound route and observed cursor. Never searches, detours or advances it on intent alone. */
export function followNativeMovementPlan(creep: Creep,command: MovementCommand,plan: TransitPlan,index: number,submit: (request: TrafficRequest) => MovementIntent) {
  const from = movementPosition(creep.pos),refusal = validateBinding(creep,command,plan,index);
  if (refusal) return blocked(refusal);
  if (creep.spawning || !creepMobility(creep).mobile) return blocked('planned-movement-unavailable');
  const next = plan.path[index];
  if (!next) return { status: 'done' as const };
  const direction = stepDirection(from,next),transition = movementTransition(from,direction);
  if (!transition || !withinRange(transition.landing,next,0)) return blocked('planned-movement-step');
  if (!allowedStep(command,transition.landing.room)) return blocked('planned-movement-room-policy');
  return movementStep({ tick: Game.time,position: from,destination: command.destination,range: command.range,fatigue: creep.fatigue,allowPartial: false },{
    route: () => ({ status: 'ready',direction,incomplete: false }),
    move: () => submit({ unit: creep.id,order: creep.name,owner: command.owner,from,to: transition.landing,via: transition.local,priority: plan.priority,mobile: true,...(plan.group ? { group: plan.group } : {}) }),
    rejected: code => ({ status: 'blocked',reason: 'planned-movement-intent:'+code,retryAt: Game.time+1 }),
  });
}
function blocked(reason: string) { return { status: 'blocked' as const,reason,retryAt: Game.time+1 }; }

function validateBinding(creep: Creep,command: MovementCommand,plan: TransitPlan,index: number): string | undefined {
  if (!validPlanPosition(creep,plan,index)) return 'planned-movement-position';
  if ((plan.order ?? plan.unit) !== creep.name || !withinRange(plan.path.at(-1) ?? plan.origin,command.destination,command.range)) return 'planned-movement-binding';
  return undefined;
}

function validPlanPosition(creep: Creep,plan: TransitPlan,index: number): boolean {
  if (!Number.isSafeInteger(index) || index < 0 || index > plan.path.length) return false;
  const expected = index === 0 ? plan.origin : plan.path[index-1];
  return !!expected && withinRange(movementPosition(creep.pos),expected,0);
}

function allowedStep(command: MovementCommand,room: string): boolean {
  if (command.policy.blockedRooms.includes(room)) return false;
  return command.policy.allowedRooms === undefined || command.policy.allowedRooms.includes(room);
}
