import { afterEach, expect, test, vi } from 'vitest';
import { admitRemoteConstructionSpawn } from '../../../src/app/remotes/infrastructure/population/admission';
import { createNativeConstructionPlans } from '../../../src/app/remotes/infrastructure/population/plans';
import { constructionHome, constructionBudget } from '../../../src/app/remotes/infrastructure/population/home';
import { remoteConstructionOwner } from '../../../src/features/remotes/infrastructure/worker-identity';
import { defaults } from '../../../src/config/model';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import type { SpawnRequest } from '../../../src/capabilities/spawning/request';
import type { NativeConstructionPlan } from '../../../src/app/remotes/infrastructure/population/model';
vi.mock('../../../src/app/remotes/infrastructure/population/plans',() => ({ createNativeConstructionPlans: vi.fn() }));
vi.mock('../../../src/app/remotes/infrastructure/population/home',() => ({ constructionHome: vi.fn(),constructionBudget: vi.fn() }));
afterEach(() => vi.clearAllMocks());
function fixture() {
  const state = createMemoryPort(() => ({})), owner = remoteConstructionOwner({ home: 'W0N1',room: 'E0N1',generation: 4 });
  const body: SpawnRequest['body'] = ['work','carry','carry','move','move'];
  const request: SpawnRequest = { id: 'queued-builder',name: 'builder',owner,room: 'W0N1',body,priority: 40,readyAt: 1,expiresAt: 100 };
  const settings = { ...defaults,remoteManagementEnabled: true,remoteWorkersEnabled: true,remoteSpawningEnabled: true,constructionEnabled: true,remoteConstructionWorkersEnabled: true };
  const config = vi.fn(() => settings), plan = { owner,body: { parts: body } } as NativeConstructionPlan;
  const snapshot = {} as NonNullable<ReturnType<typeof constructionHome>>;
  vi.mocked(constructionHome).mockReturnValue(snapshot);
  vi.mocked(constructionBudget).mockReturnValue({ storageEnergy: 3000,storageReserve: 0,spawnEnergy: 1300,maximumWorkers: 2,liveWorkers: 0,additionalSlots: 2 });
  const current = { complete: true,plans: [plan],selected: new Set([owner]) }, observe = vi.fn(() => current);
  vi.mocked(createNativeConstructionPlans).mockReturnValue(observe);
  return { state,request,config,settings,current,observe,run: () => admitRemoteConstructionSpawn(state,request,config) };
}
test('final dispatch repeats current generation/site/funding admission after a request was qualified',() => {
  const f = fixture(); expect(f.run()).toBe(true);
  f.current.selected.clear(); expect(f.run()).toBe(false);
  f.current.selected.add(f.request.owner); f.current.plans[0]!.owner = remoteConstructionOwner({ home: 'W0N1',room: 'E0N1',generation: 5 }); expect(f.run()).toBe(false);
});
test('configuration changes, body changes and exhausted workforce slots refuse pending construction',() => {
  const f = fixture(); f.settings.remoteConstructionWorkersEnabled = false; expect(f.run()).toBe(false);
  f.settings.remoteConstructionWorkersEnabled = true; f.request.body = ['move']; expect(f.run()).toBe(false);
  f.request.body = ['work','carry','carry','move','move'];
  vi.mocked(constructionBudget).mockReturnValueOnce({ storageEnergy: 3000,storageReserve: 0,spawnEnergy: 1300,maximumWorkers: 2,liveWorkers: 2,additionalSlots: 2 }); expect(f.run()).toBe(false);
  vi.mocked(constructionBudget).mockReturnValueOnce({ storageEnergy: 3000,storageReserve: 0,spawnEnergy: 1300,maximumWorkers: 2,liveWorkers: 0,additionalSlots: 0 }); expect(f.run()).toBe(false);
});
test('foreign requests are delegated and malformed reserved identities or wrong home cannot pass',() => {
  const f = fixture();
  expect(admitRemoteConstructionSpawn(f.state,{ ...f.request,owner: 'unrelated' },f.config)).toBe(true); expect(f.config).not.toHaveBeenCalled();
  expect(admitRemoteConstructionSpawn(f.state,{ ...f.request,owner: 'remote-construction:invalid' },f.config)).toBe(false);
  expect(admitRemoteConstructionSpawn(f.state,{ ...f.request,room: 'W1N1' },f.config)).toBe(false);
});
test('incomplete optional planning cannot authorize a pending native spawn',() => {
  const f = fixture(); f.current.complete = false; expect(f.run()).toBe(false);
});
