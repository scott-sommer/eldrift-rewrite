import { expect,test } from 'vitest';
import { paidHaulingPhysicalFixture } from '../../fixtures/paid-hauling-physical';
import type { HomeHaulingInput,HomeWorldShared } from '../../../src/app/remotes/startup/hauling-state/world/model';
import { resumeHomeHaulingWorld } from '../../../src/app/remotes/startup/hauling-state/world/driver';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
const position = { room: 'W0N1',x: 12,y: 24 };
function miner(input: HomeHaulingInput): void {
  input.workers.push({ name: 'miner',owner: 'mine-owner',position,spawning: false,ticksToLive: 1000,energy: 48,usedCapacity: 48,fatigue: 0,
    body: [...Array.from({ length: 4 },() => ({ type: 'work' as const,hits: 100,boost: null })),{ type: 'carry',hits: 100,boost: null }] });
  input.bodies.push({ name: 'miner',unit: 'miner-id',inventory: { id: 'miner-id',room: 'W0N1',active: true,capacityPool: logisticsPool('capacity','miner-id'),energy: 48,usedCapacity: 48,capacity: 50,freeEnergyCapacity: 2 } });
  input.ecology = { sources: [{ id: 'source',position: { ...position,y: 23 },energy: 100,capacity: 3000,regenerationIn: null,regenerationTicks: 300 }],ground: [],containers: [{ id: 'container',position }],decayDivisor: 1000 };
}
const outside = { plans: [],states: [],requestedUnits: [],occupants: [{ unit: 'miner-id',position }] };
function harvest(shared: HomeWorldShared): void {
  expect(shared.inventory.source('source')!.energy).toBe(100);
  const intent = shared.arbiter.issue('miner','mine-owner',['harvest'],() => {
    shared.inventory.queue({ id: 'harvest-100',kind: 'harvest',source: 'source',target: 'miner-id',amount: 8,position,container: 'container' }); return 0;
  },code => code === 0);
  expect(intent.status).toBe('issued');
}

test('explicit miner work shares the actual courier inventory and survives home checkpoint/resume', () => {
  const f = paidHaulingPhysicalFixture(1400,miner);
  const result = f.step([{ kind: 'settle' },{ kind: 'external',id: 'miner',run: harvest },{ kind: 'paid',name: 'paid-courier',work: true }],outside);
  expect(result.effects).toMatchObject([{ kind: 'harvest',amount: 8,carriedEnergy: 2,containerEnergy: 6,droppedEnergy: 0 }]);
  expect(Object.fromEntries(f.world.snapshot().inventories.map(store => [store.id,store.energy]))).toMatchObject({ 'miner-id': 50,container: 106 });
  const checkpoint = JSON.parse(JSON.stringify(f.world.checkpoint()));
  const restored = resumeHomeHaulingWorld(checkpoint,f.configure);
  expect(restored.step({ tick: 101,operations: [{ kind: 'settle' }],outside,settlementOrder: () => [] })).toEqual(f.step([{ kind: 'settle' }],outside));
  expect(restored.checkpoint()).toEqual(f.world.checkpoint());
});

test('harvesting cannot claim a different body tile to capture overflow in a remote container', () => {
  const f = paidHaulingPhysicalFixture(1400,miner);
  expect(() => f.step([{ kind: 'settle' },{ kind: 'external',id: 'false-pose',run: shared => {
    shared.inventory.queue({ id: 'false',kind: 'harvest',source: 'source',target: 'miner-id',amount: 8,position: { ...position,x: 13 },container: 'container' });
  } }],outside)).toThrow('body pose mismatch');
});
