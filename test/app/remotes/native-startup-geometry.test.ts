import { afterEach, expect, test, vi } from 'vitest';
import { createNativeStartupGeometry } from '../../../src/app/remotes/startup/native-geometry';
import { startupFixture, startupPosition } from '../../fixtures/remote-startup';
import type { StartupGeometryFacts } from '../../../src/features/remotes/startup/geometry';
vi.mock('../../../src/adapters/screeps/service-position',() => ({ canStandAt: (_room: unknown,point: { room: string; x: number; y: number }) => !(point.room === 'E0N1' && point.x === 6 && point.y === 25) }));
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const f = startupFixture(), spawn = { id: 'spawn',isActive: () => true,pos: startupPosition(47,25,'W0N1') }, bank = { id: 'bank',my: true,isActive: () => true,pos: startupPosition(45,25,'W0N1') };
  const container = { structureType: 'container',pos: startupPosition(5,25) };
  vi.stubGlobal('FIND_SOURCES',4); vi.stubGlobal('FIND_MY_SPAWNS',5);
  vi.stubGlobal('Game',{ time: 1,rooms: { W0N1: { name: 'W0N1',controller: { my: true },storage: bank,find: () => [spawn] },E0N1: { name: 'E0N1',find: (kind: number) => kind === 4 ? [f.source] : kind === 2 ? [container] : [] } } });
  return f;
}
test('observed source/container/ports and matching generation bodies generate detached geometry without writes',() => {
  const f = fixture(), before = JSON.stringify(f.root), propose = createNativeStartupGeometry(f.state), plan = propose(f.miner)!;
  expect(plan.station).toEqual({ room: 'E0N1',x: 5,y: 25 }); expect(plan.spawn.exit).toEqual({ room: 'W0N1',x: 48,y: 25 }); expect(plan.miner).toEqual(f.miner.body);
  expect(propose({ ...f.miner,generation: 2 })).toBeUndefined(); expect(JSON.stringify(f.root)).toBe(before);
  delete Game.rooms.E0N1; expect(propose(f.miner)).toBeUndefined();
});
test('alternate geometry strategies receive readiness facts without native travel, publication or financial authority',() => {
  const f = fixture(), strategy = vi.fn((facts: StartupGeometryFacts) => { expect(facts.stations.filter(station => station.status === 'ready')).toHaveLength(1); expect(facts.stations.some(station => station.status === 'empty')).toBe(true); return undefined; });
  expect(createNativeStartupGeometry(f.state,strategy)(f.miner)).toBeUndefined(); expect(strategy).toHaveBeenCalledTimes(1);
});
