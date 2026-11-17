import { awaitsUpgradeMasterHandoff } from '../features/work/upgrade-master-handoff';
import { movementPosition } from '../adapters/screeps/movement-traffic';
export function awaitsNativeMasterHandoff(master: Creep, room: Room): boolean {
  return awaitsUpgradeMasterHandoff({ level: room.controller!.level, cargo: master.store.getUsedCapacity(),
    position: movementPosition(master.pos) }, () => Object.values(Game.creeps).map(unit => ({
    owned: unit.my, spawning: unit.spawning, recovering: !!unit.memory.upgradeSupplyRecovery,
    energy: unit.store.energy, position: movementPosition(unit.pos), population: unit.memory.population,
  })));
}
