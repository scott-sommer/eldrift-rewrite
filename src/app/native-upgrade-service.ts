import type { RuntimeConfig } from '../config/model';
import type { StatePort } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import { planUpgradeService } from '../features/work/upgrade-service';
import { reconcileServiceRequest } from '../features/logistics/service-request';
/** Lab choice is deterministic; station placement/renewal are separate room policy. */
export function generateNativeUpgradeService(state: StatePort, room: Room, config: Readonly<RuntimeConfig>, enabled: boolean): void {
  if (!enabled && state.read(stateKey('logistics-requests', room.name)) === undefined) return;
  const desired = enabled ? planUpgradeService(observe(room), { mineralTarget: config.upgradeLabMineralTarget,
    spawnFloor: config.upgradeSpawnEnergyFloor, storageCeiling: config.upgradeStorageEnergyCeiling, maximumBatch: config.upgradeServiceBatch }) : undefined;
  reconcileServiceRequest(state, room.name, Game.time, 'upgrade-service:' + room.name, 3, desired);
}
function observe(room: Room) {
  const structures = room.find(FIND_MY_STRUCTURES).filter(item => item.isActive()).sort((a, b) => a.id.localeCompare(b.id));
  const lab = structures.find((item): item is StructureLab => item.structureType === STRUCTURE_LAB);
  const spawn = structures.find((item): item is StructureSpawn => item.structureType === STRUCTURE_SPAWN);
  const storage = retainedStock(room.storage);
  const terminal = retainedStock(room.terminal);
  return { level: room.controller?.level ?? 0,
    ...(storage ? { storage } : {}),
    ...(terminal ? { terminal } : {}),
    ...(lab ? { lab: { id: lab.id, mineral: lab.mineralType ?? undefined,
      amount: lab.mineralType ? lab.store.getUsedCapacity(lab.mineralType) : 0,
      mineralCapacity: 3000, energy: lab.store.energy, energyCapacity: lab.store.getCapacity('energy') ?? 0 } } : {}),
    ...(spawn ? { spawn: { id: spawn.id, energy: spawn.store.energy, capacity: spawn.store.getCapacity('energy') } } : {}) };
}
function retainedStock(item: StructureStorage | StructureTerminal | undefined) {
  return item?.my ? stock(item) : undefined;
}
function stock(item: StructureStorage | StructureTerminal) {
  return { id: item.id, free: item.isActive() ? item.store.getFreeCapacity() ?? 0 : 0,
    stock: Object.fromEntries(Object.keys(item.store).map(resource => [resource, item.store.getUsedCapacity(resource as ResourceConstant)])) };
}
