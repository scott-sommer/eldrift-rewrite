import type { Position } from '../../capabilities/movement/step';
export type RemoteTransportSource = StructureContainer | Resource;
export function eligibleTransportSource(target: RemoteTransportSource, source: Position): boolean {
  if (target.pos.roomName !== source.room) return false;
  const range = Math.max(Math.abs(target.pos.x-source.x),Math.abs(target.pos.y-source.y));
  return 'resourceType' in target ? target.resourceType === RESOURCE_ENERGY && range <= 3
    : target.structureType === STRUCTURE_CONTAINER && range <= 2;
}
export function transportSources(room: Room, source: Position): RemoteTransportSource[] {
  const containers = room.find(FIND_STRUCTURES).filter((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER);
  return [...containers,...room.find(FIND_DROPPED_RESOURCES)].filter(item => eligibleTransportSource(item,source))
    .sort((a,b) => stock(b)-stock(a) || a.id.localeCompare(b.id));
}
function stock(target: RemoteTransportSource): number {
  return 'resourceType' in target ? target.amount : target.store.energy;
}
