import { expect,test,vi } from 'vitest';
import { paidMinerControlFixture } from '../../fixtures/paid-miner-control';
import { createHomeHaulingWorld,resumeHomeHaulingWorld } from '../../../src/app/remotes/startup/hauling-state/world/driver';
import type { HomeHaulingCheckpoint } from '../../../src/app/remotes/startup/hauling-state/world/checkpoint';
import type { HomeHaulingInput,HomeWorldEnvironment,HomeWorldShared,HomeWorldOperation } from '../../../src/app/remotes/startup/hauling-state/world/model';
import { createRemoteMiningTaskBehavior } from '../../../src/app/remotes/mining-task';
import { createTaskRunner,taskScope } from '../../../src/app/task-runner';
import { createRemoteAssignmentStore } from '../../../src/features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../../src/features/remotes/assignment-demand';
import { assignRemoteTask } from '../../../src/app/remotes/assign-task';
import { observePaidHomeControl } from '../../../src/app/remotes/startup/home-observation/control';
import { privateHaulingState } from '../../../src/app/remotes/startup/hauling-state/private-state';
function harness(input: HomeHaulingInput,checkpoint?: HomeHaulingCheckpoint) {
  let shared!: HomeWorldShared,run!: ReturnType<typeof createTaskRunner<{ name: string }>>,definitions!: { 'remote-mine': ReturnType<typeof createRemoteMiningTaskBehavior<{ name: string }>> };
  const service = vi.fn(() => ({ status: 'running' as const })),retire = vi.fn(() => ({ status: 'running' as const }));
  const configure = (ports: HomeWorldShared): HomeWorldEnvironment => {
    shared = ports;
    definitions = { 'remote-mine': createRemoteMiningTaskBehavior(ports.state,{ clock: ports.inventory.tick,unit: unit => unit.name,service,retire }) };
    run = createTaskRunner(ports.state,definitions,ports.inventory.tick);
    return { authority: () => undefined,visible: () => true,endpoint: () => undefined,roomPolicy: () => ({ blockedRooms: [] }),legal: () => true,terrain: () => 2 };
  };
  const world = checkpoint ? resumeHomeHaulingWorld(checkpoint,configure) : createHomeHaulingWorld(input,configure,{ minimumBatch: 1,requestLifetime: 100 });
  let tick = checkpoint?.inventory.nextTick ?? input.observedAt;
  return { world,shared,service,retire,
    step(before: HomeWorldOperation[] = []) {
      const result = world.step({ tick,operations: [{ kind: 'settle' },...before,{ kind: 'external',id: 'miner',run: () => { run('miner',{ name: 'miner' }); } }],
        outside: { plans: [],states: [],requestedUnits: [],occupants: [{ unit: 'miner-id',position: input.sources[0]!.plan.station }] },settlementOrder: () => [] }); tick++; return result;
    },
    renew(updateTask: boolean): HomeWorldOperation {
      return { kind: 'external',id: 'lease-renewal',run: () => {
        const store = createRemoteAssignmentStore(shared.state),state = store.read();
        store.reconcile({ home: input.home,expectedRevision: state.revision,tick,lifetime: 40,plans: [state.assignments.find(item => item.home === input.home)!.plan] });
        if (updateTask) {
          const demand = remoteAssignmentDemands(store.owner('E0N1',tick)!,tick).find(demand => demand.kind === 'mine')!;
          assignRemoteTask(shared.state,definitions,'remote-mine','miner',demand,tick,1493-(tick-10));
        }
      } };
    },
  };
}

test('complete owner snapshots retain outside and expired records without initializing missing native state', () => {
  const empty = privateHaulingState(); expect(observePaidHomeControl(empty,10)).toEqual({ assignments: null,reservations: null }); expect(empty.checkpoint()).toEqual([]);
  const f = paidMinerControlFixture(),before = JSON.stringify(f.state.checkpoint()),h = harness(f.input);
  expect(observePaidHomeControl(h.shared.state,10)).toEqual(f.input.control);
  expect(f.input.control!.reservations!.claims).toHaveLength(2);
  expect(JSON.stringify(f.state.checkpoint())).toBe(before);
});

test('existing miner task runner preserves sleeping state and uses the original task scope when work wakes', () => {
  const f = paidMinerControlFixture(),h = harness(f.input); h.step(); h.step(); expect(h.service).not.toHaveBeenCalled();
  expect(h.shared.state.read('tasks/miner')).toMatchObject({ data: { queue: [{ id: 'mine-task',wakeAt: 12,retries: 2,payload: f.record.payload }] } });
  h.step(); expect(h.service).toHaveBeenCalledWith({ name: 'miner' },expect.objectContaining({ source: 'source',generation: f.demand.generation }),taskScope('miner','mine-task'));
});

test('lease renewal alone cannot extend an issued task token; the actual task-assignment path must update it', () => {
  const f = paidMinerControlFixture(),stale = harness(f.input),renewed = harness(f.input);
  for (let tick = 10; tick <= 30; tick++) {
    stale.step(tick === 13 ? [stale.renew(false)] : []);
    renewed.step(tick === 13 ? [renewed.renew(true)] : []);
  }
  expect(stale.retire).toHaveBeenCalledWith({ name: 'miner' },'W0N1',taskScope('miner','mine-task'));
  expect(renewed.retire).not.toHaveBeenCalled();
  expect(renewed.service).toHaveBeenLastCalledWith({ name: 'miner' },expect.objectContaining({ expiresAt: 53 }),taskScope('miner','mine-task'));
  expect(renewed.shared.state.read('tasks/miner')).toMatchObject({ data: { queue: [{ id: 'mine-task',payload: { token: { expiresAt: 53 } } }] } });
  expect(f.record.payload.token.expiresAt).toBe(30);
});

test('current miner tasks and renewed owners resume without reverting to the opening token or claims', () => {
  const f = paidMinerControlFixture(),h = harness(f.input); for (let tick = 10; tick < 15; tick++) h.step(tick === 13 ? [h.renew(true)] : []);
  const checkpoint = JSON.parse(JSON.stringify(h.world.checkpoint())),resumed = harness(f.input,checkpoint);
  expect(resumed.shared.state.read('tasks/miner')).toEqual(h.shared.state.read('tasks/miner'));
  for (let tick = 15; tick <= 31; tick++) expect(resumed.step()).toEqual(h.step());
  expect(resumed.world.checkpoint()).toEqual(h.world.checkpoint()); expect(resumed.retire).not.toHaveBeenCalled();
});

test('missing restored owner/task state and inconsistent original station ownership refuse', () => {
  const f = paidMinerControlFixture(),h = harness(f.input),cp = () => JSON.parse(JSON.stringify(h.world.checkpoint())) as HomeHaulingCheckpoint;
  const missing = cp(); missing.state = missing.state.filter(record => record.key !== 'remotes/assignments'); expect(() => harness(f.input,missing)).toThrow('control owner');
  const tasks = cp(); tasks.state = tasks.state.filter(record => record.key !== 'tasks/miner'); expect(() => harness(f.input,tasks)).toThrow('miner task');
  const future = paidMinerControlFixture(); future.input.control!.assignments!.clock = 11; expect(() => harness(future.input)).toThrow('clock/revision');
  const changed = paidMinerControlFixture(); changed.input.sources[0]!.demand.generation++; expect(() => harness(changed.input)).toThrow('authority mismatch');
  const wrong = paidMinerControlFixture(); wrong.input.sources[0]!.miners[0]!.observation.assigned = false; expect(() => harness(wrong.input)).toThrow('station owner mismatch');
});
