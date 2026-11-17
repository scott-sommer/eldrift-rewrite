import { adjacentRoom } from '../../core/geometry/room-grid';
import { classifyIntelRoom } from './classification';
import { object, text, natural, tickOrNull, textOrNull, position } from './validation';
import type { RoomSummary, IntelExit } from './model';
export function validRoomSummary(value: unknown): value is RoomSummary {
  if (!object(value) || !validHeader(value)) return false;
  return validOptionalFacts(value) && validCollections(value) && validExits(value.room as string, value.exits) && uniqueObjects(value);
}
function validHeader(value: Record<string, unknown>): boolean {
  return text(value.room) && natural(value.observedAt) && validClassification(value) && validStatus(value);
}
function validOptionalFacts(value: Record<string, unknown>): boolean {
  return (value.controller === null || validController(value.controller)) && (value.mineral === null || validMineral(value.mineral));
}

function validClassification(value: Record<string, unknown>): boolean {
  try {
    const expected = classifyIntelRoom(value.room as string);
    return value.highway === expected.highway && value.keeper === expected.keeper && value.center === expected.center;
  } catch { return false; }
}
function validStatus(value: Record<string, unknown>): boolean {
  return ['normal','closed','novice','respawn','unknown'].includes(value.status as string) && tickOrNull(value.statusTimestamp);
}
function validCollections(value: Record<string, unknown>): boolean {
  return collection(value.sources, validSource, 16) && collection(value.structures, validStructure, 10000)
    && collection(value.units, validUnit, 10000);
}
function collection(value: unknown, valid: (item: unknown) => boolean, maximum: number): boolean {
  return Array.isArray(value) && value.length <= maximum && value.every(valid);
}
function validObject(value: unknown): value is Record<string, unknown> {
  return object(value) && text(value.id) && position(value);
}
function validController(value: unknown): boolean {
  if (!validObject(value) || !natural(value.level) || value.level > 8) return false;
  return typeof value.owned === 'boolean' && textOrNull(value.owner) && validReservation(value.reservation) && validControllerRelation(value);
}
function validControllerRelation(value: Record<string, unknown>): boolean {
  if (value.owner !== null && value.reservation !== null) return false;
  return !value.owned || text(value.owner) && value.level !== 0;
}
function validReservation(value: unknown): boolean {
  return value === null || object(value) && text(value.username) && natural(value.ticksToEnd);
}
function validSource(value: unknown): boolean { return validObject(value) && natural(value.capacity); }
function validMineral(value: unknown): boolean { return validObject(value) && text(value.type); }
function validStructure(value: unknown): boolean {
  return validObject(value) && text(value.type) && textOrNull(value.owner)
    && typeof value.owned === 'boolean' && typeof value.hostile === 'boolean' && !(value.owned && value.hostile);
}
function validUnit(value: unknown): boolean {
  return validObject(value) && text(value.owner) && typeof value.owned === 'boolean' && typeof value.power === 'boolean';
}
function validExits(room: string, value: unknown): boolean {
  if (!collection(value, entry => validExit(room, entry), 4)) return false;
  const exits = value as IntelExit[];
  return new Set(exits.map(exit => exit.direction)).size === exits.length;
}
function validExit(room: string, value: unknown): boolean {
  if (!object(value) || ![1,3,5,7].includes(value.direction as number)) return false;
  return value.room === adjacentRoom(room, value.direction as IntelExit['direction']);
}
function uniqueObjects(value: Record<string, unknown>): boolean {
  const summary = value as unknown as RoomSummary;
  const objects = [...summary.sources, ...summary.structures, ...summary.units,
    ...(summary.controller ? [summary.controller] : []), ...(summary.mineral ? [summary.mineral] : [])];
  return objects.length <= 10000 && new Set(objects.map(item => item.id)).size === objects.length;
}
