import { expect, test, vi } from 'vitest';
import { planExploration } from '../../src/features/intel/exploration-plan';
import type { ExplorationPlanRequest } from '../../src/features/intel/exploration-plan';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createIntelStore } from '../../src/features/intel/store';
import { intelSummary } from '../fixtures/intel-summary';
function setup() {
  const memory = {}, state = createMemoryPort(() => memory), store = createIntelStore(state);
  const rooms: Record<string,string[]> = { E0S0: ['E1S0','E0S1'], E1S0: ['E1S1'], E0S1: ['E1S1'], E1S1: [] };
  const ports = { intel: vi.fn((room: string) => store.peek(room, 20).record), status: () => 'normal' as const,
    exits: vi.fn((room: string) => rooms[room]) };
  const request: ExplorationPlanRequest = { home: 'E0S0', tick: 20, assigned: [], maximumTargets: 8,
    budget: { depth: 2, rooms: 16, reads: 16 }, policy: { mode: 'exploration', username: 'bot', allies: [],
      blockedRooms: [], avoidUntil: {}, allowKeeper: false, maximumAge: 2, maximumRooms: 16,
      unknownCost: 8, staleCost: 4, keeperCost: 25 } };
  const observe = (room: string, tick: number) => store.observeSummary({ ...intelSummary(tick,room), units: [], structures: [] });
  return { memory, store, ports, request, observe };
}

test('unknown then stale targets use real crossing distances and fresh observer intel suppresses demand', () => {
  const fixture = setup();
  fixture.observe('E0S1',20); fixture.observe('E1S0',10);
  const plan = planExploration(fixture.request,fixture.ports);
  expect(plan.targets.map(target => [target.room,target.reason,target.depth])).toEqual([['E1S1','unknown',2],['E1S0','stale',1]]);
  expect(plan.targets[0]!.route).toEqual(['E0S0','E0S1','E1S1']);
  expect(fixture.ports.intel).toHaveBeenCalledTimes(3);
  fixture.observe('E1S1',20); fixture.observe('E1S0',20);
  expect(planExploration(fixture.request,fixture.ports).targets).toEqual([]);
});

test('assigned targets and explicit target cap prevent duplicate demand without hiding incomplete exploration', () => {
  const fixture = setup(); fixture.request.assigned = ['E0S1']; fixture.request.maximumTargets = 1;
  expect(planExploration(fixture.request,fixture.ports).targets.map(target => target.room)).toEqual(['E1S0']);
  fixture.request.policy.maximumRooms = 1;
  expect(planExploration(fixture.request,fixture.ports)).toMatchObject({ incomplete: 'room-budget' });
  fixture.request.maximumTargets = 0; fixture.ports.exits.mockClear(); fixture.ports.intel.mockClear();
  expect(planExploration(fixture.request,fixture.ports)).toMatchObject({ targets: [], paused: true, reads: 0 });
  expect(fixture.ports.exits).not.toHaveBeenCalled(); expect(fixture.ports.intel).not.toHaveBeenCalled();
});

test('hostile destination/avoidance and CPU exhaustion remain conservative', () => {
  const fixture = setup();
  fixture.request.policy.blockedRooms = ['E1S1']; fixture.request.policy.avoidUntil = { E1S0: 21 };
  expect(planExploration(fixture.request,fixture.ports).targets.map(target => target.room)).toEqual(['E0S1']);
  expect(planExploration(fixture.request,fixture.ports,() => false)).toMatchObject({ targets: [], incomplete: 'admission' });
  fixture.request.policy.mode = 'known-safe';
  expect(() => planExploration(fixture.request,fixture.ports)).toThrow('exploration traversal');
});


test('paused demand still validates malformed depth and assignments', () => {
  const fixture = setup();
  fixture.request.maximumTargets = 0;
  fixture.request.budget.depth = 65;
  expect(() => planExploration(fixture.request,fixture.ports)).toThrow('budget');
  fixture.request.budget.depth = 2;
  fixture.request.assigned = ['sim'];
  expect(() => planExploration(fixture.request,fixture.ports)).toThrow('assignment');
  expect(fixture.ports.exits).not.toHaveBeenCalled();
});
