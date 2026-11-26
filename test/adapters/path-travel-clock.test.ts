import { expect, test } from 'vitest';
import { pathTravelClock } from '../../src/adapters/screeps/path-travel-clock';
import type { Position } from '../../src/capabilities/movement/step';
const mobility = { mobile: true as const,weight: 4,recovery: 4,roadCost: 1,plainCost: 2,swampCost: 10 };
const point = (x: number,y: number,room = 'W0N1'): Position => ({ room,x,y });
test('edge transport merges both path representations and clears fatigue; final action need not wait',() => {
  const path = [point(47,26),point(48,25),point(49,25),point(0,25,'E0N1'),point(1,26,'E0N1'),point(2,26,'E0N1'),point(3,26,'E0N1'),point(4,25,'E0N1'),point(5,25,'E0N1')];
  expect(pathTravelClock(point(46,25),path,mobility,() => 2)).toBe(14);
});
test('road and swamp fatigue affect subsequent movement, while a broken route refuses a clock',() => {
  expect(pathTravelClock(point(10,10),[point(11,10),point(12,10)],mobility,() => 10)).toBe(11);
  expect(pathTravelClock(point(10,10),[point(11,10),point(12,10)],mobility,() => 1)).toBe(2);
  expect(pathTravelClock(point(10,10),[point(20,10)],mobility,() => 2)).toBeUndefined();
});
