import { resumeHomeHaulingWorld } from '../../../src/app/remotes/startup/hauling-state/world/driver';
import { expect,test } from 'vitest';
import { paidMiningCycleFixture } from '../../fixtures/paid-mining-cycle';
import { createRemoteAssignmentStore } from '../../../src/features/remotes/assignment-store';
import { createHomeHaulingWorld } from '../../../src/app/remotes/startup/hauling-state/world/driver';
import type { HomeWorldOperation } from '../../../src/app/remotes/startup/hauling-state/world/model';
function frame(operations: HomeWorldOperation[]) {
  return { tick: 10,operations,outside: { plans: [],states: [],requestedUnits: [],occupants: [{ unit: 'miner-id',position: { room: 'E0N1',x: 5,y: 24 } }] },settlementOrder: (intents: readonly { id: string }[]) => intents.map(intent => intent.id) };
}

test('scheduled miners renew from the current lease, then cancel rather than replay opening demand after withdrawal',() => {
  const f = paidMiningCycleFixture();
  f.step([{ kind: 'external',id: 'renew',run: shared => {
    const assignments = createRemoteAssignmentStore(shared.state),current = assignments.read();
    expect(assignments.reconcile({ home: 'W0N1',expectedRevision: current.revision,tick: 10,lifetime: 100,plans: [{ room: 'E0N1',sources: ['source'],reserve: null,infrastructure: null }] }).status).toBe('applied');
  } }]);
  expect(f.shared.state.read('tasks/miner')).toMatchObject({ data: { queue: [{ id: 'mine-task',wakeAt: 12,payload: { token: { expiresAt: 110 } } }] } });
  expect(f.step([{ kind: 'external',id: 'withdraw',run: shared => {
    const assignments = createRemoteAssignmentStore(shared.state);
    assignments.reconcile({ home: 'W0N1',expectedRevision: assignments.read().revision,tick: 11,lifetime: 100,plans: [] });
  } }]).effects).toEqual([]);
  expect(f.shared.state.read('tasks/miner')).toMatchObject({ data: { queue: [] } });
  expect(f.retire).toHaveBeenCalledWith(f.worker,'W0N1','remote-return:miner');
});

test('duplicate, unknown, premature and unconfigured miner visits fail before issuing work',() => {
  for (const operations of [
    [{ kind: 'settle' },{ kind: 'miner',name: 'miner' },{ kind: 'miner',name: 'miner' }],
    [{ kind: 'settle' },{ kind: 'miner',name: 'unknown' }],
    [{ kind: 'miner',name: 'miner' },{ kind: 'settle' }],
  ] as HomeWorldOperation[][]) {
    const f = paidMiningCycleFixture(); expect(() => f.world.step(frame(operations))).toThrow('miner visit');
    expect(f.move).not.toHaveBeenCalled(); expect(f.retire).not.toHaveBeenCalled();
  }
  const f = paidMiningCycleFixture(),world = createHomeHaulingWorld(f.input,shared => {
    const environment = f.configure(shared); delete environment.mining; return environment;
  },{ minimumBatch: 1,requestLifetime: 100 });
  expect(() => world.step(frame([{ kind: 'settle' },{ kind: 'miner',name: 'miner' }]))).toThrow('miner visit');
});

test('missing native profiles and missing banking work refuse instead of supplying template power or skipping bank work',() => {
  const f = paidMiningCycleFixture(); delete f.input.bodies[0]!.harvestPower;
  expect(() => createHomeHaulingWorld(f.input,f.configure,{ minimumBatch: 1,requestLifetime: 100 })).toThrow('WORK profile');
  const banking = paidMiningCycleFixture(); banking.mode('bank'); expect(() => banking.step()).toThrow('banking behavior');
});

test('restored miners cannot switch homes or source-task identity under the captured actor binding',() => {
  const f = paidMiningCycleFixture(); f.step();
  const checkpoint = f.world.checkpoint(),record = checkpoint.state.find(record => record.key === 'tasks/miner')!;
  const data = record.value.data as { queue: { payload: { home: string; token: { id: string } } }[] };
  data.queue[0]!.payload.home = 'W9N9';
  expect(() => resumeHomeHaulingWorld(checkpoint,f.configure)).toThrow('source task binding');
  data.queue[0]!.payload.home = 'W0N1'; data.queue[0]!.payload.token.id = 'other-source-demand';
  expect(() => resumeHomeHaulingWorld(checkpoint,f.configure)).toThrow('source task binding');
});
