/** Native facts only; reserve allocation and endpoint preference belong to recovery policy. */
export function observeSupportStores(room: Room | undefined) {
  if (!room?.controller?.my) return [];
  return [room.storage, room.terminal].flatMap(store => store?.my ? [{ id: store.id,
    kind: store.structureType, owned: true, energy: store.store.getUsedCapacity('energy') ?? 0 }] : []);
}
export function observeSupportSinks(room: Room | undefined) {
  if (!room?.controller?.my) return [];
  return room.find(FIND_STRUCTURES).flatMap(structure => 'store' in structure ? [{ id: structure.id,
    kind: structure.structureType, owned: 'my' in structure && structure.my, active: structure.isActive(),
    free: structure.store.getFreeCapacity('energy') ?? 0 }] : []);
}
