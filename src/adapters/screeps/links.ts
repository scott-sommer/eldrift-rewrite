import type { createActionArbiter } from '../../core/execution/action-arbiter';
const position = (pos: RoomPosition) => ({ room: pos.roomName, x: pos.x, y: pos.y });
export function observeLinks(room: Room) {
  const links = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLink => item.structureType === STRUCTURE_LINK)
    .map(link => ({ id: link.id, position: position(link.pos), energy: link.store.getUsedCapacity(RESOURCE_ENERGY),
      capacity: link.store.getCapacity(RESOURCE_ENERGY), cooldown: link.cooldown, active: link.isActive() }));
  return { links, room: { sources: room.find(FIND_SOURCES).map(source => position(source.pos)),
    storageEnergy: room.storage?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0,
    ...(room.storage ? { storage: position(room.storage.pos) } : {}), ...(room.controller ? { controller: position(room.controller.pos) } : {}) } };
}
export function issueLinkTransfer(arbiter: ReturnType<typeof createActionArbiter>, owner: string,
  command: { source: string; sink: string; amount: number }) {
  const source = Game.getObjectById(command.source as Id<StructureLink>);
  const sink = Game.getObjectById(command.sink as Id<StructureLink>);
  if (!source || !sink) return;
  return arbiter.issue(source.id, owner, ['transfer-energy'], () => source.transferEnergy(sink, command.amount), code => code === OK);
}
