/** Source containers feed durable storage; stores are never sources here, preventing banking loops. */
export function observeEnergyBanking(room: Room, storageReserve: number, terminalReserve: number) {
  const sources = room.find(FIND_SOURCES);
  const containers = room.find(FIND_STRUCTURES).filter((item): item is StructureContainer =>
    item.structureType === STRUCTURE_CONTAINER && sources.some(source => item.pos.getRangeTo(source) <= 2));
  const stock = containers.map(item => ({ id: item.id, resource: 'energy', amount: item.store.getUsedCapacity(RESOURCE_ENERGY), minimumBatch: 0, priority: 0 }));
  const sinks = [destination(room.storage, storageReserve, 0), destination(room.terminal, terminalReserve, 1)]
    .filter((item): item is NonNullable<typeof item> => item !== undefined);
  return { sources: stock, sinks };
}
function destination(item: StructureStorage | StructureTerminal | undefined, reserve: number, priority: number) {
  return item?.my ? { id: item.id, free: Math.max(0, item.store.getFreeCapacity() - reserve), priority } : undefined;
}
