import type { IntelController, IntelObject, IntelStructure, IntelUnit, RoomSummary } from '../features/intel/model';
import { classifyIntelRoom } from '../features/intel/classification';
/** Hidden rooms produce no observation; no cached game objects or inferred empty facts escape. */
export function observeNativeIntel(name: string): RoomSummary | undefined {
  const room = Game.rooms[name];
  if (!room) return undefined;
  const status = Game.map.getRoomStatus(name);
  const hostile = new Set(room.find(FIND_HOSTILE_STRUCTURES).map(item => item.id as string));
  const mineral = room.find(FIND_MINERALS)[0];
  return { room: name, observedAt: Game.time, status: status?.status ?? 'unknown', statusTimestamp: status?.timestamp ?? null,
    ...classifyIntelRoom(name), controller: controllerFact(room.controller),
    sources: room.find(FIND_SOURCES).map(source => ({ ...objectFact(source), capacity: source.energyCapacity })),
    mineral: mineral ? { ...objectFact(mineral), type: mineral.mineralType } : null,
    structures: room.find(FIND_STRUCTURES).filter(item => item.structureType !== STRUCTURE_CONTROLLER)
      .map(item => structureFact(item, hostile)),
    units: [...room.find(FIND_CREEPS).map(unit => unitFact(unit, false)),
      ...room.find(FIND_POWER_CREEPS).map(unit => unitFact(unit, true))], exits: exitFacts(name) };
}
function objectFact(value: { id: string; pos: RoomPosition }): IntelObject {
  return { id: value.id, x: value.pos.x, y: value.pos.y };
}
function controllerFact(controller: StructureController | undefined): IntelController | null {
  if (!controller) return null;
  const reservation = controller.reservation;
  return { ...objectFact(controller), level: controller.level, owned: controller.my === true, owner: controller.owner?.username ?? null,
    reservation: reservation ? { username: reservation.username, ticksToEnd: reservation.ticksToEnd } : null };
}
function structureFact(structure: AnyStructure, hostile: ReadonlySet<string>): IntelStructure {
  return { ...objectFact(structure), type: structure.structureType, owned: 'my' in structure && structure.my === true,
    owner: 'owner' in structure ? structure.owner?.username ?? null : null, hostile: hostile.has(structure.id) };
}
function unitFact(unit: Creep | PowerCreep, power: boolean): IntelUnit {
  return { ...objectFact(unit), owner: unit.owner.username, owned: unit.my === true, power };
}
function exitFacts(room: string) {
  const exits = Game.map.describeExits(room);
  return ([1,3,5,7] as const).flatMap(direction => {
    const next = exits?.[direction];
    return next ? [{ direction, room: next }] : [];
  });
}
