import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { applyPopulationDemand } from '../../src/features/population/apply-demand';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
const plan = () => ({ owner: 'remote',room: 'W0N1',desired: 2,body: ['carry','move'] as const,replacementParts: 2,travelTicks: 10,marginTicks: 5,priority: 1,requestLifetime: 100,
  placement: { spawn: 'chosen',exit: { room: 'W0N1',x: 24,y: 25 } } });
test('ordinary population publication preserves selected placement on every distinct request and snapshots it',() => {
  const root = {},state = createMemoryPort(() => root), input = plan(); applyPopulationDemand(state,input,[],1); input.placement.exit.x = 1;
  const queued = createSpawnQueue(state,'W0N1').list(); expect(queued).toHaveLength(2); expect(new Set(queued.map(request => request.id)).size).toBe(2);
  expect(queued.every(request => request.owner === 'remote' && request.placement?.spawn === 'chosen' && request.placement.exit.x === 24)).toBe(true);
  applyPopulationDemand(state,plan(),[],2); expect(createSpawnQueue(state,'W0N1').list()).toHaveLength(2);
});
test('invalid selected production geometry fails before publishing or reserving an identity',() => {
  const root = {},state = createMemoryPort(() => root), input = plan(); input.placement.exit.room = 'E0N1';
  expect(() => applyPopulationDemand(state,input,[],1)).toThrow('exit'); expect(root).toEqual({});
});
