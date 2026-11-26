import { createActionArbiter } from '../../core/execution/action-arbiter';
import { createNavigator } from '../../capabilities/movement/navigator';
import { createPathService } from '../../capabilities/movement/path-service';
import { createTrafficDispatch } from '../../capabilities/movement/traffic/dispatch';
import { movementTransition, stepDirection } from '../../capabilities/movement/transition';
import type { RoutePolicy } from '../../capabilities/movement/room-route';
import type { Position } from '../../capabilities/movement/step';
import { createMovementPaths } from './movement-paths';
import { createMovementLegality, movementOccupants, movementPosition } from './movement-traffic';
import { createCreepActions } from './creep-actions';
import { creepMobility } from './mobility';
export interface MovementCommand {
  owner: string;
  destination: Position;
  range: number;
  policy: RoutePolicy;
  priority?: number;
  group?: string;
  allowPartial?: boolean;
  avoid?: readonly Position[];
}
export interface MovementTileAccess { avoid(name: string): readonly Position[]; permits(unit: string, destination: Position): boolean }
type Arbiter = ReturnType<typeof createActionArbiter>;
export function createMovementService(arbiter: Arbiter = createActionArbiter(() => Game.time), access?: MovementTileAccess) {
  const preparation = createMovementPaths(access?.avoid);
  const paths = createPathService(preparation.search, () => Game.time);
  const commands = new Map<string, MovementCommand>();
  let tick = -1;
  const dispatch = createTrafficDispatch({
    clock: () => Game.time, observe: movementOccupants, legal: createMovementLegality(preparation.snapshots,access?.permits),
    issue: request => createCreepActions(creepById(request.unit), request.owner, arbiter)
      .move(stepDirection(request.from, request.via ?? request.to) as DirectionConstant),
  }, (unit, time, outcome) => navigate.settle(unit, time, outcome));
  const navigate = createNavigator({
    paths, direction: stepDirection,
    request: (view, avoidUnits, unit) => {
      const command = commands.get(unit)!;
      return preparation.prepare(creepById(unit), view, avoidUnits, command.policy, command.avoid);
    },
    move: (unit, direction) => {
      const creep = creepById(unit);
      const command = commands.get(unit)!;
      const from = movementPosition(creep.pos);
      const transition = movementTransition(from, direction);
      if (!transition) return { status: 'blocked', reason: 'invalid-transition' };
      return dispatch.submit({ unit, owner: command.owner, from, to: transition.landing, via: transition.local,
        priority: command.priority ?? 0, mobile: true, ...(command.group ? { group: command.group } : {}) });
    },
    rejected: code => ({ status: 'failed', reason: String(code) }),
  });
  return {
    move(creep: Creep, command: MovementCommand) {
      if (tick !== Game.time) { commands.clear(); tick = Game.time; }
      if (commands.has(creep.id)) return { status: 'blocked' as const, reason: 'movement-already-requested', retryAt: Game.time + 1 };
      commands.set(creep.id, command);
      return navigate(creep.id, { tick: Game.time, position: movementPosition(creep.pos), destination: command.destination,
        range: command.range, fatigue: creep.fatigue, allowPartial: command.allowPartial ?? false }, creepMobility(creep).mobile);
    },
    flush: () => dispatch.flush(),
  };
}
function creepById(id: string): Creep {
  const creep = Game.getObjectById(id as Id<Creep>);
  if (!creep) throw new Error('Movement creep disappeared');
  return creep;
}
