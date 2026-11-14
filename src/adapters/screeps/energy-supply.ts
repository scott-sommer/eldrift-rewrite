/** Owned-room energy supply observation; request policy stays outside the adapter. */
export function observeEnergySupply(room: Room) {
  const structures = room.find(FIND_STRUCTURES);
  const sources = structures.filter((item): item is StructureContainer | StructureStorage | StructureTerminal =>
    item.structureType === STRUCTURE_CONTAINER ||
    (item.structureType === STRUCTURE_STORAGE || item.structureType === STRUCTURE_TERMINAL) && item.my)
    .map(item => endpoint(item, item.store.getUsedCapacity(RESOURCE_ENERGY), 0));
  const sinks = structures.filter((item): item is StructureSpawn | StructureExtension =>
    (item.structureType === STRUCTURE_SPAWN || item.structureType === STRUCTURE_EXTENSION) && item.my)
    .map(item => endpoint(item, item.store.getFreeCapacity(RESOURCE_ENERGY), item.structureType === STRUCTURE_SPAWN ? 0 : 1));
  return { sources, sinks };
}
function endpoint(item: Structure, amount: number, priority: number) {
  return { id: item.id, position: { room: item.pos.roomName, x: item.pos.x, y: item.pos.y }, amount, priority };
}
