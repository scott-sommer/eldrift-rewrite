import { afterEach, expect, test, vi } from 'vitest';
import { createNativeRemoteMiningCycle } from '../../../src/app/remotes/native-mining-cycle';
import { assignRemoteTask } from '../../../src/app/remotes/assign-task';
import { remoteAssignmentDemands } from '../../../src/features/remotes/assignment-demand';
import { peekState } from '../../../src/persistence/versioned-state';
import { taskSchema } from '../../../src/persistence/tasks/schema';
import { managementFixture } from '../../fixtures/remote-management';
import type { createNativeDispatch } from '../../../src/app/native-dispatch';
const service = vi.hoisted(() => ({ clock: () => 20,unit: (creep: Creep) => creep.name,service: vi.fn(),retire: vi.fn(() => ({ status: 'running' as const })) }));
vi.mock('../../../src/app/remotes/native-mining-service',() => ({ createNativeRemoteMiningService: () => service }));
vi.mock('../../../src/app/remotes/native-banking',() => ({ createNativeRemoteBanking: () => ({ definitions: {},prepare: () => 'service' }) }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
test('explicit withdrawal cancels a live remote mining task and retires without resuming its still-valid lease', () => {
  const f = managementFixture(); f.manager().advance(f.request,{ rooms: 1,sources: 2 },() => true);
  const demand = remoteAssignmentDemands(f.assignments.owner('E0N1',20)!,20).find(item => item.kind === 'mine')!;
  const creep = { id: 'actor',name: 'actor',my: true,spawning: false,ticksToLive: 100,memory: { population: { home: 'W0N1',owner: 'miner' } },store: { getUsedCapacity: () => 0 } } as Creep;
  vi.stubGlobal('Game',{ time: 20 });
  const cycle = createNativeRemoteMiningCycle(f.state,{} as ReturnType<typeof createNativeDispatch>,{ home: 'W0N1',owner: 'miner' },
    { maximumRooms: 8,guard: () => true,policy: () => f.request.policy.traversal });
  assignRemoteTask(f.state,cycle.definitions,'remote-mine',creep.name,demand,20,100);
  cycle.run(creep);
  expect(service.service).not.toHaveBeenCalled(); expect(service.retire).toHaveBeenCalledOnce();
  expect(peekState(f.state,'tasks/actor',taskSchema('actor',cycle.definitions))?.queue).toEqual([]);
  expect(f.assignments.resolve(demand,20)).toBeDefined();
});
