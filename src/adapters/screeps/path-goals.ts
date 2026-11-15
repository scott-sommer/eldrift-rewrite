import type { Position } from '../../capabilities/movement/step';
/** Native PathFinder ranges span room borders; gameplay action ranges do not. */
export function nativePathGoals(destination: Position, range: number) {
  const boundary = Math.min(destination.x, destination.y, 49 - destination.x, 49 - destination.y);
  if (range < boundary || range === 0) {
    return [{ pos: new RoomPosition(destination.x, destination.y, destination.room), range }];
  }
  const minimum = boundary === 0 ? 0 : 1;
  const maximum = boundary === 0 ? 49 : 48;
  const goals: { pos: RoomPosition; range: number }[] = [];
  for (let x = Math.max(minimum, destination.x - range); x <= Math.min(maximum, destination.x + range); x++) {
    for (let y = Math.max(minimum, destination.y - range); y <= Math.min(maximum, destination.y + range); y++) {
      goals.push({ pos: new RoomPosition(x, y, destination.room), range: 0 });
    }
  }
  return goals;
}
