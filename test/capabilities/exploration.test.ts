import { expect, test, vi } from 'vitest';
import { exploreRooms } from '../../src/capabilities/intel/exploration';
const rooms: Record<string,string[]> = { E0S0: ['E1S0','E0S1'], E1S0: ['E0S0','E1S1'], E0S1: ['E0S0','E1S1'], E1S1: [] };
function setup() { return { exits: vi.fn((room: string) => rooms[room]), allows: (room: string) => room !== 'blocked' }; }
const budget = { depth: 2, reads: 16, rooms: 16 };

test('depth counts actual crossings and deduplicates real cardinal paths', () => {
  const result = exploreRooms('E0S0', setup(), budget);
  expect(result.rooms).toEqual([{ room: 'E0S1', depth: 1, route: ['E0S0','E0S1'] },
    { room: 'E1S0', depth: 1, route: ['E0S0','E1S0'] },
    { room: 'E1S1', depth: 2, route: ['E0S0','E0S1','E1S1'] }]);
  expect(result.incomplete).toBeUndefined();
  expect(exploreRooms('E0S0',setup(),{ ...budget, depth: 1 }).rooms).toHaveLength(2);
});

test('map reads, discovered rooms, admission and unknown map are distinct bounds', () => {
  expect(exploreRooms('E0S0',setup(),{ ...budget, reads: 0 })).toMatchObject({ rooms: [], reads: 0, incomplete: 'exit-budget' });
  expect(exploreRooms('E0S0',setup(),{ ...budget, rooms: 1 })).toMatchObject({ reads: 1, incomplete: 'room-budget' });
  expect(exploreRooms('E0S0',setup(),budget,() => false)).toMatchObject({ reads: 0, incomplete: 'admission' });
  expect(exploreRooms('W1N1',setup(),budget)).toMatchObject({ reads: 1, incomplete: 'unknown-exits' });
  expect(exploreRooms('E0S0',setup(),{ ...budget, depth: 0 })).toEqual({ rooms: [], reads: 0 });
});

test('blocked intermediates cannot create imaginary reachability and topology is validated', () => {
  const ports = setup(); ports.allows = room => room === 'E1S1';
  expect(exploreRooms('E0S0',ports,budget).rooms).toEqual([]);
  ports.exits.mockReturnValue(['E1S1']);
  expect(() => exploreRooms('E0S0',ports,budget)).toThrow('cardinal');
  for (const patch of [{ depth: 65 },{ reads: -1 },{ rooms: 1.5 }]) expect(() => exploreRooms('E0S0',setup(),{ ...budget, ...patch })).toThrow('budget');
});
