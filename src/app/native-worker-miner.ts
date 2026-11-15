import type { CollectionOrder } from '../capabilities/resources/collection';
import type { Position } from '../capabilities/movement/step';
import type { Outcome } from '../core/execution/model';
import type { RuntimeConfig } from '../config/model';
import type { createNativeDispatch } from './native-dispatch';
import { observeMiningStations } from '../adapters/screeps/mining-stations';
import { observeWorkerEnergy } from '../adapters/screeps/worker-energy';
import { movementPosition } from '../adapters/screeps/movement-traffic';
import { selectMinerEnergy } from '../features/work/miner-energy';
import { logisticsPool } from '../capabilities/logistics/request';
declare global {
  interface CreepMemory { workerSource?: { source: string; position: Position } }
}
export function assignedMinerCollection(creep: Creep, owner: string, config: Readonly<RuntimeConfig>,
  dispatch: ReturnType<typeof createNativeDispatch>, booked: (pool: string) => number,
  primary: CollectionOrder | undefined): CollectionOrder | Outcome | undefined {
  const assignment = creep.memory.workerSource;
  if (config.workerEnergyProfile !== 'upgrader' || !assignment || preferredPrimary(creep, primary)) return primary;
  const room = Game.rooms[assignment.position.room];
  if (!room) return approach(creep, assignment.position, owner, dispatch);
  const station = observeMiningStations(room.name, 'safe')?.find(item => item.kind === 'energy' && item.target === assignment.source
    && item.position.x === assignment.position.x && item.position.y === assignment.position.y);
  if (!station) return primary;
  const sources = observeWorkerEnergy(room, new Set()).map(source => ({ ...source,
    available: Math.max(0, source.stock - booked(logisticsPool('stock', source.id, 'energy'))) }));
  const origin = creep.room.name === room.name ? movementPosition(creep.pos) : station.position;
  const order = selectMinerEnergy(sources, origin, creep.store.getFreeCapacity(), station, config.workerEnergyStorageReserve);
  if (order) return order;
  if (creep.store.energy > 0) return { status: 'done' };
  return approach(creep, station.position, owner, dispatch);
}
function preferredPrimary(creep: Creep, order: CollectionOrder | undefined): boolean {
  return !!order && (order.source.kind !== 'drop' || order.source.stock > 20
    && creep.pos.roomName === order.source.position.room
    && Math.max(Math.abs(creep.pos.x - order.source.position.x), Math.abs(creep.pos.y - order.source.position.y)) <= 3);
}
function approach(creep: Creep, destination: Position, owner: string, dispatch: ReturnType<typeof createNativeDispatch>): Outcome {
  const result = dispatch.movement.move(creep, { owner, destination, range: 2,
    policy: { version: 'worker-assigned-source', blockedRooms: [], costs: {}, maximumRooms: 16 } });
  return result.status === 'done' ? { status: 'blocked', reason: 'assigned-source-energy-unavailable', retryAt: Game.time + 1 } : result;
}
