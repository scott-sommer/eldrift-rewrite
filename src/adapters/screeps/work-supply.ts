/** Observes local recipients without choosing work, moving workers, or issuing actions. */
export function observeWorkSupply(room: Room, workers: readonly Creep[]) {
  const containers = room.find(FIND_STRUCTURES).filter((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER);
  const controller = room.controller;
  const container = controller ? containers.filter(item => item.pos.getRangeTo(controller) <= 3)
    .sort((a, b) => a.pos.getRangeTo(controller) - b.pos.getRangeTo(controller) || a.id.localeCompare(b.id))[0] : undefined;
  return {
    storageAvailable: !!room.storage?.my,
    container: container ? { id: container.id, energy: container.store.getUsedCapacity(RESOURCE_ENERGY), free: container.store.getFreeCapacity() } : undefined,
    workers: workers.filter(unit => unit.my && !unit.spawning && unit.room.name === room.name)
      .map(unit => ({ id: unit.id, free: unit.store.getFreeCapacity(RESOURCE_ENERGY) })),
  };
}
