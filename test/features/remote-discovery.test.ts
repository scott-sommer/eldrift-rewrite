import { expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createRemoteDiscovery } from '../../src/features/remotes/discovery/cycle';
function fixture() {
  const root = {}, state = createMemoryPort(() => root), graph: Record<string,string[] | undefined> = {
    W0N1: ['E0N1','W0N2'],E0N1: ['W0N1','E1N1'],E1N1: ['E0N1'] };
  const ports = { exits: vi.fn((room: string) => graph[room]),allows: vi.fn((room: string) => room !== 'W0N2') };
  const bounds = { depth: 2,maximumRooms: 64,refreshInterval: 10 };
  const service = () => createRemoteDiscovery(state,'W0N1');
  return { root,state,graph,ports,bounds,service };
}
test('one-read cardinal frontier resumes after recreation without re-reading the home', () => {
  const f = fixture();
  expect(f.service().advance(1,'policy',f.bounds,1,f.ports,() => true)).toMatchObject({ status: 'discovering',rooms: [] });
  expect(f.service().read().rooms).toEqual(['E0N1']);
  expect(f.service().advance(2,'policy',f.bounds,1,f.ports,() => true)).toMatchObject({ status: 'complete',rooms: ['E0N1','E1N1'] });
  expect(f.ports.exits.mock.calls.map(call => call[0])).toEqual(['W0N1','E0N1']);
  f.service().advance(3,'policy',f.bounds,1,f.ports,() => true); expect(f.ports.exits).toHaveBeenCalledTimes(2);
});
test('admission inside an exit row preserves the unprocessed neighbor instead of treating it as blocked', () => {
  const f = fixture(); let admitted = true;
  f.ports.allows.mockImplementationOnce(() => { admitted = false; return false; });
  f.service().advance(1,'policy',f.bounds,1,f.ports,() => admitted);
  expect(f.service().read().pending?.next).toBe(0); expect(f.service().read().seen).toEqual(['W0N1']);
  admitted = true; f.service().advance(2,'policy',f.bounds,1,f.ports,() => admitted);
  expect(f.service().read().published).toEqual(['E0N1','E1N1']);
});
test('blocked corridors cannot be replaced by geometric shortcuts; explicit room caps report truncation', () => {
  const f = fixture(); f.ports.allows.mockReturnValue(false);
  expect(f.service().advance(1,'policy',f.bounds,10,f.ports,() => true).rooms).toEqual([]);
  expect(f.ports.exits).toHaveBeenCalledTimes(1);
  const g = fixture(); expect(g.service().advance(1,'policy',{ ...g.bounds,maximumRooms: 1 },10,g.ports,() => true))
    .toMatchObject({ rooms: ['E0N1'],truncated: true });
});
test('policy changes reset publication; no admission and reversed clocks cannot write', () => {
  const f = fixture(), before = JSON.stringify(f.root);
  f.service().advance(1,'policy',f.bounds,1,f.ports,() => false); expect(JSON.stringify(f.root)).toBe(before);
  f.service().advance(2,'policy',f.bounds,10,f.ports,() => true);
  const snapshot = JSON.stringify(f.root); expect(f.service().advance(1,'policy',f.bounds,1,f.ports,() => true).status).toBe('stale'); expect(JSON.stringify(f.root)).toBe(snapshot);
  f.service().advance(3,'changed',f.bounds,0,f.ports,() => true); expect(f.service().read().published).toEqual([]);
});
