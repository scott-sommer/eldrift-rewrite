import { expect,test } from 'vitest';
import { paidHaulingPhysicalFixture } from '../../fixtures/paid-hauling-physical';
import { enableHomeExpiry } from '../../fixtures/home-expiry';
import { paidMiningCycleFixture } from '../../fixtures/paid-mining-cycle';
import { homeExpiryMaintenanceFixture } from '../../fixtures/home-expiry-maintenance';
import { createHomeHaulingWorld,resumeHomeHaulingWorld } from '../../../src/app/remotes/startup/hauling-state/world/driver';
const order = (operations: readonly { key: string }[]) => operations.map(operation => operation.key);
const after = (tick: number) => ({ tick,operations: [{ kind: 'settle' as const }],outside: { plans: [],states: [],requestedUnits: [],occupants: [] },settlementOrder: (intents: readonly { id: string }[]) => intents.map(intent => intent.id),postprocessOrder: order });
function courier(life: number) { return paidHaulingPhysicalFixture(1400,input => { input.workers[0]!.ticksToLive = life; enableHomeExpiry(input); }); }

test('the final alive-tick delivery settles after death before native archival, and JSON resume does not lose or repeat it',() => {
  const f = courier(5); for (let tick = 100; tick <= 104; tick++) f.step();
  const cp = JSON.parse(JSON.stringify(f.world.checkpoint())); expect(cp.bodies).toEqual([]); expect(cp.movement.routes).toEqual([]); expect(cp.movement.expected).toEqual([]);
  const fresh = courier(5),resumed = resumeHomeHaulingWorld(cp,fresh.configure);
  const result = f.world.step(after(105)); expect(resumed.step(after(105))).toEqual(result);
  expect(result.deliveries).toMatchObject([{ energy: 32,tick: 105 }]); expect(result.lifecycle!.retired).toEqual([{ name: 'paid-courier',id: 'native-id' }]);
  expect(f.shared.state.read('tasks/paid-courier')).toMatchObject({ data: { queue: [] } });
  expect(f.shared.state.read('logistics-retired/empire')).toMatchObject({ data: { entries: [{ unit: 'native-id',journal: { acknowledged: true,result: { status: 'observed',amount: 32 } } }] } });
  expect(f.world.step(after(106)).deliveries).toEqual([]); expect(resumed.step(after(106)).deliveries).toEqual([]);
  expect(resumed.checkpoint()).toEqual(f.world.checkpoint()); expect(f.world.snapshot().inventories.find(store => store.id === 'bank')!.energy).toBe(32);
});

test('expiry uses the accepted final transit pose and retains corpse cargo without treating it as income',() => {
  const f = courier(1),last = f.step(),cp = f.world.checkpoint();
  expect(cp.inventory.ecology!.tombstones![0]).toMatchObject({ energy: 32,position: last.transit.states[0]!.position });
  expect(cp.inventory.ecology!.tombstones![0]!.position).not.toEqual(last.openings[0]!.observed.position);
  expect(f.world.step(after(101)).deliveries).toEqual([]); expect(f.world.snapshot().inventories.find(store => store.id === 'bank')!.energy).toBe(0);
  const bad = structuredClone(cp); bad.inventory.ecology!.bodies![0]!.salvageEnergy = 1;
  expect(() => resumeHomeHaulingWorld(bad,f.configure)).toThrow('lifetime metadata');
});

test('a miner expires after its final harvest/handoff opportunity and native maintenance releases its station owner',() => {
  const f = paidMiningCycleFixture(); f.input.workers[0]!.ticksToLive = 3; enableHomeExpiry(f.input);
  const world = createHomeHaulingWorld(f.input,f.configure,{ minimumBatch: 1,requestLifetime: 100 });
  for (let tick = 10; tick <= 12; tick++) world.step({ ...after(tick),operations: [{ kind: 'settle' },{ kind: 'miner',name: 'miner' }],outside: { plans: [],states: [],requestedUnits: [],occupants: [{ unit: 'miner-id',position: f.plan.station }] } });
  const cp = world.checkpoint(); expect(cp.bodies).toEqual([]); expect(cp.inventory.stores.find(store => store.id === 'container')!.energy).toBe(50);
  expect(world.step(after(13)).deliveries).toEqual([]);
  const state = world.checkpoint().state;
  expect(state.find(record => record.key === 'tasks/miner')!.value.data).toMatchObject({ queue: [] });
  expect((state.find(record => record.key === 'reservations/empire')!.value.data as { claims: unknown[] }).claims).toEqual([]);
  expect(() => world.step({ ...after(14),operations: [{ kind: 'settle' },{ kind: 'miner',name: 'miner' }] })).toThrow('miner visit');
});

test('the native20-retirement cap pauses owned work, preserves independent work, and resumes its pending roster exactly',() => {
  const f = homeExpiryMaintenanceFixture(); f.world.step(f.frame(100));
  const paused = f.world.step(f.frame(101)); expect(paused.lifecycle).toMatchObject({ admitted: false }); expect(paused.lifecycle!.retired).toHaveLength(20);
  expect(f.owned).toHaveBeenCalledTimes(1); expect(f.independent).toHaveBeenCalledTimes(2);
  const fresh = homeExpiryMaintenanceFixture(),resumed = resumeHomeHaulingWorld(JSON.parse(JSON.stringify(f.world.checkpoint())),fresh.configure);
  const completed = f.world.step(f.frame(102)); expect(resumed.step(fresh.frame(102))).toEqual(completed);
  expect(completed.lifecycle).toMatchObject({ admitted: true }); expect(completed.lifecycle!.retired).toHaveLength(1);
  expect(f.owned).toHaveBeenCalledTimes(2); expect(resumed.checkpoint()).toEqual(f.world.checkpoint());
});

test('invisible postmortem transfer evidence is archived as uncertain rather than confirmed from physical bank stock',() => {
  const f = courier(5); let visible = true;
  const world = createHomeHaulingWorld(f.world.checkpoint().input,shared => ({ ...f.configure(shared),visible: () => visible }),{ minimumBatch: 1,requestLifetime: 100 });
  for (let tick = 100; tick <= 104; tick++) world.step({ ...after(tick),operations: [{ kind: 'settle' },{ kind: 'paid',name: 'paid-courier',work: true }] });
  visible = false; expect(world.step(after(105)).deliveries).toEqual([]);
  expect(world.snapshot().inventories.find(store => store.id === 'bank')!.energy).toBe(32);
  const archive = world.checkpoint().state.find(record => record.key === 'logistics-retired/empire')!.value.data;
  expect(archive).toMatchObject({ entries: [{ unit: 'native-id',incidents: { entries: [{ attempt: { amount: 32 },cargo: null }] } }] });
});
