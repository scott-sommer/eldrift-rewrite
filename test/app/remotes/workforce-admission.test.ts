import { constructionBudget } from '../../../src/app/remotes/infrastructure/population/home';
import { reservationOwner } from '../../../src/features/remotes/reservation/identity';
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

test('reservations share same-tick and observed capacity with miners and construction workers',() => {
  const f = fixture(), owner = reservationOwner({ home: 'W0N1',room: 'E0N1',generation: 1 });
  expect(admitRemoteWorkforceSpawn(f.state,{ ...f.request('reserve'),owner },() => f.settings)).toBe(true);
  expect(f.run('source')).toBe(true); expect(f.run('builder',true)).toBe(false);
  Game.time = 2; Game.creeps = { reserver: { name: 'reserver',memory: { population: { home: 'W0N1',owner } },spawning: true } as Creep };
  expect(f.run('builder',true)).toBe(true); expect(f.run('source-next')).toBe(false);
  expect(admitRemoteWorkforceSpawn(f.state,{ ...f.request('malformed'),owner: 'remote-reservation:[]' },() => f.settings)).toBe(false);
});

test('pending reservers reduce construction capacity before they appear in the roster',() => {
  const f = fixture(), owner = reservationOwner({ home: 'W0N1',room: 'E0N1',generation: 1 });
  const snapshot = { home: { energyAvailable: 1300,storage: { store: { energy: 3000 } } } as Room,
    body: { parts: ['move'] as const,cost: 50,spawnTicks: 3 },
    roster: [{ name: 'miner',owner: f.request('source').owner,room: 'W0N1',spawning: false,ticksToLive: 100 }],
    pending: [{ ...f.request('reserve'),owner }] };
  const input = { ...snapshot,body: { ...snapshot.body,parts: [...snapshot.body.parts] } };
  expect(constructionBudget(input,f.settings).additionalSlots).toBe(0);
  input.pending = []; expect(constructionBudget(input,f.settings).additionalSlots).toBe(1);
});
