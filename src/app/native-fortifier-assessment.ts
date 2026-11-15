import type { WorkAssessment } from '../capabilities/work/assessment';
import { excludeBarrierRepairs } from '../capabilities/work/repair-exclusion';
import { parseArtRegion } from '../features/operator/art-region';
import { movementPosition } from '../adapters/screeps/movement-traffic';
const diagnostics = new Map<string, string>();
/** Flags are input only. Invalid regions protect all barriers until their corners are corrected. */
export function nativeFortifierAssessment(room: Room, view: WorkAssessment): WorkAssessment {
  const result = parseArtRegion(room.name, room.find(FIND_FLAGS).map(flag => ({ name: flag.name, position: movementPosition(flag.pos) })));
  if (result.status !== 'invalid') {
    diagnostics.delete(room.name);
    return excludeBarrierRepairs(view, result.status === 'valid' ? result.region : undefined);
  }
  if (diagnostics.get(room.name) !== result.reason) {
    console.log('Art region ' + room.name + ': ' + result.reason + '; barrier repairs suspended');
    diagnostics.set(room.name, result.reason);
  }
  return excludeBarrierRepairs(view, 'all');
}
