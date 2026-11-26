import { afterEach, expect, test, vi } from 'vitest';
import { spawnBoostIdentity } from '../../src/capabilities/spawning/boost';
import { validateRequest, allocateSpawns } from '../../src/capabilities/spawning/allocate';
import { populationMemory } from '../../src/adapters/screeps/population';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { openState } from '../../src/persistence/versioned-state';
import { spawnQueueSchema } from '../../src/features/population/spawn-schema';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
import { applyPopulationDemand } from '../../src/features/population/apply-demand';
const request = (): SpawnRequest => ({ id: 'job',name: 'worker',owner: 'work',room: 'W0N1',home: 'W1N1',priority: 1,readyAt: 1,expiresAt: 20,body: ['work','carry','move'],
  boost: { steps: [{ part: 'work',resource: 'GH2O',count: 1 }],required: true,timeout: 80 } });
afterEach(() => vi.unstubAllGlobals());
test('spawn-carried deadline starts at actual admitted spawn time plus body duration, independently of demand expiry',() => {
  vi.stubGlobal('Game',{ time: 17 }); vi.stubGlobal('CREEP_SPAWN_TIME',3);
  const source = request(), memory = populationMemory(source);
  expect(memory.population).toEqual({ owner: 'work',home: 'W1N1' });
  expect(memory.industryBoostBirth).toEqual({ id: 'birth:["W0N1","job"]' ,owner: 'work',home: 'W1N1',steps: [{ part: 'work',resource: 'GH2O',count: 1 }],required: true,expiresAt: 106 });
  source.boost!.steps[0]!.count = 3;
  expect(memory.industryBoostBirth!.steps[0]!.count).toBe(1);
});
test('unboosted spawns need no new game globals or metadata',() => {
  const source = request(); delete source.boost;
  expect(populationMemory(source)).toEqual({ population: { owner: 'work',home: 'W1N1' } });
});
test('allocation detaches nested steps and rejects impossible part counts or ambiguous policies',() => {
  const source = request();
  const assignment = allocateSpawns([source],[{ id: 'spawn',room: 'W0N1',busy: false }],{ W0N1: 200 },new Set(),1,'wait')[0]!;
  source.boost!.steps[0]!.resource = 'GH'; expect(assignment.request.boost!.steps[0]!.resource).toBe('GH2O');
  for (const count of [0,2,NaN]) { const invalid = request(); invalid.boost!.steps[0]!.count = count; expect(() => validateRequest(invalid)).toThrow('steps'); }
  const conflict = request(); conflict.boost!.steps = [...conflict.boost!.steps,...conflict.boost!.steps]; expect(() => validateRequest(conflict)).toThrow('Conflicting');
  const invalid = request(); invalid.boost!.timeout = 0; expect(() => validateRequest(invalid)).toThrow('policy');
});
test.each([1,2])('legacy spawn schema %s migrates without inventing boost contracts; old readers refuse schema 4',version => {
  const memory = {}, state = createMemoryPort(() => memory), legacy = request(); delete legacy.boost;
  state.write('spawning/W0N1',{ owner: 'population',version,data: { requests: [legacy] } });
  expect(createSpawnQueue(state,'W0N1').list()).toEqual([legacy]); expect(state.read('spawning/W0N1')).toMatchObject({ version: 5 });
  expect(() => openState(state,'spawning/W0N1',{ ...spawnQueueSchema('W0N1'),version: 2 })).toThrow('future');
});
test('a boost contract disguised as old schema refuses migration without changing its bytes',() => {
  const memory = {}, state = createMemoryPort(() => memory);
  state.write('spawning/W0N1',{ owner: 'population',version: 2,data: { requests: [request()] } });
  const before = JSON.stringify(memory); expect(() => createSpawnQueue(state,'W0N1').list()).toThrow('legacy spawn boost'); expect(JSON.stringify(memory)).toBe(before);
});
test('shared population demand preserves producer-selected boost contract through durable queue creation',() => {
  const memory = {}, state = createMemoryPort(() => memory), boost = request().boost!;
  const decision = applyPopulationDemand(state,{ owner: 'work',room: 'W0N1',desired: 1,replacementParts: 3,travelTicks: 0,marginTicks: 0,body: ['work','carry','move'],priority: 1,requestLifetime: 20,boost },[],1);
  expect(decision.created).toHaveLength(1); expect(createSpawnQueue(state,'W0N1').list()[0]!.boost).toEqual(boost);
});

test('independent production rooms cannot collide in birth intake identity when their local request IDs match',() => {
  expect(spawnBoostIdentity({ room: 'W0N1',id: 'same' })).not.toBe(spawnBoostIdentity({ room: 'W1N1',id: 'same' }));
});
