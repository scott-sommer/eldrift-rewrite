import { shouldRepairMining } from '../../capabilities/mining/repair-policy';
import type { MiningRepairPolicy } from '../../capabilities/mining/repair-policy';
import { nativeHarvestRate } from './mining-rates';
import type { MiningStation } from '../../capabilities/mining/station';
import { energyReadiness, mineralReadiness, mineralCapacity } from '../../capabilities/mining/production';
export function miningTarget(station: MiningStation): Source | Mineral | null {
  const target = Game.getObjectById(station.target as Id<Source | Mineral>);
  if (!target) return null;
  if (station.kind === 'energy') return 'energy' in target ? target : null;
  return 'mineralType' in target && target.mineralType === station.resource ? target : null;
}
export function miningReadiness(target: Source | Mineral, station: MiningStation) {
  const view = { tick: Game.time, available: 'energy' in target ? target.energy : target.mineralAmount,
    readyAt: Game.time + (target.ticksToRegeneration ?? 0) };
  if ('energy' in target) return energyReadiness(view);
  const extractor = station.extractor ? Game.getObjectById(station.extractor as Id<StructureExtractor>) : null;
  if (!extractor || extractor.structureType !== STRUCTURE_EXTRACTOR || !extractor.pos.isEqualTo(target.pos)) {
    return mineralReadiness(view, 'missing', 0);
  }
  return mineralReadiness(view, extractor.isActive() ? 'ready' : 'inactive', extractor.cooldown);
}
export function miningInfrastructure(creep: Creep, station: MiningStation) {
  const structures = [station.link, station.container, station.storage].flatMap(id => {
    const structure = id ? Game.getObjectById(id as Id<StructureContainer | StructureLink | StructureStorage>) : null;
    return usableSink(creep, structure) ? [structure!] : [];
  });
  const resource = station.resource as ResourceConstant;
  const sink = structures.find(structure => (structure.store.getFreeCapacity(resource) ?? 0) > 0);
  const repair = structures.find(structure => structure.hits < structure.hitsMax && creep.pos.inRangeTo(structure, 3));
  const site = creep.room.find(FIND_MY_CONSTRUCTION_SITES).find(item =>
    item.structureType === STRUCTURE_CONTAINER && station.access.some(tile =>
      tile.room === item.pos.roomName && tile.x === item.pos.x && tile.y === item.pos.y) && creep.pos.inRangeTo(item, 3));
  return { sink, repair, site };
}

export function miningCapacity(creep: Creep, target: Source | Mineral) {
  if ('energy' in target) return undefined;
  const power = nativeHarvestRate(creep.body, 'mineral') * (EXTRACTOR_COOLDOWN + 1);
  return mineralCapacity(Game.time, target.mineralAmount, creep.store.getFreeCapacity(), power);
}

export function miningRepair(structure: { hits: number; hitsMax: number } | undefined,
  target: Source | Mineral | null, energy: number, policy?: Readonly<MiningRepairPolicy>): boolean {
  if (!structure) return false;
  const depleted = !!target && 'energy' in target && target.energy === 0;
  return shouldRepairMining(structure.hits, structure.hitsMax, energy, depleted, policy);
}


function usableSink(creep: Creep, structure: StructureContainer | StructureLink | StructureStorage | null): boolean {
  if (!structure || !creep.pos.inRangeTo(structure, 1)) return false;
  if (structure.structureType === STRUCTURE_CONTAINER) return true;
  if (structure.structureType !== STRUCTURE_LINK && structure.structureType !== STRUCTURE_STORAGE) return false;
  return structure.my && structure.isActive();
}
