import type { Position } from '../../capabilities/movement/step';
import { withinRange } from '../../capabilities/movement/path-model';
export interface MasterLayout { storage: Position; terminal: Position; spawn: Position; lab: Position }
export function planUpgradeMasterStation(layout: MasterLayout, standable: (position: Position) => boolean): Position | undefined {
  const station = { room: layout.lab.room, x: layout.lab.x + 1, y: layout.lab.y + 1 };
  if (![station.x, station.y].every(value => Number.isInteger(value) && value > 0 && value < 49)) return undefined;
  if (!Object.values(layout).every(position => withinRange(station, position, 1)) || !standable(station)) return undefined;
  return station;
}
