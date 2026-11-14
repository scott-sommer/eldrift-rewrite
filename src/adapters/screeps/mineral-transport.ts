/** Mineral station containers are explicit sources; ordinary storage and terminals are destinations only. */
export function observeMineralTransport(room: Room, terminalReserve: number, storageReserve: number) {
  const minerals = room.find(FIND_MINERALS);
  const containers = room.find(FIND_STRUCTURES).filter((item): item is StructureContainer =>
    item.structureType === STRUCTURE_CONTAINER && minerals.some(mineral => item.pos.getRangeTo(mineral) <= 2));
  const sources = containers.flatMap(container => Object.keys(container.store).map(resource => ({ id: container.id, resource,
    amount: container.store.getUsedCapacity(resource as ResourceConstant), minimumBatch: 0, priority: 0 })));
  const sinks = [destination(room.terminal, terminalReserve, 0), destination(room.storage, storageReserve, 1)]
    .filter((sink): sink is NonNullable<typeof sink> => sink !== undefined);
  return { sources, sinks };
}
function destination(structure: StructureTerminal | StructureStorage | undefined, reserve: number, priority: number) {
  return structure?.my ? { id: structure.id, free: Math.max(0, structure.store.getFreeCapacity() - reserve), priority } : undefined;
}
