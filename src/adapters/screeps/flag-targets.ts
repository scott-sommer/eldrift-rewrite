import type { Position } from '../../capabilities/movement/step';
import { validateAvoidancePosition } from '../../capabilities/movement/avoidance';
import { roomCoordinates } from '../../core/geometry/room-grid';
/** Tick-local plain goals; no feature, pathfinder or persistent mission ownership. */
export function createNativeFlagTargets() {
  let tick = -1, names: string[] = [];
  const goals = new Map<string, Position | undefined>();
  return { resolve(selector: string): Position | undefined {
    if (!selector) return undefined;
    if (tick !== Game.time) { tick = Game.time; names = Object.keys(Game.flags ?? {}).sort(); goals.clear(); }
    if (!goals.has(selector)) {
      const name = names.find(name => name.includes(selector)), flag = name === undefined ? undefined : Game.flags[name];
      goals.set(selector, flag ? position(flag.pos) : undefined);
    }
    const goal = goals.get(selector);
    return goal ? { ...goal } : undefined;
  } };
}
function position(value: RoomPosition): Position {
  const result = { room: value.roomName, x: value.x, y: value.y };
  validateAvoidancePosition(result); roomCoordinates(result.room);
  return result;
}
