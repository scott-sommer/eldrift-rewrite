/** Explicit recovery donors may supply spawning infrastructure, never normal tower/store demand. */
export function observeReclamationSupply(room: Room, enabled: boolean) {
  if (!enabled) return [];
  const structures = room.find(FIND_STRUCTURES);
  const allowedSinks = structures.filter(item =>
    (item.structureType === STRUCTURE_SPAWN || item.structureType === STRUCTURE_EXTENSION) && item.my && item.isActive())
    .map(item => item.id);
  return structures.filter((item): item is StructureLink | StructureLab =>
    (item.structureType === STRUCTURE_LINK || item.structureType === STRUCTURE_LAB) && item.my && item.isActive())
    .map(item => ({ id: item.id, amount: item.store.getUsedCapacity(RESOURCE_ENERGY), priority: 1, allowedSinks,
      position: { room: item.pos.roomName, x: item.pos.x, y: item.pos.y } }));
}
