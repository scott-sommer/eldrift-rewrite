import { expect, test } from 'vitest';
import { createTickObserver, observeTick } from '../../src/world/observe';
import type { RoomObservation } from '../../src/world/model';
const room: RoomObservation = {
  name: 'W1N1', owned: true,
  units: [{ id: 'mine', owner: 'self', owned: true }, { id: 'ally', owner: 'friend', owned: false }, { id: 'enemy', owner: 'stranger', owned: false }],
  structures: [{ id: 'spawn', type: 'spawn', owned: true }, { id: 'road-a', type: 'road', owned: false }, { id: 'road-b', type: 'road', owned: true }],
};

test('indexes ownership and configured diplomacy without treating allies as threats', () => {
  const view = observeTick(1, { visibleRooms: () => [room.name], observeRoom: () => room }, () => ['friend']);
  const observed = view.rooms.get(room.name)!;
  expect(observed.ownUnits.map(unit => unit.id)).toEqual(['mine']);
  expect(observed.allies.map(unit => unit.id)).toEqual(['ally']);
  expect(observed.threats.map(unit => unit.id)).toEqual(['enemy']);
  expect(observed.structuresByType.get('road')).toHaveLength(2);
  expect(view.ownedRooms).toEqual([observed]);
});

test('one scan per room per tick and next tick drops rooms that lose visibility', () => {
  let names = ['W1N1', 'W1N1'];
  let scans = 0;
  const observer = createTickObserver({ visibleRooms: () => names, observeRoom: () => { scans++; return room; } }, () => []);
  const first = observer.read(1);
  expect(observer.read(1)).toBe(first);
  expect(scans).toBe(1);
  names = [];
  expect(observer.read(2).rooms.size).toBe(0);
  expect(first.rooms.size).toBe(1);
});

test('one failed room keeps original diagnostics and does not prevent another room observation', () => {
  const error = new Error('observation failed');
  const view = observeTick(2, { visibleRooms: () => ['bad', 'W1N1'], observeRoom: name => { if (name === 'bad') throw error; return room; } }, () => []);
  expect(view.rooms.has('W1N1')).toBe(true);
  expect(view.failures).toEqual([{ room: 'bad', error }]);
});
