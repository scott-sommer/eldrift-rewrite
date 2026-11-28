import { expect,test } from 'vitest';
import { resumeHomeHaulingWorld } from '../../../src/app/remotes/startup/hauling-state/world/driver';
import { paidMiningCycleFixture } from '../../fixtures/paid-mining-cycle';
const outside = (position: { room: string; x: number; y: number }) => ({ plans: [],states: [],requestedUnits: [],occupants: [{ unit: 'miner-id',position }] });

test('actual mining cycle completes infrastructure, switches to harvest/handoff, and resumes after birth',() => {
  const f = paidMiningCycleFixture({ constructionRemaining: 5 }); f.step(); f.step();
  const built = f.step(); expect(built.effects).toMatchObject([{ kind: 'build',amount: 5,progressAdded: 5,completed: true }]); expect(built.deliveries).toEqual([]);
  const checkpoint = JSON.parse(JSON.stringify(f.world.checkpoint()));
  const fresh = paidMiningCycleFixture({ constructionRemaining: 5 }),resumed = resumeHomeHaulingWorld(checkpoint,fresh.configure);
  for (let tick = 13; tick <= 18; tick++) {
    expect(resumed.step({ tick,operations: [{ kind: 'settle' },{ kind: 'external',id: 'miner',run: fresh.visit }],outside: outside(f.plan.station),settlementOrder: intents => intents.map(intent => intent.id),postprocessOrder: operations => operations.map(operation => operation.key) })).toEqual(f.step());
  }
  expect(resumed.checkpoint()).toEqual(f.world.checkpoint());
  // One harvest overflow is automatically captured before the 50-energy handoff.
  expect(f.world.snapshot().inventories.find(store => store.id === 'forecast:site:container')!.energy).toBe(51);
});

test('home restore refuses changed birth recipes and undeclared or missing constructed objects',() => {
  const f = paidMiningCycleFixture({ constructionRemaining: 5 }); f.step(); f.step(); f.step();
  const checkpoint = f.world.checkpoint(),fresh = paidMiningCycleFixture({ constructionRemaining: 5 });
  const tampered = structuredClone(checkpoint); tampered.inventory.ecology!.sites![0]!.completion!.store.capacity = 3000;
  expect(() => resumeHomeHaulingWorld(tampered,fresh.configure)).toThrow('construction metadata');
  const missing = structuredClone(checkpoint); missing.inventory.stores = missing.inventory.stores.filter(store => store.id !== 'forecast:site:container');
  expect(() => resumeHomeHaulingWorld(missing,fresh.configure)).toThrow('roster');
});

test('a partially built site resumes through completion under the same task owner',() => {
  const f = paidMiningCycleFixture({ constructionRemaining: 10 }); f.step(); f.step();
  expect(f.step().effects).toMatchObject([{ kind: 'build',amount: 5,completed: false }]);
  const fresh = paidMiningCycleFixture({ constructionRemaining: 10 }),resumed = resumeHomeHaulingWorld(JSON.parse(JSON.stringify(f.world.checkpoint())),fresh.configure);
  const completion = resumed.step({ tick: 13,operations: [{ kind: 'settle' },{ kind: 'external',id: 'miner',run: fresh.visit }],outside: outside(f.plan.station),settlementOrder: intents => intents.map(intent => intent.id),postprocessOrder: operations => operations.map(operation => operation.key) });
  expect(completion).toEqual(f.step()); expect(completion.effects).toMatchObject([{ kind: 'build',amount: 5,completed: true }]);
  expect(resumed.checkpoint()).toEqual(f.world.checkpoint());
});
