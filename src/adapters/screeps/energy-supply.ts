/** Owned-room energy supply observation; request policy stays outside the adapter. */
export function observeEnergySupply(room: Room, pickupCapacity = 0) {
  const structures = room.find(FIND_STRUCTURES);
  const sources = structures.filter((item): item is StructureContainer | StructureStorage | StructureTerminal =>
    item.structureType === STRUCTURE_CONTAINER ||
    (item.structureType === STRUCTURE_STORAGE || item.structureType === STRUCTURE_TERMINAL) && item.my)
    .map(item => endpoint(item, item.store.getUsedCapacity(RESOURCE_ENERGY), 0));
  sources.push(...room.find(FIND_TOMBSTONES).map(item => endpoint(item, item.store.getUsedCapacity(RESOURCE_ENERGY), -2)));
  sources.push(...room.find(FIND_RUINS).map(item => endpoint(item, item.store.getUsedCapacity(RESOURCE_ENERGY), -1)));
  const drops = pickupCapacity > 0 ? room.find(FIND_DROPPED_RESOURCES).filter(item => item.resourceType === RESOURCE_ENERGY)
    .map(item => ({ ...endpoint(item, item.amount, -3), minimumBatch: Math.min(item.amount, pickupCapacity) })) : [];
  const sinks = structures.filter((item): item is StructureSpawn | StructureExtension =>
    (item.structureType === STRUCTURE_SPAWN || item.structureType === STRUCTURE_EXTENSION) && item.my)
    .map(item => endpoint(item, item.store.getFreeCapacity(RESOURCE_ENERGY), item.structureType === STRUCTURE_SPAWN ? 0 : 1));
  return { sources: [...drops, ...sources], sinks };
}
function endpoint(item: { id: string; pos: RoomPosition }, amount: number, priority: number) {
  return { id: item.id, position: { room: item.pos.roomName, x: item.pos.x, y: item.pos.y }, amount, priority };
}
