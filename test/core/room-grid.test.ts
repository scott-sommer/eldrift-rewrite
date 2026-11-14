import { expect, test } from 'vitest';
import { adjacentRoom, roomCoordinates, roomName } from '../../src/core/geometry/room-grid';
test.each([
  ['W0N0', { x: -1, y: -1 }], ['E0S0', { x: 0, y: 0 }],
  ['W12S34', { x: -13, y: 34 }], ['E100N200', { x: 100, y: -201 }],
])('world grid round-trips %s', (name, coordinate) => {
  expect(roomCoordinates(name)).toEqual(coordinate);
  expect(roomName(coordinate)).toBe(name);
});
test('zero-axis neighbors remain distinct and invert correctly', () => {
  expect(adjacentRoom('W0N0', 3)).toBe('E0N0');
  expect(adjacentRoom('E0N0', 7)).toBe('W0N0');
  expect(adjacentRoom('E0N0', 5)).toBe('E0S0');
  expect(adjacentRoom('E0S0', 1)).toBe('E0N0');
  expect(adjacentRoom('W1N1', 3)).toBe('W0N1');
  expect(adjacentRoom('W1N1', 1)).toBe('W1N2');
});
test.each(['sim', 'W00N0', 'E-1S0', 'W0N0extra', 'E9007199254740991S0'])('rejects noncanonical or unsafe room %s', name => {
  expect(() => roomCoordinates(name)).toThrow();
});
