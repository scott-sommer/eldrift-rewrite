import { afterEach, expect, test, vi } from 'vitest';
import { createNativeDispatch } from '../../src/app/native-dispatch';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
const calls = vi.hoisted(() => ({ preflight: vi.fn(() => 0),spawn: vi.fn(() => 0) }));
vi.mock('../../src/adapters/screeps/movement-service',() => ({ createMovementService: () => ({ flush() {} }) }));
vi.mock('../../src/adapters/screeps/controller-actions',() => ({ createNativeControllerActions: () => ({}) }));
vi.mock('../../src/adapters/screeps/structure-actions',() => ({ createNativeStructureActions: () => ({ availableSpawn: () => true,availableEnergy: (_room: string,energy: number) => energy,preflightSpawn: calls.preflight,spawn: calls.spawn }) }));
vi.mock('../../src/adapters/screeps/population',() => ({ populationMemory: () => ({}),observeSpawning: () => ({ rooms: ['W0N1'],slots: [{ id: 'spawn',room: 'W0N1',busy: false }],energy: { W0N1: 300 },names: new Set() }) }));
afterEach(() => vi.unstubAllGlobals());
test('prepared dispatch invokes effectful producer admission once, after physical preflight',() => {
  vi.stubGlobal('Game',{ time: 1 }); vi.stubGlobal('ERR_NOT_OWNER',-1);
  const root = {},state = createMemoryPort(() => root);
  createSpawnQueue(state,'W0N1').submit({ id: 'worker',name: 'worker',owner: 'home',room: 'W0N1',body: ['move'],priority: 0,readyAt: 1,expiresAt: 10 });
  let permits = 0; const admit = vi.fn(() => ++permits === 1);
  const dispatch = createNativeDispatch(state,admit,() => null); dispatch.activate(); dispatch.flush();
  expect(calls.preflight).toHaveBeenCalledTimes(1); expect(admit).toHaveBeenCalledTimes(1); expect(calls.spawn).toHaveBeenCalledTimes(1);
  dispatch.activate(); dispatch.flush(); expect(admit).toHaveBeenCalledTimes(1);
});
