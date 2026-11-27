import { followPlannedMovement } from '../../capabilities/movement/fixed-step';
import { movementPosition } from './movement-traffic';
import { creepMobility } from './mobility';
import type { MovementCommand } from './movement-service';
import type { TransitPlan } from '../../capabilities/movement/transit/model';
import type { TrafficRequest } from '../../capabilities/movement/traffic/model';
import type { MovementIntent } from '../../capabilities/movement/step';
/** Native observations feed the same fixed-path mechanism used by private forecasts. */
export function followNativeMovementPlan(creep: Creep,command: MovementCommand,plan: TransitPlan,index: number,submit: (request: TrafficRequest) => MovementIntent) {
  return followPlannedMovement({ tick: Game.time,unit: creep.id,name: creep.name,position: movementPosition(creep.pos),fatigue: creep.fatigue,
    spawning: creep.spawning,mobile: creepMobility(creep).mobile },command,plan,index,submit);
}
