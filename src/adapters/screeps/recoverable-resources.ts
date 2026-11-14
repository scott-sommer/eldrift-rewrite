/** Perishable objects only: stored stock is never a preservation source. */
export function observeRecoverableResources(room: Room, pickupCapacity: number) {
  const drops = pickupCapacity > 0 ? room.find(FIND_DROPPED_RESOURCES).map(item => ({ id: item.id, resource: item.resourceType,
    amount: item.amount, minimumBatch: Math.min(item.amount, pickupCapacity), priority: 0 })) : [];
  const remains = [...room.find(FIND_TOMBSTONES), ...room.find(FIND_RUINS)].flatMap(item =>
    Object.keys(item.store).map(resource => ({ id: item.id, resource, amount: item.store.getUsedCapacity(resource as ResourceConstant), minimumBatch: 0, priority: 1 })));
  const sinks = [room.storage, room.terminal].flatMap((item, priority) => item?.my ? [{ id: item.id, free: item.store.getFreeCapacity(), priority }] : []);
  return { sources: [...drops, ...remains], sinks };
}
