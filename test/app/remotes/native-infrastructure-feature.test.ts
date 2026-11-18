import { afterEach, expect, test, vi } from 'vitest';
import { createNativeRemoteInfrastructureFeature } from '../../../src/app/remotes/infrastructure/feature';
import { createConstructionReservationLedger } from '../../../src/features/construction/reservation-ledger';
import { createRemoteAssignmentStore } from '../../../src/features/remotes/assignment-store';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { createRuntime } from '../../../src/app/runtime';
import { createNativeRemoteInfrastructure } from '../../../src/app/remotes/infrastructure/native';
import type { ConfigInput } from '../../../src/config/model';
vi.mock('../../../src/app/remotes/infrastructure/native',() => ({ createNativeRemoteInfrastructure: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
function runtime(state: Parameters<typeof createNativeRemoteInfrastructureFeature>[0], config: ConfigInput) {
  return createRuntime([createNativeRemoteInfrastructureFeature(state,createConstructionReservationLedger())],{
    observations: { visibleRooms: () => ['W0N1'],observeRoom: name => ({ name,owned: true,units: [],structures: [] }) },
    config: () => config,clock: () => ({ tick: 1,tickLimit: 100,bucket: 10000 }),usedCpu: () => 0,reportFailure: vi.fn(),
  });
}
function setup() {
  const state = createMemoryPort(() => root), root = {};
  createRemoteAssignmentStore(state).reconcile({ home: 'W0N1',tick: 1,lifetime: 200,expectedRevision: 0,
    plans: ['E0N1','E1N1'].map(room => ({ room,sources: ['source:'+room],reserve: null,infrastructure: { roads: false,containers: true } })) });
  vi.stubGlobal('Game',{ time: 1,rooms: { W0N1: { controller: { my: true } } },cpu: { getUsed: () => 0,tickLimit: 100 } });
  const plan = vi.fn(), run = vi.fn().mockReturnValue([]);
  vi.mocked(createNativeRemoteInfrastructure).mockReturnValue({ plan,run } as unknown as ReturnType<typeof createNativeRemoteInfrastructure>);
  const config = { empire: { remoteManagementEnabled: true,constructionEnabled: true,remoteScanRooms: 2,
    constructionEntries: 4,constructionAttempts: 2 } };
  return { state,plan,run,config };
}
test('disabled infrastructure performs no native or persistent reads',() => {
  const state = { read: vi.fn(),write: vi.fn() };
  expect(runtime(state,{}).tick().failures).toEqual([]);
  expect(state.read).not.toHaveBeenCalled(); expect(createNativeRemoteInfrastructure).not.toHaveBeenCalled();
});
test('one home shares remaining construction attempts across all outpost leases',() => {
  const { state,run,config } = setup();
  run.mockReturnValue([{ room: 'E0N1',result: { decisions: [{},{}],attempts: 1 } }]);
  expect(runtime(state,config).tick().failures).toEqual([]);
  expect(run.mock.calls.map(call => call[2])).toEqual([
    { rooms: 8,entries: 4,attempts: 2 },{ rooms: 7,entries: 2,attempts: 1 },
  ]);
});
test('bounded lease rotation survives feature reconstruction and stops exhausted attempts',() => {
  const { state,plan,run,config } = setup();
  run.mockReturnValue([{ room: 'E0N1',result: { decisions: [{}],attempts: 2 } }]);
  expect(runtime(state,config).tick().failures).toEqual([]);
  expect(plan.mock.calls.map(call => call[1].room)).toEqual(['E0N1']);
  expect(runtime(state,config).tick().failures).toEqual([]);
  expect(plan.mock.calls.map(call => call[1].room)).toEqual(['E0N1','E1N1']);
});
test('revoked infrastructure flags prevent retained leases from issuing construction work',() => {
  const { state,plan,config } = setup();
  expect(runtime(state,{ empire: { ...config.empire,remoteContainersEnabled: false,remoteRoadsEnabled: true } }).tick().failures).toEqual([]);
  expect(plan).not.toHaveBeenCalled();
});
