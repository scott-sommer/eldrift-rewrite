import { afterEach, expect, test, vi } from 'vitest';
import { createNativeBoostBirths } from '../../src/app/native-boost-births';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createBoostRequests } from '../../src/features/industry/boosts/store';
import { boostRequest } from '../fixtures/boosts';
import { holdsBoostUnit } from '../../src/capabilities/industry/boosts/model';
import type { createNativeDispatch } from '../../src/app/native-dispatch';
function fixture(tick = 1) {
  let memory = {}; const state = createMemoryPort(() => memory), request = boostRequest();
  const { unit,name,...birth } = request;
  const creep = { id: unit,name,spawning: false,memory: { population: { owner: request.owner,home: request.home },industryBoostBirth: birth } } as Creep;
  vi.stubGlobal('Game',{ time: tick,creeps: { [name]: creep } });
  const claim = vi.fn(),holdBody = vi.fn(); const dispatch = { arbiter: { claim },structures: { holdBody } } as unknown as ReturnType<typeof createNativeDispatch>;
  return { state,request,creep,claim,holdBody,adopt: () => createNativeBoostBirths(state,dispatch)(),reset: () => { memory = JSON.parse(JSON.stringify(memory)); } };
}
afterEach(() => vi.unstubAllGlobals());
test('birth contract becomes the same actual unit-bound request before actor scheduling and replay survives reset',() => {
  const f = fixture(), birth = structuredClone(f.creep.memory.industryBoostBirth!);
  f.adopt(); expect(f.claim).not.toHaveBeenCalled(); expect(f.creep.memory.industryBoostBirth).toBeUndefined();
  f.reset(); f.creep.memory.industryBoostBirth = birth; f.adopt();
  expect(createBoostRequests(f.state).read()).toHaveLength(1); expect(createBoostRequests(f.state).get(f.request.owner,f.request.id)!.request).toEqual(f.request);
});
test('late adoption records an expired required outcome rather than releasing the actor or extending the deadline',() => {
  const f = fixture(25); f.adopt(); const store = createBoostRequests(f.state), job = store.get(f.request.owner,f.request.id)!;
  expect(job.status).toBe('expired'); expect(job.request.expiresAt).toBe(20); expect(store.readiness(f.request.owner,f.request.id)).toBe('failed'); expect(holdsBoostUnit(job)).toBe(true);
  store.acknowledge(f.request.owner,f.request.id); expect(holdsBoostUnit(store.get(f.request.owner,f.request.id)!)).toBe(false);
});
test('full outcome queue retains the unadopted metadata and gates the newborn until admission is possible',() => {
  const f = fixture(); const store = createBoostRequests(f.state);
  for (let i = 0; i < 64; i++) store.submit(boostRequest(String(i)),1);
  f.adopt(); expect(f.creep.memory.industryBoostBirth).toBeDefined(); expect(f.claim).toHaveBeenCalledTimes(1); expect(store.read()).toHaveLength(64);
});
test('reassignment does not let stale birth metadata claim the new population owner',() => {
  const f = fixture(); f.creep.memory.population!.owner = 'different'; f.adopt();
  expect(f.claim).not.toHaveBeenCalled(); expect(f.holdBody).not.toHaveBeenCalled();
});

test('another admitted boost for the same actor keeps its existing gate instead of being fenced by waiting birth work',() => {
  const f = fixture(), store = createBoostRequests(f.state);
  store.submit({ ...f.request,id: 'earlier' },1); f.adopt();
  expect(f.creep.memory.industryBoostBirth).toBeDefined(); expect(f.claim).not.toHaveBeenCalled();
  expect(store.read()).toHaveLength(1); expect(store.read()[0]!.request.id).toBe('earlier');
});

test('expired optional birth records failure while permitting the owner to choose ordinary fallback',() => {
  const f = fixture(25); f.creep.memory.industryBoostBirth!.required = false; f.adopt();
  const job = createBoostRequests(f.state).get(f.request.owner,f.request.id)!;
  expect(job.status).toBe('expired'); expect(holdsBoostUnit(job)).toBe(false); expect(f.claim).not.toHaveBeenCalled();
});
