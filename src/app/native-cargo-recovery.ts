import { recoveryPriority } from '../features/logistics/recovery-destinations';
import type { StatePort } from '../persistence/versioned-state';
import type { TaskDefinition } from '../persistence/tasks/schema';
import { observeHauling } from '../adapters/screeps/hauling-observation';
import { assignCargoRecovery } from './assign-cargo-recovery';
/** Prefer durable stores; energy consumers and containers are fallback destinations. */
export function recoverNativeCargo(state: StatePort, definitions: Readonly<Record<string, TaskDefinition>>, creep: Creep, home: string, terminalReserve: number): boolean {
  if (creep.store.getUsedCapacity() === 0) return false;
  const room = Game.rooms[home];
  if (!room) return false;
  for (const resource of (Object.keys(creep.store) as ResourceConstant[]).sort()) {
    const quantity = creep.store.getUsedCapacity(resource);
    if (quantity === 0) continue;
    const sinks = room.find(FIND_STRUCTURES).filter(item => nativePriority(item, resource, terminalReserve) !== undefined)
      .sort((a, b) => nativePriority(a, resource, terminalReserve)! - nativePriority(b, resource, terminalReserve)! || a.id.localeCompare(b.id));
    for (const sink of sinks) {
      const view = observeHauling(creep, { id: 'recovery-observation', owner: home, source: creep.id, sink: sink.id,
        resource, quantity, priority: -1, expiresAt: Game.time + 100 });
      if (view.sinkFree === 0) continue;
      if (assignCargoRecovery(state, definitions, { home, name: creep.name, unitId: creep.id, tick: Game.time,
        resource, quantity, sink: sink.id, sinkRoom: home, sinkFree: view.sinkFree, sinkPool: view.sinkPool })) return true;
    }
  }
  return false;
}
function nativePriority(structure: AnyStructure, resource: ResourceConstant, terminalReserve: number): number | undefined {
  if (!('store' in structure)) return undefined;
  return recoveryPriority({ kind: structure.structureType, owned: 'my' in structure && structure.my,
    free: structure.store.getFreeCapacity(resource) ?? 0 }, resource, terminalReserve);
}
