import { expect, test } from 'vitest';
import { createRoomRouter } from '../../src/capabilities/movement/room-route';
const policy = { version: 'safe-1', blockedRooms: ['E0S0'], costs: { W1N0: 3 }, maximumRooms: 4 };
test('room routing excludes hostile rooms and exposes explicit costs', () => {
  const route = createRoomRouter((origin, destination, cost) => {
    expect(origin).toBe('W0N0'); expect(destination).toBe('E0N0');
    expect(cost('E0S0')).toBe(Infinity);
    expect(cost('W1N0')).toBe(3);
    expect(cost('__proto__')).toBe(1);
    return ['E0N0'];
  });
  expect(route('W0N0', 'E0N0', policy)).toEqual({ status: 'complete', rooms: ['W0N0', 'E0N0'], policyVersion: 'safe-1' });
});
test('exclusions, unavailable routes and room budgets are distinct', () => {
  const absent = createRoomRouter(() => null);
  expect(absent('W0N0', 'E0S0', policy)).toMatchObject({ reason: 'destination-excluded' });
  expect(absent('W0N0', 'E0N0', policy)).toMatchObject({ reason: 'no-route' });
  expect(absent('W0N0', 'W0N0', policy)).toMatchObject({ rooms: ['W0N0'] });
  const long = createRoomRouter(() => ['E0N0']);
  expect(long('W0N0', 'E0N0', { ...policy, maximumRooms: 1 })).toMatchObject({ reason: 'room-limit' });
  expect(() => createRoomRouter(() => ['E0S0', 'E0N0'])('W0N0', 'E0N0', policy)).toThrow('violated room policy');
});
