import { constructionAuthority } from '../features/construction/authority';
import type { RemoteConstructionPolicy } from '../features/construction/authority';
import { observeRoomPlanningInput } from '../adapters/screeps/room-assessment';
import { nativePlanningLimits } from '../adapters/screeps/planning-limits';
import { placementKey } from '../features/planning/dependencies';
import { constructionReservationKey } from '../features/construction/reservation-ledger';
import type { ConstructionExecutionPorts, ConstructionAttempt } from '../features/construction/executor';
/** Global owned sites are authoritative across rooms, including rooms outside the current execution list. */
export function nativeConstructionSiteKeys(): ReadonlySet<string> {
  return new Set(Object.values(Game.constructionSites).map(site => constructionReservationKey(site.pos.roomName,
    { type: site.structureType, x: site.pos.x, y: site.pos.y })));
}
/** Default usable reserve is owned storage energy; terminal energy is opt-in policy. */
export function nativeConstructionPorts(name: string, roomSiteLimit: number, includeTerminalEnergy = false, remote?: RemoteConstructionPolicy): ConstructionExecutionPorts {
  return { observe() {
    const room = Game.rooms[name], input = observeRoomPlanningInput(name);
    if (!room || !input || !nativeConstructionAuthority(name, remote).allowed) throw new Error('Construction observation unavailable');
    const structures = input.infrastructure.map(item => ({ id: item.id, type: item.type,
      x: item.position.x, y: item.position.y, owned: item.owned || ['road', 'container'].includes(item.type) }));
    const sites = room.find(FIND_CONSTRUCTION_SITES).map(site => ({ id: site.id, type: site.structureType,
      x: site.pos.x, y: site.pos.y, owned: site.my }));
    const occupied = room.find(FIND_HOSTILE_CREEPS).map(creep => creep.pos.x + ':' + creep.pos.y);
    return { level: room.controller?.level ?? 0, ...(!room.controller?.my ? { stageLevel: 1 } : {}), storedEnergy: usableEnergy(room, includeTerminalEnergy),
      terrain: input.terrain, objects: input.objects, structures, sites,
      completed: new Set(structures.filter(item => item.owned).map(placementKey)), temporarilyOccupied: new Set(occupied),
      limits: nativePlanningLimits(), globalSites: nativeConstructionSiteKeys().size, globalSiteLimit: MAX_CONSTRUCTION_SITES, roomSiteLimit };
  }, create(entry) {
    const room = Game.rooms[name];
    const authority = nativeConstructionAuthority(name, remote, entry.type);
    if (!room || !authority.allowed) return { status: 'not-owned', reason: authority.reason };
    return nativeConstructionResult(room.createConstructionSite(entry.x, entry.y, entry.type as BuildableStructureConstant));
  } };
}
function usableEnergy(room: Room, includeTerminal: boolean): number {
  const storage = room.storage?.my ? room.storage.store.getUsedCapacity(RESOURCE_ENERGY) : 0;
  const terminal = includeTerminal && room.terminal?.my ? room.terminal.store.getUsedCapacity(RESOURCE_ENERGY) : 0;
  return storage + terminal;
}
export function nativeConstructionResult(code: number): ConstructionAttempt {
  switch (code) {
    case OK: return { status: 'created', reason: 'accepted' };
    case ERR_FULL: return { status: 'full', reason: 'site-limit' };
    case ERR_RCL_NOT_ENOUGH: return { status: 'rcl', reason: 'controller-level' };
    case ERR_NOT_OWNER: return { status: 'not-owned', reason: 'ownership' };
    case ERR_INVALID_ARGS: return { status: 'invalid', reason: 'arguments' };
    default: return { status: 'retry', reason: 'engine:' + code };
  }
}

function nativeConstructionAuthority(name: string, remote?: RemoteConstructionPolicy, type?: string) {
  const room = Game.rooms[name], controller = room?.controller;
  return constructionAuthority({ room: name, visible: !!room, owned: !!controller?.my,
    ...(controller?.owner ? { owner: controller.owner.username } : {}),
    ...(controller?.reservation ? { reservation: controller.reservation.username } : {}) }, remote, type);
}
