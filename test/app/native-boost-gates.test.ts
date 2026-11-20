import { afterEach, expect, test, vi } from 'vitest';
import { createNativeBoosts } from '../../src/app/native-boosts';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createBoostRequests } from '../../src/features/industry/boosts/store';
import { boostRequest } from '../fixtures/boosts';
import { boostScope } from '../../src/capabilities/industry/boosts/model';
import { defaults } from '../../src/config/model';
import type { createNativeDispatch } from '../../src/app/native-dispatch';
afterEach(() => vi.unstubAllGlobals());
test('native actor gates use the action adapter name key after checking the native identity',() => {
  const memory = {}, state = createMemoryPort(() => memory), store = createBoostRequests(state), request = boostRequest();
  store.submit(request,1); store.update(request.owner,request.id,job => { job.status = 'failed'; job.reason = 'required'; });
  const creep = { id: request.unit,name: request.name,my: true,spawning: false,memory: { population: { owner: request.owner,home: request.home } },body: [] };
  vi.stubGlobal('Game',{ time: 1,creeps: {},getObjectById: () => creep });
  const claim = vi.fn(() => true), holdBody = vi.fn(() => true);
  const dispatch = { arbiter: { claim },structures: { holdBody } } as unknown as ReturnType<typeof createNativeDispatch>;
  const gate = createNativeBoosts(state,dispatch,() => defaults,{ reportFailure: error => { throw error; } });
  gate.run(); expect(claim).toHaveBeenCalledWith(request.name,boostScope(request)); expect(holdBody).toHaveBeenCalledWith(creep,boostScope(request));
  store.acknowledge(request.owner,request.id); Game.time++; gate.run(); expect(claim).toHaveBeenCalledTimes(1);
});

test('a request pointing at a structure becomes a failed boost without claiming another actor',() => {
  const memory = {}, state = createMemoryPort(() => memory), store = createBoostRequests(state), request = boostRequest();
  store.submit(request,1); vi.stubGlobal('Game',{ time: 1,creeps: {},getObjectById: () => ({ my: true,structureType: 'lab' }) });
  const claim = vi.fn(), failure = vi.fn();
  const dispatch = { arbiter: { claim },structures: {} } as unknown as ReturnType<typeof createNativeDispatch>;
  createNativeBoosts(state,dispatch,() => defaults,{ reportFailure: failure }).run();
  expect(store.readiness(request.owner,request.id)).toBe('failed'); expect(claim).not.toHaveBeenCalled(); expect(failure).not.toHaveBeenCalled();
});
