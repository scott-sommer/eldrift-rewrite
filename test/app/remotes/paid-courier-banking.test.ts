import { remoteTransportTasks } from '../../../src/app/remotes/transport-tasks';
import { haulingDefinitions } from '../../../src/app/remotes/startup/hauling-state/opening';
import { expect,test } from 'vitest';
import { paidCourierBankingFixture } from '../../fixtures/paid-courier-banking';
import { resumeHomeHaulingWorld } from '../../../src/app/remotes/startup/hauling-state/world/driver';

test('scheduled courier control banks cargo after productive cutoff with exact JSON continuation',() => {
  const f = paidCourierBankingFixture();
  const first = f.frame(100);
  f.world.step({ ...first,operations: [first.operations[0]!,{ kind: 'external',id: 'cancel-original',run: shared => {
    const tasks = remoteTransportTasks(shared.state,haulingDefinitions,'W0N1'),head = tasks.head('paid-courier');
    if (head) tasks.cancel('paid-courier',head);
  } },...first.operations.slice(1)] });
  for (let tick = 101; tick <= 102; tick++) f.world.step(f.frame(tick));
  const fresh = paidCourierBankingFixture(),resumed = resumeHomeHaulingWorld(JSON.parse(JSON.stringify(f.world.checkpoint())),fresh.configure);
  const receipts = [];
  for (let tick = 103; tick <= 110; tick++) {
    const frame = f.frame(tick),other = fresh.frame(tick);
    if (tick === 103) for (const value of [frame,other]) value.operations = value.operations.map(operation => operation.kind === 'paid' ? { ...operation,work: false } : operation);
    const result = f.world.step(frame); expect(resumed.step(other)).toEqual(result); receipts.push(...result.deliveries);
  }
  expect(receipts).toMatchObject([{ energy: 32 }]); expect(receipts).toHaveLength(1);
  expect(f.world.snapshot().inventories.find(store => store.id === 'bank')!.energy).toBe(32);
  expect(f.world.snapshot().inventories.find(store => store.id === 'native-id')!.energy).toBe(0);
  expect(resumed.checkpoint()).toEqual(f.world.checkpoint());
});

test('partial courier banking selects an actual alternate sink and recovery path without collecting another productive batch',() => {
  const f = paidCourierBankingFixture(16),receipts = [];
  for (let tick = 100; tick <= 113; tick++) receipts.push(...f.world.step(f.frame(tick)).deliveries);
  expect(receipts.map(receipt => receipt.energy)).toEqual([16,16]);
  const stores = f.world.snapshot().inventories;
  expect(Object.fromEntries(stores.map(store => [store.id,store.energy]))).toMatchObject({ bank: 16,spare: 16,'native-id': 0,container: 100 });
  expect(f.shared.state.read('tasks/paid-courier')).toMatchObject({ data: { queue: [] } });
  expect(f.shared.quantities.list(114)).toEqual([]);
});

test('a final recovery deposit confirms after natural expiry, prunes the recovery route and archives once',() => {
  const f = paidCourierBankingFixture(100,6);
  for (let tick = 100; tick <= 105; tick++) f.world.step(f.frame(tick));
  const checkpoint = JSON.parse(JSON.stringify(f.world.checkpoint()));
  expect(checkpoint.movement.routes).toEqual([]); expect(checkpoint.movement.retirements).toBeUndefined();
  const fresh = paidCourierBankingFixture(100,6),resumed = resumeHomeHaulingWorld(checkpoint,fresh.configure);
  const confirmed = f.world.step(f.frame(106)); expect(resumed.step(fresh.frame(106))).toEqual(confirmed);
  expect(confirmed.deliveries).toMatchObject([{ energy: 32 }]); expect(confirmed.deliveries).toHaveLength(1);
  expect(f.shared.state.read('logistics-retired/empire')).toMatchObject({ data: { entries: [{ unit: 'native-id',journal: { acknowledged: true,result: { status: 'observed',amount: 32 } } }] } });
  expect(f.world.step(f.frame(107)).deliveries).toEqual([]); expect(resumed.step(fresh.frame(107)).deliveries).toEqual([]);
  expect(resumed.checkpoint()).toEqual(f.world.checkpoint());
});
