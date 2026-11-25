import { afterEach, expect, test, vi } from 'vitest';
import { createNativeHouseholdProposal } from '../../../src/app/remotes/startup/household/proposal';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { startupHouseholdProject } from '../../fixtures/startup-household-project';
import { householdTravelPlan } from '../../fixtures/household-travel';
const controls = vi.hoisted(() => ({ energy: 300 }));
vi.mock('../../../src/app/remotes/startup/energy',() => ({ observeNativeStartupEnergy: () => ({ status: 'observed',policy: 'explicit-test',initialEnergy: controls.energy,capacity: 300,layout: {
  structures: [{ id: 'spawn',kind: 'spawn',energy: controls.energy,capacity: 300 }],orders: [{ spawn: 'spawn',structures: ['spawn'] }],
} }) }));
vi.mock('../../../src/app/remotes/startup/household/travel',() => ({ createNativeHouseholdTravel: () => (plan: object) => ({ status: 'complete',plan,identity: 'measured',source: { availableEnergy: 700 },legs: ['approach','loaded','return'].map(kind => ({ kind,ticks: 2 })) }) }));
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  controls.energy = 300; vi.stubGlobal('Game',{ time: 5 });
  const input = startupHouseholdProject(); delete input.household; const spawning = input.project.spawning;
  const plan = householdTravelPlan(); spawning.room = plan.home; spawning.requests = spawning.requests.filter(request => request.id !== 'household').map(request => ({ ...request,room: plan.home }));
  spawning.spawns = [{ id: 'spawn',room: plan.home,availableAt: 0 }];
  const request = { id: 'home',name: 'home',owner: 'home',room: plan.home,body: [...plan.body],priority: -1,readyAt: 0,expiresAt: 101,placement: { spawn: 'spawn',exit: { ...plan.spawn.exit } } };
  const proposal = { observedAt: 5,plan,request,trips: 4,energy: 100 }, root = {};
  return { input,proposal,root,build: createNativeHouseholdProposal(createMemoryPort(() => root),4000) };
}
test('native proposal uses paid activation plus measured legs and addressed trips without changing input/state',() => {
  const f = fixture(), before = JSON.stringify(f.input), result = f.build(f.input,f.proposal);
  expect(result).toMatchObject({ status: 'ready',observedAt: 5,energyPolicy: 'explicit-test',previewFrames: 1 });
  if (result.status !== 'ready') throw new Error('Expected proposal');
  const active = f.proposal.request.body.length*3;
  expect(result.input.household!.redistribution.trips.map(trip => [trip.pickupAt,trip.destination])).toEqual([0,1,2,3].map(index => [active+2+index*6,'spawn']));
  expect(result.input.project.spawning.funding.energyLayout).toBeDefined(); expect(JSON.stringify(f.input)).toBe(before); expect(f.root).toEqual({});
});
test('stale observations, competing refill owners and an unpaid initial household birth defer',() => {
  const f = fixture(); f.proposal.observedAt = 4; expect(f.build(f.input,f.proposal)).toMatchObject({ status: 'deferred',reason: 'observation' });
  f.proposal.observedAt = 5; controls.energy = 0; expect(f.build(f.input,f.proposal)).toMatchObject({ status: 'deferred',reason: 'initial-household-birth' });
  f.input.project.spawning.funding.refills = [{ id: 'other',energy: 50,firstTick: 1,interval: null,occurrences: 1 }]; expect(f.build(f.input,f.proposal)).toMatchObject({ status: 'deferred',reason: 'refill-owner' });
});
test('guard refusal and a route/body mismatch cannot create a proposal',() => {
  const f = fixture(); expect(f.build(f.input,f.proposal,() => false)).toMatchObject({ status: 'deferred',reason: 'admission' });
  f.proposal.request.body = ['move']; expect(() => f.build(f.input,f.proposal)).toThrow('route mismatch');
});
