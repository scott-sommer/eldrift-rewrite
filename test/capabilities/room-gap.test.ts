import { expect, test, vi } from 'vitest';
import { pathableRoomGap } from '../../src/capabilities/intel/room-gap';
import { createRoomGraph } from '../../src/capabilities/intel/room-graph';
import { roomCoordinates } from '../../src/core/geometry/room-grid';
function graph(rooms: Record<string, string[]>, blocked: string[] = []) {
  return { exits: vi.fn((room: string) => rooms[room]), allows: (room: string) => !blocked.includes(room) };
}
const budget = { depth: 8, reads: 32 };
test('corner gap preserves two real cardinal hops across the west/east coordinate boundary', () => {
  const ports = graph({ W0N1: ['E0N1'], E0N1: ['W0N1','E0N0'], E0N0: ['E0N1'] });
  const result = pathableRoomGap('W0N1', 'E0N0', ports, budget);
  expect(result).toMatchObject({ status: 'found', gap: 1, exact: true, route: ['W0N1','E0N1','E0N0'] });
  if (result.status !== 'found') throw new Error('Expected witnessed route');
  for (let index = 1; index < result.route.length; index++) {
    const a = roomCoordinates(result.route[index - 1]!), b = roomCoordinates(result.route[index]!);
    expect(Math.abs(a.x-b.x) + Math.abs(a.y-b.y)).toBe(1);
  }
});
test('a geometric diagonal without a real corner path is unreachable', () => {
  const ports = graph({ E0S0: ['E1S0'], E1S0: ['E0S0'], E1S1: [] });
  expect(pathableRoomGap('E0S0','E1S1',ports,budget)).toMatchObject({ status: 'unavailable', reason: 'unreachable' });
});
test('blocked intermediates cannot authorize corners and another real corner may still work', () => {
  const rooms = { E0S0: ['E1S0','E0S1'], E1S0: ['E1S1'], E0S1: ['E1S1'], E1S1: [] };
  expect(pathableRoomGap('E0S0','E1S1',graph(rooms,['E1S0']),budget)).toMatchObject({
    status: 'found', gap: 1, route: ['E0S0','E0S1','E1S1'] });
  expect(pathableRoomGap('E0S0','E1S1',graph(rooms,['E1S0','E0S1']),budget)).toMatchObject({ status: 'unavailable', reason: 'unreachable' });
  const blocked = graph(rooms,['E1S1']);
  expect(pathableRoomGap('E0S0','E1S1',blocked,budget)).toEqual({ status: 'unavailable', reason: 'blocked-destination', reads: 0 });
  expect(blocked.exits).not.toHaveBeenCalled();
});
test('pathable ranking distinguishes a detour from linear distance and retains actual route evidence', () => {
  const chain = ['E0S0','E0S1','E0S2','E1S2','E2S2','E2S1','E2S0'];
  const rooms = Object.fromEntries(chain.map((room,index) => [room, chain.filter((_,neighbor) => Math.abs(neighbor-index) === 1)]));
  const result = pathableRoomGap(chain[0]!,chain.at(-1)!,graph(rooms),budget);
  expect(result).toMatchObject({ status: 'found', gap: 4, exact: true, route: chain });
  expect(pathableRoomGap(chain[0]!,chain.at(-1)!,graph(rooms),{ ...budget, depth: 2 }))
    .toMatchObject({ status: 'unavailable', reason: 'depth-limit' });
});
test('directed reachability is never inferred from a successful reverse search', () => {
  const ports = graph({ E0S0: ['E1S0'], E1S0: [] });
  expect(pathableRoomGap('E0S0','E1S0',ports,budget).status).toBe('found');
  expect(pathableRoomGap('E1S0','E0S0',ports,budget)).toMatchObject({ status: 'unavailable', reason: 'unreachable' });
});
test('unknown graph, read cap and admission are distinct from unreachable; a partial route is not certified minimal', () => {
  expect(pathableRoomGap('E0S0','E1S0',graph({}),budget)).toEqual({ status: 'unavailable', reason: 'unknown-exits', reads: 1 });
  const ports = graph({ E0S0: ['E1S0'], E1S0: [] });
  expect(pathableRoomGap('E0S0','E1S0',ports,{ depth: 8, reads: 0 })).toEqual({ status: 'unavailable', reason: 'room-budget', reads: 0 });
  expect(ports.exits).not.toHaveBeenCalled();
  expect(pathableRoomGap('E0S0','E1S0',ports,{ depth: 8, reads: 1 })).toEqual({
    status: 'found', gap: 1, route: ['E0S0','E1S0'], exact: false, reads: 1 });
  expect(ports.exits).toHaveBeenCalledTimes(1);
  ports.exits.mockClear();
  expect(pathableRoomGap('E0S0','E1S0',ports,budget,() => false)).toEqual({ status: 'unavailable', reason: 'admission', reads: 0 });
  expect(ports.exits).not.toHaveBeenCalled();
});
test('request snapshots are detached but a new request observes changes instead of stale or symmetric cache entries', () => {
  const rooms = { E0S0: ['E1S0'], E1S0: [], E0S1: [] }, ports = graph(rooms);
  const cached = createRoomGraph(ports,32,() => true);
  expect(cached.edges('E0S0')).toEqual([{ room: 'E1S0' }]);
  rooms.E0S0.push('E0S1');
  expect(cached.edges('E0S0')).toEqual([{ room: 'E1S0' }]);
  expect(createRoomGraph(ports,32,() => true).edges('E0S0')).toEqual([{ room: 'E0S1' },{ room: 'E1S0' }]);
});
test('zero-distance requires no map reads; malformed cardinal exits and invalid budgets reject', () => {
  const ports = graph({ E0S0: ['E1S1'] });
  expect(pathableRoomGap('E0S0','E0S0',ports,budget)).toEqual({ status: 'found', gap: 0, route: ['E0S0'], exact: true, reads: 0 });
  expect(() => pathableRoomGap('E0S0','E1S1',ports,budget)).toThrow('cardinal exits');
  for (const patch of [{depth:-1},{depth:1.5},{depth:65},{reads:-1},{reads:10001}]) {
    expect(() => pathableRoomGap('E0S0','E1S0',ports,{...budget,...patch})).toThrow();
  }
});
