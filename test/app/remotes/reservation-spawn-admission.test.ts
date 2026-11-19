import { afterEach, expect, test, vi } from 'vitest';
import { reservationManagementFixture } from '../../fixtures/reservation-management';
import { createNativeReservationQuote } from '../../../src/app/remotes/reservation/native-quote';
import { admitReservationSpawn } from '../../../src/app/remotes/reservation/population/admission';
import { createSpawnQueue } from '../../../src/features/population/spawn-queue';
import { defaults } from '../../../src/config/model';
vi.mock('../../../src/app/remotes/reservation/native-quote',() => ({ createNativeReservationQuote: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
function fixture() {
  const f = reservationManagementFixture(), home = { name: 'W0N1',controller: { my: true,level: 4,owner: { username: 'bot' } },energyCapacityAvailable: 1300,energyAvailable: 1300,storage: { store: { energy: 80000 } } };
  vi.stubGlobal('Game',{ time: 20,rooms: { W0N1: home },creeps: {},spawns: {},cpu: { getUsed: () => 0,tickLimit: 100 } });
  const current = structuredClone(f.quote); current.observedAt = 20;
  vi.mocked(createNativeReservationQuote).mockReturnValue(vi.fn(() => current));
  const settings = { ...defaults,remoteReservationEnabled: true,remoteManagementEnabled: true,remoteWorkersEnabled: true,remoteSpawningEnabled: true };
  const request = { id: 'reserver',name: 'reserver',owner: f.plan.owner,room: 'W0N1',body: f.plan.quote.body.parts,priority: 50,readyAt: 20,expiresAt: 100 };
  const run = () => admitReservationSpawn(f.state,request,() => settings);
  return { ...f,home,current,settings,request,run };
}
test('final spawn admission requires current generation, controller geometry, price and enabled policy',() => {
  const f = fixture(); expect(f.run()).toBe(true);
  f.current.controller.position.x++; expect(f.run()).toBe(false); f.current.controller.position.x--;
  f.settings.remoteSpawningEnabled = false; expect(f.run()).toBe(false); f.settings.remoteSpawningEnabled = true;
  f.settings.remoteReservationEnabled = false; expect(f.run()).toBe(false); f.settings.remoteReservationEnabled = true;
  f.request.body = ['move']; expect(f.run()).toBe(false); f.request.body = f.quote.body.parts;
  f.assignments.reconcile({ home: 'W0N1',expectedRevision: f.assignments.read().revision,tick: 20,lifetime: 100,plans: [] }); expect(f.run()).toBe(false);
});
test('real birth stock, protected storage and other queued births are checked again at dispatch',() => {
  const f = fixture(); f.home.energyAvailable = 1299; expect(f.run()).toBe(false); f.home.energyAvailable = 1300;
  f.home.storage.store.energy = 51299; expect(f.run()).toBe(false); f.home.storage.store.energy = 51300; expect(f.run()).toBe(true);
  createSpawnQueue(f.state,'W0N1').submit({ ...f.request,id: 'source',name: 'source',owner: 'source-owner',body: ['move'] });
  expect(f.run()).toBe(false);
});
test('foreign requests are delegated but malformed or wrong-home reservation requests cannot pass',() => {
  const f = fixture();
  expect(admitReservationSpawn(f.state,{ ...f.request,owner: 'foreign' },() => f.settings)).toBe(true);
  expect(admitReservationSpawn(f.state,{ ...f.request,owner: 'remote-reservation:[]' },() => f.settings)).toBe(false);
  expect(admitReservationSpawn(f.state,{ ...f.request,room: 'W1N1' },() => f.settings)).toBe(false);
});

test('a stale queued birth cannot add another healthy or spawning reserver',() => {
  const f = fixture();
  const creep = { name: 'existing',memory: { population: { home: 'W0N1',owner: f.plan.owner } },spawning: false,ticksToLive: 500,
    body: f.plan.quote.body.parts.map(type => ({ type,hits: 100 })) } as Creep;
  Game.creeps = { existing: creep }; expect(f.run()).toBe(false);
  creep.spawning = true; expect(f.run()).toBe(false);
  creep.spawning = false; creep.ticksToLive = 50; expect(f.run()).toBe(true);
  f.settings.remoteWorkerCpuBudget = 0; expect(f.run()).toBe(false);
});
