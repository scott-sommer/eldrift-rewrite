import { expect,test } from 'vitest';
import { paidHaulingPhysicalFixture } from '../../fixtures/paid-hauling-physical';
import { paidHaulingStateFixture } from '../../fixtures/paid-hauling-state';
import { createPaidHaulingForecastState } from '../../../src/app/remotes/startup/hauling-state/seed';
import { homeWorldReceiptCollector } from '../../../src/app/remotes/startup/hauling-state/world/receipts';
import type { HomeHaulingInput } from '../../../src/app/remotes/startup/hauling-state/world/model';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
const position = { room: 'W0N1',x: 13,y: 25 };
function resident(input: HomeHaulingInput): void {
  input.workers.push({ name: 'resident',owner: 'household',position,spawning: false,ticksToLive: 100,energy: 0,usedCapacity: 0,fatigue: 0,
    body: [{ type: 'move',hits: 100,boost: null }] });
  input.bodies.push({ name: 'resident',unit: 'outside-id',inventory: { id: 'outside-id',room: 'W0N1',active: true,
    capacityPool: logisticsPool('capacity','outside-id'),energy: 0,usedCapacity: 0,capacity: 0,freeEnergyCapacity: 0 } });
}

test('known outside bodies cannot disappear from traffic or teleport between frames', () => {
  const missing = paidHaulingPhysicalFixture(1400,resident);
  expect(() => missing.step()).toThrow('Missing or changed outside world body');
  const present = paidHaulingPhysicalFixture(1400,resident);
  const outside = { plans: [],states: [],requestedUnits: [],occupants: [{ unit: 'outside-id',position }] };
  expect(present.step(undefined,outside).transit.states[0]!.position.x).toBe(14);
  outside.occupants[0]!.position = { ...position,x: 12 };
  expect(() => present.step(undefined,outside)).toThrow('Missing or changed outside world body');
});

test('unmodelled body expiry rejects the horizon instead of retaining a dead traffic obstacle', () => {
  const f = paidHaulingPhysicalFixture(1400,input => { input.workers[0]!.ticksToLive = 1; });
  f.step(); expect(() => f.step()).toThrow('lifecycle transition required');
});

test('already reflected opening deliveries are not emitted again as future income', () => {
  const f = paidHaulingStateFixture();
  const seed = createPaidHaulingForecastState('W0N1',11,[f.courier],f.claims);
  const receipts = homeWorldReceiptCollector(seed);
  expect(receipts.capture()).toEqual([]);
  expect(receipts.confirmed([],11)).toEqual([]);
});

test('an invalid actor schedule cannot expose a usable partial forecast', () => {
  const f = paidHaulingPhysicalFixture();
  expect(() => f.step([{ kind: 'paid',name: 'paid-courier',work: true },{ kind: 'settle' }])).toThrow('Invalid world paid visit');
  expect(() => f.world.snapshot()).toThrow('Cannot resume failed home world');
});
