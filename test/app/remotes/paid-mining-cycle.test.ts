import { resumeHomeHaulingWorld } from '../../../src/app/remotes/startup/hauling-state/world/driver';
import { expect,test } from 'vitest';
import { paidMiningCycleFixture } from '../../fixtures/paid-mining-cycle';
import { taskScope } from '../../../src/app/task-runner';
import { createReservations } from '../../../src/persistence/reservations/store';

test('shared task cycle and miner selector sleep, harvest, hand off and resume without an invented full-load loop', () => {
  const f = paidMiningCycleFixture();
  expect(f.step().effects).toEqual([]); expect(f.step().effects).toEqual([]);
  expect(f.step().effects).toMatchObject([{ kind: 'harvest',amount: 2 }]);
  const handoff = f.step(); expect(handoff.effects).toMatchObject([{ kind: 'transfer',source: 'miner-id',target: 'container',amount: 50 }]);
  expect(handoff.deliveries).toEqual([]);
  expect(f.step().effects).toMatchObject([{ kind: 'harvest',amount: 2 }]);
  expect(Object.fromEntries(f.world.snapshot().inventories.map(store => [store.id,store.energy]))).toEqual({ bank: 0,container: 50,'miner-id': 2 });
  expect(f.retire).not.toHaveBeenCalled();
  expect(createReservations(f.shared.state).held(taskScope('miner','mine-task'),14)).toMatchObject([{ holder: 'miner',expiresAt: 16 }]);
});

test('establishment and depleted/critical repairs keep the existing selector precedence', () => {
  const building = paidMiningCycleFixture({ constructionRemaining: 5 }); building.infrastructure({ sink: 'container',site: 'site',repair: { id: 'container',hits: 1,hitsMax: 250000 } });
  building.step(); building.step(); expect(building.step().effects).toMatchObject([{ kind: 'build',amount: 5,progressAdded: 5,completed: true }]); expect(building.build).toHaveBeenCalledOnce(); expect(building.repair).not.toHaveBeenCalled();
  const repairing = paidMiningCycleFixture({ repairHits: 1 }); repairing.infrastructure({ sink: 'container',repair: { id: 'container',hits: 1,hitsMax: 250000 } });
  repairing.step(); repairing.step(); expect(repairing.step().effects).toMatchObject([{ kind: 'repair',amount: 1,repairedHits: 100 }]); expect(repairing.repair).toHaveBeenCalledOnce();
  expect(repairing.world.snapshot().inventories.find(store => store.id === 'miner-id')!.energy).toBe(47);
  expect(repairing.world.checkpoint().inventory.ecology!.structures![0]!.hits).toBe(101);
  // Both selected actions now change the shared material world.
});

test('hold/eligibility prevent work, while current safety refusal releases the miner station claim', () => {
  const held = paidMiningCycleFixture(); held.mode('hold'); for (let i = 0; i < 3; i++) expect(held.step().effects).toEqual([]);
  const denied = paidMiningCycleFixture(); denied.eligible(false); for (let i = 0; i < 3; i++) expect(denied.step().effects).toEqual([]);
  const unsafe = paidMiningCycleFixture(); unsafe.retire.mockReturnValue({ status: 'done' }); unsafe.allow(false); unsafe.step(); unsafe.step(); expect(unsafe.step().effects).toEqual([]);
  expect(unsafe.retire).toHaveBeenCalledWith(unsafe.worker,'W0N1',taskScope('miner','mine-task'));
  expect(createReservations(unsafe.shared.state).held(taskScope('miner','mine-task'),12)).toEqual([]);
  const unclaimed = paidMiningCycleFixture({ withoutClaim: true }); unclaimed.allow(false); unclaimed.step(); unclaimed.step(); unclaimed.step();
  expect(unclaimed.shared.state.read('reservations/empire')).toBeUndefined();
  expect(unsafe.shared.state.read('tasks/miner')).toMatchObject({ data: { queue: [{ kind: 'remote-mine' }] } });
  const approach = paidMiningCycleFixture({ openingRoom: 'W0N1' }); approach.move.mockReturnValue({ status: 'done' }); approach.step(); approach.step(); approach.step();
  expect(approach.shared.state.read('tasks/miner')).toMatchObject({ data: { queue: [{ kind: 'remote-mine' }] } });
  expect(approach.move).toHaveBeenCalledWith(approach.worker,taskScope('miner','mine-task'),approach.plan.station);
});

test('a conflicting work owner blocks mining through the same primary-work slot as the native action adapter', () => {
  const f = paidMiningCycleFixture(); f.step(); f.step();
  expect(f.step([{ kind: 'external',id: 'other-work',run: shared => {
    expect(shared.arbiter.issue('miner',taskScope('miner','mine-task'),['primary-work'],() => 0,code => code === 0).status).toBe('issued');
  } }]).effects).toEqual([]);
});


test('depleted sources unload before waiting, while a full handoff sink does not consume cargo or fail the continuous task', () => {
  const depleted = paidMiningCycleFixture({ sourceEnergy: 0,regenerationIn: 3 }); depleted.step(); depleted.step();
  expect(depleted.step().effects).toMatchObject([{ kind: 'transfer',amount: 48 }]);
  expect(depleted.step().effects).toMatchObject([{ kind: 'harvest',amount: 2 }]);
  const full = paidMiningCycleFixture({ cargo: 50,containerEnergy: 2000 }); full.step(); full.step(); expect(full.step().effects).toEqual([]);
  expect(full.shared.state.read('tasks/miner')).toMatchObject({ data: { queue: [{ id: 'mine-task',retries: 2 }] } });
  expect(full.world.snapshot().inventories.find(store => store.id === 'miner-id')!.energy).toBe(50);
});


test('source work and original control owners resume from a full-store harvest boundary through the same handoff calendar', () => {
  const f = paidMiningCycleFixture(); f.step(); f.step(); f.step();
  const fresh = paidMiningCycleFixture(),checkpoint = JSON.parse(JSON.stringify(f.world.checkpoint()));
  const restored = resumeHomeHaulingWorld(checkpoint,fresh.configure);
  for (let tick = 13; tick <= 20; tick++) {
    const result = restored.step({ tick,operations: [{ kind: 'settle' },{ kind: 'external',id: 'miner',run: fresh.visit }],
      outside: { plans: [],states: [],requestedUnits: [],occupants: [{ unit: 'miner-id',position: f.plan.station }] },settlementOrder: intents => intents.map(intent => intent.id) });
    expect(result).toEqual(f.step());
  }
  expect(restored.checkpoint()).toEqual(f.world.checkpoint());
});


test('physical repair energy, health and task continuation survive JSON resume without courier income', () => {
  const f = paidMiningCycleFixture({ repairHits: 1 }); f.step(); f.step(); const repair = f.step(); expect(repair.deliveries).toEqual([]);
  const fresh = paidMiningCycleFixture({ repairHits: 1 }),checkpoint = JSON.parse(JSON.stringify(f.world.checkpoint()));
  const restored = resumeHomeHaulingWorld(checkpoint,fresh.configure);
  for (let tick = 13; tick <= 16; tick++) {
    expect(restored.step({ tick,operations: [{ kind: 'settle' },{ kind: 'external',id: 'miner',run: fresh.visit }],outside: { plans: [],states: [],requestedUnits: [],occupants: [{ unit: 'miner-id',position: f.plan.station }] },settlementOrder: intents => intents.map(intent => intent.id) })).toEqual(f.step());
  }
  expect(restored.checkpoint()).toEqual(f.world.checkpoint()); expect(f.world.checkpoint().inventory.ecology!.structures![0]!.hits).toBe(501);
});


test('real miner repair saves a container before its due decay and the new countdown resumes exactly', () => {
  const f = paidMiningCycleFixture({ repairHits: 4999,containerDecay: { remaining: 3,interval: 99,amount: 5000 } }); f.step(); f.step();
  expect(f.step().effects).toMatchObject([{ kind: 'repair',amount: 1,repairedHits: 100 }]);
  const cp = JSON.parse(JSON.stringify(f.world.checkpoint())); expect(cp.inventory.ecology.structures[0].hits).toBe(99); expect(cp.inventory.ecology.containers[0].decay.remaining).toBe(99);
  const fresh = paidMiningCycleFixture({ repairHits: 4999,containerDecay: { remaining: 3,interval: 99,amount: 5000 } }),resumed = resumeHomeHaulingWorld(cp,fresh.configure);
  const result = resumed.step({ tick: 13,operations: [{ kind: 'settle' },{ kind: 'external',id: 'miner',run: fresh.visit }],outside: { plans: [],states: [],requestedUnits: [],occupants: [{ unit: 'miner-id',position: f.plan.station }] },settlementOrder: intents => intents.map(intent => intent.id),postprocessOrder: operations => operations.map(operation => operation.key) });
  expect(result).toEqual(f.step()); expect(resumed.checkpoint()).toEqual(f.world.checkpoint());
});
