import { afterEach, expect, test, vi } from 'vitest';
import { createObservationSource } from '../../src/adapters/screeps/observations';
import { createTickObserver } from '../../src/world/observe';
afterEach(() => vi.unstubAllGlobals());

test('adapter indexes normal and power units, copies metadata and scans each category once per tick', () => {
  vi.stubGlobal('FIND_CREEPS', 101);
  vi.stubGlobal('FIND_POWER_CREEPS', 120);
  vi.stubGlobal('FIND_STRUCTURES', 107);
  const creep = { id: 'creep', owner: { username: 'self' }, my: true, memory: { private: 'not copied' } };
  const power = { id: 'power', owner: { username: 'enemy' }, my: false };
  const find = vi.fn((type: number) => {
    if (type === 101) return [creep];
    if (type === 120) return [power];
    return [{ id: 'road', structureType: 'road' }, { id: 'spawn', structureType: 'spawn', my: true }];
  });
  const game = { rooms: { W1N1: { controller: { my: true }, find } } } as unknown as Pick<Game, 'rooms'>;
  const observer = createTickObserver(createObservationSource(game), () => []);
  const observed = observer.read(1).rooms.get('W1N1')!;
  observer.read(1);
  expect(find.mock.calls.map(call => call[0])).toEqual([101, 120, 107]);
  expect(observed.units).toEqual([{ id: 'creep', owner: 'self', owned: true }, { id: 'power', owner: 'enemy', owned: false }]);
  expect(observed.threats.map(unit => unit.id)).toEqual(['power']);
  expect(observed.structures.map(structure => structure.owned)).toEqual([false, true]);
  creep.owner.username = 'changed';
  expect(observed.ownUnits[0]?.owner).toBe('self');
  observer.read(2);
  expect(find).toHaveBeenCalledTimes(6);
});

test('adapter reports missing rooms rather than inventing an empty observation', () => {
  const source = createObservationSource({ rooms: {} });
  expect(source.visibleRooms()).toEqual([]);
  expect(() => source.observeRoom('W1N1')).toThrow('no longer visible');
});
