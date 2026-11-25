export type NativeSpawnEnergyStructure = StructureSpawn | StructureExtension;
export const explicitSpawnEnergyPolicy = 'spawn-first-range-id-v1';
/** Explicit SDK order: matches native category/range rules and makes ties deterministic. */
export function orderedSpawnEnergy(origin: StructureSpawn, structures: readonly NativeSpawnEnergyStructure[]): NativeSpawnEnergyStructure[] {
  return structures.filter(point => point.my && point.isActive() && point.pos.roomName === origin.pos.roomName)
    .sort((a,b) => category(a)-category(b) || distance(origin,a)-distance(origin,b) || a.id.localeCompare(b.id));
}
function category(point: NativeSpawnEnergyStructure): number { return point.structureType === 'spawn' ? 0 : 1; }
function distance(origin: StructureSpawn, point: NativeSpawnEnergyStructure): number {
  return Math.max(Math.abs(point.pos.x-origin.pos.x),Math.abs(point.pos.y-origin.pos.y));
}
export function nativeSpawnEnergyStructures(home: Room): NativeSpawnEnergyStructure[] {
  return home.find(FIND_MY_STRUCTURES).filter((point): point is NativeSpawnEnergyStructure => ['spawn','extension'].includes(point.structureType) && point.my && point.isActive());
}
