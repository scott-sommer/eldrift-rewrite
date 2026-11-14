import type { Position } from '../../capabilities/movement/step';
import { withinRange } from '../../capabilities/movement/path-model';
export interface UpgradeLayout { storage: Position; controller: Position; spawn: Position; lab: Position }
export type UpgradeStations = { status: 'ready'; stations: readonly Position[] } | { status: 'invalid'; reason: string; slot?: number };
const offsets: readonly (readonly [number, number])[] = [[0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0]];
/** Seven legacy slots around storage; east renews and north boosts. */
export function planUpgradeStations(layout: UpgradeLayout, standable: (position: Position) => boolean): UpgradeStations {
  if (!Object.values(layout).every(position => validPosition(position) && position.room === layout.storage.room)) return { status: 'invalid', reason: 'invalid-layout' };
  const stations = offsets.map(([x, y]) => ({ room: layout.storage.room, x: layout.storage.x + x, y: layout.storage.y + y }));
  const blocked = stations.findIndex(position => !interior(position) || !standable(position));
  if (blocked >= 0) return { status: 'invalid', reason: 'blocked-station', slot: blocked };
  const distant = stations.findIndex(position => !withinRange(position, layout.controller, 3));
  if (distant >= 0) return { status: 'invalid', reason: 'controller-out-of-range', slot: distant };
  if (!withinRange(stations[6]!, layout.spawn, 1)) return { status: 'invalid', reason: 'spawn-out-of-range', slot: 6 };
  if (!withinRange(stations[0]!, layout.lab, 1)) return { status: 'invalid', reason: 'lab-out-of-range', slot: 0 };
  return { status: 'ready', stations };
}
function validPosition(position: Position): boolean {
  return !!position && typeof position.room === 'string' && position.room.length > 0
    && [position.x, position.y].every(value => Number.isInteger(value) && value >= 0 && value < 50);
}
function interior(position: Position): boolean { return position.x > 0 && position.x < 49 && position.y > 0 && position.y < 49; }
