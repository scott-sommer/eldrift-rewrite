import type { CollectionSource } from '../../capabilities/resources/collection';
import { movementPosition } from './movement-traffic';
/** Snapshot only; controller-link classification and reserve policy are supplied by composition. */
export function observeWorkerEnergy(room: Room, controllerLinks: ReadonlySet<string>): CollectionSource[] {
  const structures = room.find(FIND_STRUCTURES).flatMap(item => {
    if (item.structureType === STRUCTURE_CONTAINER) return [stored(item, 'container')];
    if (!('my' in item) || !item.my || !item.isActive()) return [];
    if (item.structureType === STRUCTURE_STORAGE) return [stored(item, 'storage')];
    if (item.structureType === STRUCTURE_TERMINAL) return [stored(item, 'terminal')];
    if (item.structureType === STRUCTURE_LINK) return [{ ...stored(item, 'link'), controllerLink: controllerLinks.has(item.id) }];
    return [];
  });
  const drops = room.find(FIND_DROPPED_RESOURCES).filter(item => item.resourceType === RESOURCE_ENERGY).map(item => ({
    id: item.id, position: movementPosition(item.pos), kind: 'drop' as const, stock: item.amount, available: item.amount,
  }));
  const remains = [...room.find(FIND_TOMBSTONES), ...room.find(FIND_RUINS)].map(item => stored(item, 'remains'));
  return [...structures, ...drops, ...remains];
}
function stored(item: { id: string; pos: RoomPosition; store: StoreDefinition }, kind: CollectionSource['kind']): CollectionSource {
  const stock = item.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0;
  return { id: item.id, position: movementPosition(item.pos), kind, stock, available: stock };
}
