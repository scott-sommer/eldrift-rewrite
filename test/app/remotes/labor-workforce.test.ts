import { afterEach, expect, test, vi } from 'vitest';
import { createNativeLaborWorkforce } from '../../../src/app/remotes/startup/household/labor-workforce';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { startupDeliveryInput } from '../../fixtures/startup-delivery';
import { defaultWorkPolicy } from '../../../src/features/work/policy';
import type { PopulationUnit } from '../../../src/capabilities/spawning/demand';
const controls = vi.hoisted(() => ({ units: [] as PopulationUnit[],select: vi.fn(() => ({ status: 'ready',current: () => true })) }));
vi.mock('../../../src/adapters/screeps/population',() => ({ observePopulation: () => controls.units }));
vi.mock('../../../src/app/remotes/startup/household/labor-selection',() => ({ createNativeLaborSelection: () => controls.select }));
afterEach(() => { vi.unstubAllGlobals(); controls.units = []; controls.select.mockClear(); });
test('missing-worker selection remains read-only and invalidates when roster or queue covers its demand',() => {
  vi.stubGlobal('Game',{ time: 5000,rooms: { W0N1: { name: 'W0N1',controller: { my: true,level: 4 } } } });
  const root = {}, state = createMemoryPort(() => root), base = startupDeliveryInput(); base.project.spawning.room = 'W0N1';
  const seed = { base,endpoint: 'stock',workPolicy: defaultWorkPolicy,laborPolicy: { horizon: 100,maximumLoad: 10,maximumWorkTicks: 2,reserve: 20 },demand: {
    home: 'W0N1',mode: 'builder' as const,enabled: true,budget: 200,recipe: 'balanced' as const,maximumParts: 3,maximumUnits: 2,id: 'worker',placement: { spawn: 'spawn',exit: { room: 'W0N1',x: 14,y: 15 } },replacementTravel: 0,replacementMargin: 0,
  } };
  const prepare = createNativeLaborWorkforce(state,4000);
  expect(prepare(seed,1,() => false)).toMatchObject({ reason: 'admission' }); expect(controls.select).not.toHaveBeenCalled();
  const ready = prepare(seed,1); if (ready.status !== 'ready') throw new Error('Expected workforce candidate');
  expect(ready.current()).toBe(true); expect(root).toEqual({});
  seed.demand.budget = 0; expect(ready.current()).toBe(true);
  controls.units = [{ name: 'arrived',owner: 'work:W0N1:builder',room: 'W0N1',spawning: false,ticksToLive: 100 }]; expect(ready.current()).toBe(false);
  controls.units = [];
  state.write('spawning/W0N1',{ owner: 'population',version: 3,data: { requests: [{ id: 'queued',name: 'queued',owner: 'work:W0N1:builder',room: 'W0N1',body: ['work','carry','move'],priority: 5,readyAt: 5000,expiresAt: 5100 }] } });
  const before = JSON.stringify(root); expect(ready.current()).toBe(false); expect(JSON.stringify(root)).toBe(before);
});
