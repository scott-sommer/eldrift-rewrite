import type { IntelController, IntelRecord, IntelStructure, RoomSummary } from './model';
import type { TraversalBlock } from './traversal-model';
/** Raw hostile indexes include allies and passive NPC objects; detailed facts refine them. */
export function traversalThreat(record: IntelRecord, friendly: ReadonlySet<string>): TraversalBlock | undefined {
  const summary = record.summary;
  if (!summary) return record.hostileIds.length ? 'unclassified-threat' : undefined;
  if (controllerHostile(summary.controller, friendly)) return 'hostile';
  if (summary.units.some(unit => !unit.owned && !friendly.has(unit.owner))) return 'hostile';
  if (summary.structures.some(item => structureHostile(item, friendly))) return 'hostile';
  return unknownHostiles(record, summary) ? 'unclassified-threat' : undefined;
}
function controllerHostile(controller: IntelController | null, friendly: ReadonlySet<string>): boolean {
  if (!controller) return false;
  const reservation = controller.reservation;
  return foreign(controller.owner, friendly) || (reservation !== null && foreign(reservation.username, friendly));
}
function structureHostile(item: IntelStructure, friendly: ReadonlySet<string>): boolean {
  const dangerous = item.type === 'tower' || item.type === 'invaderCore';
  return dangerous && item.hostile && !item.owned && !friendly.has(item.owner ?? '');
}
function foreign(owner: string | null, friendly: ReadonlySet<string>): boolean {
  return owner !== null && !friendly.has(owner);
}
function unknownHostiles(record: IntelRecord, summary: RoomSummary): boolean {
  const known = new Set([...summary.units, ...summary.structures].map(item => item.id));
  return record.hostileIds.some(id => !known.has(id));
}
