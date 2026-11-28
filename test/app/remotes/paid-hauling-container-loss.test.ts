import { expect,test } from 'vitest';
import { paidHaulingPhysicalFixture } from '../../fixtures/paid-hauling-physical';
import { resumeHomeHaulingWorld } from '../../../src/app/remotes/startup/hauling-state/world/driver';
import type { HomeHaulingFrame } from '../../../src/app/remotes/startup/hauling-state/world/model';
function frame(tick: number): HomeHaulingFrame { return { tick,operations: [{ kind: 'settle' },{ kind: 'paid',name: 'paid-courier',work: true }],outside: { plans: [],states: [],requestedUnits: [],occupants: [] },settlementOrder: intents => intents.map(intent => intent.id),postprocessOrder: operations => operations.map(operation => operation.key) }; }

test('a destroyed container bank remains absent after home resume; hauling cancels without monetizing its lost capacity', () => {
  const f = paidHaulingPhysicalFixture(1400,input => {
    const position = input.sources[0]!.plan.endpoint.position;
    input.ecology = { sources: [],ground: [],containers: [{ id: 'bank',position,decay: { remaining: 1,interval: 99,amount: 5000 } }],structures: [{ id: 'bank',position,hits: 5000,hitsMax: 250000,repairable: true }],decayDivisor: 1000 };
  });
  f.world.step(frame(100)); expect(f.world.snapshot().inventories.some(store => store.id === 'bank')).toBe(false);
  const checkpoint = JSON.parse(JSON.stringify(f.world.checkpoint())),fresh = paidHaulingPhysicalFixture();
  const restored = resumeHomeHaulingWorld(checkpoint,fresh.configure),result = restored.step(frame(101));
  expect(result).toEqual(f.world.step(frame(101)));
  expect(result.deliveries).toEqual([]); expect(result.visits).toMatchObject([{ outcome: { status: 'failed',reason: 'orphaned-hauling-cargo' } }]);
  expect(restored.snapshot().inventories.find(store => store.id === 'native-id')!.energy).toBe(32);
  expect(restored.checkpoint()).toEqual(f.world.checkpoint());
});
