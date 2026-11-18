import { afterEach, expect, test, vi } from 'vitest';
import { nativeRemoteRoute } from '../../src/app/native-remote-route';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createIntelStore } from '../../src/features/intel/store';
import type { IntelTraversalPolicy } from '../../src/features/intel/traversal-model';
import { intelSummary } from '../fixtures/intel-summary';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const root = {}, port = createMemoryPort(() => root), intel = createIntelStore(port);
  const home = { ...intelSummary(10,'W0N1'),structures: [],units: [] };
  const target = { ...intelSummary(10,'E0N1'),structures: [],units: [],controller: null };
  intel.observeSummary(home); intel.observeSummary(target);
  const findRoute = vi.fn((origin: string, destination: string, options: { routeCallback(room: string): number }) => {
    if (origin === destination) return [];
    return options.routeCallback(destination) === Infinity ? -2 : [{ room: destination,exit: 3 }];
  });
  vi.stubGlobal('Game',{ time: 10,map: { getRoomStatus: () => ({ status: 'normal' }),findRoute } });
  vi.stubGlobal('ERR_NO_PATH',-2);
  const policy: IntelTraversalPolicy = { mode: 'known-safe',username: 'bot',allies: [],blockedRooms: [],avoidUntil: {},
    allowKeeper: false,maximumAge: 20,maximumRooms: 64,unknownCost: 8,staleCost: 4,keeperCost: 25 };
  return { root,port,intel,home,target,policy,findRoute };
}
test('operational room routing returns an exact admitted corridor without modifying intel', () => {
  const f = fixture(), before = JSON.stringify(f.root);
  expect(nativeRemoteRoute(f.port,'W0N1','E0N1',f.policy,8,false,() => true)).toMatchObject({ allowedRooms: ['W0N1','E0N1'],maximumRooms: 8 });
  expect(JSON.stringify(f.root)).toBe(before);
});
test('only retreat may escape an excluded origin, and its destination is never exempted', () => {
  const f = fixture(); f.policy.blockedRooms = ['E0N1'];
  expect(nativeRemoteRoute(f.port,'E0N1','W0N1',f.policy,8,false,() => true)).toBeUndefined();
  expect(nativeRemoteRoute(f.port,'E0N1','W0N1',f.policy,8,true,() => true)?.allowedRooms).toEqual(['E0N1','W0N1']);
  expect(nativeRemoteRoute(f.port,'W0N1','E0N1',f.policy,8,true,() => true)).toBeUndefined();
  expect(nativeRemoteRoute(f.port,'E0N1','E0N1',f.policy,8,true,() => true)).toBeUndefined();
});
test('admission and room limits fail closed without terrain-only or exploration fallback', () => {
  const f = fixture();
  expect(nativeRemoteRoute(f.port,'W0N1','E0N1',f.policy,8,false,() => false)).toBeUndefined();
  expect(f.findRoute).not.toHaveBeenCalled();
  expect(nativeRemoteRoute(f.port,'W0N1','E0N1',f.policy,1,false,() => true)).toBeUndefined();
  expect(nativeRemoteRoute(f.port,'W0N1','E0N1',{ ...f.policy,maximumRooms: 1 },8,false,() => true)).toBeUndefined();
  expect(() => nativeRemoteRoute(f.port,'W0N1','E0N1',{ ...f.policy,mode: 'exploration' },8,false,() => true)).toThrow('policy');
});
