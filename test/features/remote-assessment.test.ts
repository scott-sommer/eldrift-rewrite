import type { IntelController } from '../../src/features/intel/model';
import { expect, test, vi } from 'vitest';
import { assessRemoteSource } from '../../src/features/remotes/assessment';
import type { RemoteAssessmentRequest, RemoteTravelResult } from '../../src/features/remotes/assessment-model';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createIntelStore } from '../../src/features/intel/store';
import { intelSummary } from '../fixtures/intel-summary';
function fixture() {
  const root = {}, store = createIntelStore(createMemoryPort(() => root));
  const home = { ...intelSummary(10,'W0N1'), structures: [], units: [] };
  const controller: IntelController = { ...intelSummary(10,'E0N1').controller!, level: 0, owned: false, owner: null };
  const remote = { ...intelSummary(10,'E0N1'), structures: [], units: [], controller };
  store.observeSummary(home); store.observeSummary(remote);
  const request: RemoteAssessmentRequest = { home: 'W0N1', room: 'E0N1', source: 'source', tick: 12,
    traversal: { mode: 'known-safe', username: 'bot', allies: ['ally'], blockedRooms: [], avoidUntil: {},
      allowKeeper: false, maximumAge: 5, maximumRooms: 16, unknownCost: 8, staleCost: 4, keeperCost: 25 },
    economics: { regenerationTicks: 300, harvestPower: 2,
      miner: { body: ['work','move'], lifetime: 1500 },
      hauler: { body: ['carry','carry','move'], lifetime: 1500, serviceTicks: 2 },
      reservation: { energyPerTick: 0, spawnLoad: 0, shares: 1 }, infrastructurePerTick: 0, riskPerTick: 0,
      limits: { maximumHaulers: 10, maximumSpawnLoad: 1, minimumNetYield: 0.1 } } };
  const ports = { intel: vi.fn((room: string) => store.peek(room,request.tick).record), status: vi.fn(() => 'normal' as const),
    estimate: vi.fn<() => RemoteTravelResult>(() => ({ status: 'complete', minerTicks: 30,minerReturnTicks: 40,outboundTicks: 20,returnTicks: 30,
      rooms: ['W0N1','E0N1'],operations: 12 })) };
  const assess = () => assessRemoteSource(request,ports);
  return { root,store,request,ports,assess,remote };
}
test('known-safe source assessment exposes separate travel economics and reservation facts without state writes', () => {
  const f = fixture(), before = JSON.stringify(f.root), result = f.assess();
  expect(result).toMatchObject({ status: 'assessed', home: 'W0N1', room: 'E0N1', source: 'source', observedAt: 10,
    sourceFacts: { id: 'source',capacity: 3000,x: 10,y: 10 },reservation: { state: 'none', remainingTicks: 0 }, economics: { accepted: true, harvestRate: 2 } });
  expect(f.ports.intel.mock.calls.filter(([room]) => room === 'E0N1')).toHaveLength(1);
  expect(JSON.stringify(f.root)).toBe(before);
});
test('stale intel, expired reservation and another home prevent optimistic profitable estimates', () => {
  const f = fixture(); f.request.traversal.maximumAge = 1;
  expect(f.assess()).toMatchObject({ status: 'deferred',reason: 'traversal:stale' });
  f.request.traversal.maximumAge = 50;
  f.remote.controller.reservation = { username: 'bot',ticksToEnd: 1 }; f.store.observeSummary(f.remote);
  expect(f.assess()).toMatchObject({ status: 'deferred',reason: 'reservation-expired' });
  f.request.assignedHome = 'W1N1';
  expect(f.assess()).toMatchObject({ status: 'rejected',reason: 'assigned-elsewhere' });
  expect(f.ports.estimate).not.toHaveBeenCalled();
});
test('a friendly room owner or reservation is safe to traverse but not free remote-mining ownership', () => {
  const f = fixture(); f.remote.controller.owner = 'ally'; f.store.observeSummary(f.remote);
  expect(f.assess()).toMatchObject({ status: 'rejected',reason: 'owned-room' });
  f.remote.controller.owner = null; f.remote.controller.reservation = { username: 'ally',ticksToEnd: 100 };
  f.store.observeSummary(f.remote);
  expect(f.assess()).toMatchObject({ status: 'rejected',reason: 'foreign-reservation' });
  expect(f.ports.estimate).not.toHaveBeenCalled();
});
test('own reservation duration is aged and a new request observes hostile changes instead of cached safety', () => {
  const f = fixture(); f.remote.controller.reservation = { username: 'bot',ticksToEnd: 10 }; f.store.observeSummary(f.remote);
  expect(f.assess()).toMatchObject({ status: 'assessed',reservation: { state: 'ours',remainingTicks: 8 } });
  f.remote.controller.reservation = { username: 'enemy',ticksToEnd: 100 }; f.store.observeSummary(f.remote);
  f.ports.estimate.mockClear();
  expect(f.assess()).toMatchObject({ status: 'deferred',reason: 'traversal:hostile' });
  expect(f.ports.estimate).not.toHaveBeenCalled();
});
test('a partial path or exhausted admission has no economic score', () => {
  const f = fixture(); f.ports.estimate.mockReturnValue({ status: 'deferred',reason: 'path-incomplete' });
  expect(f.assess()).toMatchObject({ status: 'deferred',reason: 'travel:path-incomplete' });
  f.ports.estimate.mockClear();
  expect(assessRemoteSource(f.request,f.ports,() => false)).toMatchObject({ status: 'deferred',reason: 'traversal:admission' });
  expect(f.ports.estimate).not.toHaveBeenCalled();
});
test('complete travel claims must retain cardinal route evidence and cannot bypass unsafe intermediates', () => {
  const f = fixture();
  f.ports.estimate.mockReturnValue({ status: 'complete',minerTicks: 30,minerReturnTicks: 40,outboundTicks: 20,returnTicks: 30,
    rooms: ['W0N1','W0N2','E0N2','E0N1'],operations: 12 });
  expect(f.assess()).toMatchObject({ status: 'deferred',reason: 'travel:room-policy' });
  f.ports.estimate.mockReturnValue({ status: 'complete',minerTicks: 30,minerReturnTicks: 40,outboundTicks: 20,returnTicks: 30,
    rooms: ['W0N1','W0N0','E0N1'],operations: 12 });
  expect(() => f.assess()).toThrow('crossing');
});
test('mutable estimate ports cannot change source capacity, economic policy or returned route evidence', () => {
  const f = fixture();
  const estimate = vi.fn<NonNullable<Parameters<typeof assessRemoteSource>[1]['estimate']>>((context) => {
    context.request.economics.miner.body = ['move'];
    context.intel('E0N1').summary!.sources[0]!.capacity = 0;
    return { status: 'complete',minerTicks: 30,minerReturnTicks: 40,outboundTicks: 20,returnTicks: 30,rooms: ['W0N1','E0N1'],operations: 12 };
  });
  expect(assessRemoteSource(f.request,{ ...f.ports,estimate })).toMatchObject({ status: 'assessed',economics: { harvestRate: 2 } });
  expect(f.request.economics.miner.body).toEqual(['work','move']);
});

test('assessment retains the exact detached economic policy for later travel-compatible bundle repricing', () => {
  const f = fixture(), result = f.assess();
  if (result.status !== 'assessed') throw new Error('Expected assessment');
  expect(result.policy).toEqual(f.request.economics);
  f.request.economics.miner.body = ['work','work','move'];
  expect(result.policy.miner.body).toEqual(['work','move']);
  result.policy.hauler.body = ['carry','move'];
  expect(f.request.economics.hauler.body).toEqual(['carry','carry','move']);
});
