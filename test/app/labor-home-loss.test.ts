import { afterEach, expect, test, vi } from 'vitest';
import { settleLostLaborHome, createNativeLaborLossFeature } from '../../src/app/native-labor/loss';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createLaborTaskStaging } from '../../src/features/work/stage-labor-task';
import { laborTaskDefinition } from '../../src/features/work/labor-task';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { laborScope } from '../../src/app/native-labor/claims';
import { laborProposalFixture } from '../fixtures/household-labor-proposal';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const f = laborProposalFixture(), ready = f.propose(f.input); if (ready.status !== 'ready') throw new Error('Expected proposal');
  const payload = { proposal: ready.read(),progress: { worker: 'actor',picked: 0,spent: 0,returned: 0,pending: { kind: 'pickup' as const,tick: 10,before: 0,maximum: 3 } } };
  const state = createMemoryPort(() => root), root = {}, staging = createLaborTaskStaging(state); staging.stage(payload.proposal,1,() => true);
  const schema = taskSchema('worker',{ 'household-labor': laborTaskDefinition }), tasks = openState(state,'tasks/worker',schema);
  tasks.queue[0]!.payload = payload; tasks.queue[0]!.phase = 'pickup'; saveState(state,'tasks/worker',schema,tasks);
  const home = { controller: { my: false } }, rooms: Record<string, typeof home> = { W0N1: home };
  const creep = { my: true,id: 'actor',name: 'worker',memory: { population: { owner: 'home',home: 'W0N1' } },body: [],pos: { roomName: 'W0N1',x: 2,y: 1 },store: { energy: 3 },spawning: false } as unknown as Creep;
  const ledger = createQuantityReservations(state), scope = laborScope(payload);
  for (const owner of [scope,'other']) ledger.reserve({ id: owner,owner,holder: 'worker',scope: owner,expiresAt: 26,allocations: [{ pool: owner,amount: 1 }] },{ [owner]: 2 },10);
  vi.stubGlobal('Game',{ time: 11,rooms,creeps: { worker: creep } });
  return { state,staging,home,rooms,creep,ledger,scope };
}
test('empire loss pass settles prior pickup without effects and preserves unrelated ownership',() => {
  const f = fixture(); createNativeLaborLossFeature(f.state,{}).run({} as never);
  expect(f.creep.memory.startupLaborFailure).toMatchObject({ reason: 'labor-home-lost',resolvedAt: 11,picked: 3,spent: 0,returned: 0,retainedEnergy: 3 });
  expect(f.staging.read('worker')?.queue).toEqual([]); expect(f.ledger.list(11).map(claim => claim.id)).toEqual(['other']);
  expect(settleLostLaborHome(f.state,{},f.creep)).toBe(false);
});
test('owned or unseen home and replacement identity defer without retiring the task',() => {
  const f = fixture(); f.home.controller.my = true; expect(settleLostLaborHome(f.state,{},f.creep)).toBe(false);
  delete f.rooms.W0N1; expect(settleLostLaborHome(f.state,{},f.creep)).toBe(false); f.rooms.W0N1 = f.home; f.home.controller.my = false;
  Object.assign(f.creep,{ id: 'replacement' }); expect(settleLostLaborHome(f.state,{},f.creep)).toBe(false);
  expect(f.staging.read('worker')?.queue).toHaveLength(1); expect(f.ledger.list(11)).toHaveLength(2);
});
test('same-tick pending intent waits; later unknown cargo remains an explicit settlement failure',() => {
  const f = fixture(); Game.time = 10; expect(settleLostLaborHome(f.state,{},f.creep)).toBe(false);
  Game.time = 11; f.creep.store.energy = 4; expect(settleLostLaborHome(f.state,{},f.creep)).toBe(true);
  expect(f.creep.memory.startupLaborFailure).toMatchObject({ reason: 'labor-settlement',picked: 0,retainedEnergy: 4 });
});
