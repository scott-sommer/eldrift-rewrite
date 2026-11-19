import { afterEach, expect, test, vi } from 'vitest';
import { admitRemoteWorkforceSpawn } from '../../../src/app/remotes/workforce-admission';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { remoteConstructionOwner } from '../../../src/features/remotes/infrastructure/worker-identity';
import { remoteFleetOwner } from '../../../src/features/remotes/fleet/identity';
import { defaults } from '../../../src/config/model';
import type { SpawnRequest } from '../../../src/capabilities/spawning/request';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const root = {}, state = createMemoryPort(() => root); vi.stubGlobal('Game',{ time: 1,creeps: {} });
  const settings = { ...defaults,remoteWorkerMaximumUnits: 2,remoteConstructionMaximumWorkers: 1 };
  const request = (id: string, builder = false): SpawnRequest => ({ id,name: id,room: 'W0N1',owner: builder ? remoteConstructionOwner({ home: 'W0N1',room: 'E0N1',generation: 1 })
    : remoteFleetOwner({ home: 'W0N1',room: 'E0N1',source: 'source',kind: 'miner' }),body: ['move'],priority: 0,readyAt: 1,expiresAt: 100 });
  const run = (id: string,builder = false) => admitRemoteWorkforceSpawn(state,request(id,builder),() => settings);
  return { root,state,settings,request,run };
}
test('same-tick source and construction admissions share physical capacity before native creep creation',() => {
  const f = fixture(); expect(f.run('source')).toBe(true); expect(f.run('builder',true)).toBe(true); expect(f.run('extra')).toBe(false);
  expect(admitRemoteWorkforceSpawn(createMemoryPort(() => f.root),f.request('reload'),() => f.settings)).toBe(false);
});
test('construction ceiling does not consume a source slot when a second builder is refused',() => {
  const f = fixture(); expect(f.run('one',true)).toBe(true); expect(f.run('two',true)).toBe(false); expect(f.run('source')).toBe(true);
});
test('actual home-scoped workforce replaces prior tick reservations and duplicate requests cannot repeat',() => {
  const f = fixture(); expect(f.run('one')).toBe(true); expect(f.run('one')).toBe(false); Game.time = 2;
  Game.creeps = { existing: { name: 'existing',memory: { population: { home: 'W0N1',owner: f.request('old',true).owner } },spawning: true } as Creep };
  expect(f.run('builder',true)).toBe(false); expect(f.run('source')).toBe(true); expect(f.run('extra')).toBe(false);
});
test('unrelated population requests do not create remote workforce admission state',() => {
  const f = fixture(); expect(admitRemoteWorkforceSpawn(f.state,{ ...f.request('other'),owner: 'unrelated' },() => f.settings)).toBe(true);
  expect(f.state.read('structure-intents/dispatch')).toBeUndefined();
});
