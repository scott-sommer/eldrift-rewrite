import type { MiningRepairPolicy } from '../../capabilities/mining/repair-policy';
import type { Outcome } from '../../core/execution/model';
import type { createActionArbiter } from '../../core/execution/action-arbiter';
import { minerStep } from '../../capabilities/mining/step';
import { issuedOutcome } from '../../capabilities/actions/outcome';
import { stationTile, validateStation } from '../../capabilities/mining/station';
import type { MiningStation } from '../../capabilities/mining/station';
import type { Position } from '../../capabilities/movement/step';
import type { RoutePolicy } from '../../capabilities/movement/room-route';
import { createCreepActions } from './creep-actions';
import type { createMovementService } from './movement-service';
import { miningInfrastructure, miningReadiness, miningTarget, miningCapacity, miningRepair } from './mining-observation';
export interface MinerCommand {
  owner: string;
  station: MiningStation;
  tile: Position;
  assigned: boolean;
  unsafe: boolean;
  retreat: Position;
  policy: RoutePolicy;
  repairPolicy?: Readonly<MiningRepairPolicy>;
}
export function createNativeMiner(arbiter: ReturnType<typeof createActionArbiter>, movement: Pick<ReturnType<typeof createMovementService>, 'move'>) {
  return (creep: Creep, command: MinerCommand): Outcome => {
    const { station, tile } = command;
    validateStation(station);
    if (!station.access.some(access => stationTile(access) === stationTile(tile))) throw new Error('Invalid miner assignment tile');
    const target = miningTarget(station);
    const infrastructure = miningInfrastructure(creep, station);
    const actions = createCreepActions(creep, command.owner, arbiter);
    const rejected = (code: number): Outcome => ({ status: 'blocked', reason: 'mining-intent:' + code, retryAt: Game.time + 1 });
    const move = (destination: Position) => movement.move(creep, { owner: command.owner, destination, range: 0, policy: command.policy });
    const readiness = target ? miningReadiness(target, station) ?? miningCapacity(creep, target) : undefined;
    return minerStep({
      tick: Game.time, spawning: creep.spawning, unsafe: command.unsafe, assigned: command.assigned,
      target: target ? 'visible' : Game.rooms[station.position.room] ? 'missing' : 'unseen',
      atStation: creep.pos.roomName === tile.room && creep.pos.x === tile.x && creep.pos.y === tile.y,
      carried: creep.store.getUsedCapacity(), energy: creep.store.energy,
      freeCapacity: creep.store.getFreeCapacity(), carryCapacity: creep.store.getCapacity(),
      establish: !!infrastructure.site, repair: miningRepair(infrastructure.repair, target, creep.store.energy, command.repairPolicy), ...(readiness ? { readiness } : {}),
    }, {
      approach: () => move(tile), retreat: () => move(command.retreat),
      establish: () => issuedOutcome(actions.build(infrastructure.site!), Game.time, rejected),
      repair: () => actions.repair(infrastructure.repair!),
      handoff: () => infrastructure.sink ? actions.transfer(infrastructure.sink, station.resource as ResourceConstant)
        : { status: 'rejected', code: ERR_FULL },
      harvest: () => actions.harvest(target!), rejected,
    });
  };
}



