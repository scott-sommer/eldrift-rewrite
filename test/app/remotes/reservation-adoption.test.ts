import { afterEach, expect, test, vi } from 'vitest';
import { reservationManagementFixture } from '../../fixtures/reservation-management';
import { reservationOwner } from '../../../src/features/remotes/reservation/identity';
import { adoptReservationWorkers } from '../../../src/app/remotes/reservation/population/adoption';
import { openState, saveState } from '../../../src/persistence/versioned-state';
import { taskSchema } from '../../../src/persistence/tasks/schema';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const f = reservationManagementFixture(), oldOwner = f.plan.owner;
  const owner = reservationOwner({ home: 'W0N1',room: 'E0N1',generation: 2 });
  const plan = { ...f.plan,owner,demand: { ...f.plan.demand,generation: 2 } };
  const creep = { name: 'returned',my: true,spawning: false,pos: { roomName: 'W0N1' },ticksToLive: 500,
    body: plan.quote.body.parts.map(type => ({ type,hits: 100 })),memory: { population: { home: 'W0N1',owner: oldOwner },unrelated: 'keep' } } as unknown as Creep;
  vi.stubGlobal('Game',{ time: 20,creeps: { returned: creep } });
  const definitions = { foreign: { phases: ['work'],validPayload: () => true } };
  const run = (guard = () => true) => adoptReservationWorkers(f.state,[plan],definitions,guard);
  return { ...f,plan,creep,oldOwner,definitions,run };
}
test('a healthy idle home-returned reserver accepts only a newer admitted generation',() => {
  const f = fixture(); expect(f.run()).toBe(true);
  expect(f.creep.memory.population).toEqual({ home: 'W0N1',owner: f.plan.owner });
  expect(Reflect.get(f.creep.memory,'unrelated')).toBe('keep');
});
test('away, spawning, damaged, retiring, future-generation and foreign-task workers are not rebound',() => {
  const mutations = [
    (f: ReturnType<typeof fixture>) => { f.creep.pos.roomName = 'E0N1'; },
    (f: ReturnType<typeof fixture>) => { f.creep.spawning = true; },
    (f: ReturnType<typeof fixture>) => { f.creep.body[0]!.hits = 0; },
    (f: ReturnType<typeof fixture>) => { f.creep.ticksToLive = 20; },
    (f: ReturnType<typeof fixture>) => { f.creep.memory.population!.owner = reservationOwner({ home: 'W0N1',room: 'E0N1',generation: 3 }); },
    (f: ReturnType<typeof fixture>) => {
      const schema = taskSchema(f.creep.name,f.definitions), record = openState(f.state,'tasks/'+f.creep.name,schema);
      record.queue.push({ id: 'other',kind: 'foreign',phase: 'work',payload: {},wakeAt: 1,retries: 0,expiresAt: 100 }); saveState(f.state,'tasks/'+f.creep.name,schema,record);
    },
  ];
  for (const mutate of mutations) { const f = fixture(); mutate(f); const before = structuredClone(f.creep.memory); f.run(); expect(f.creep.memory).toEqual(before); }
});
test('CPU refusal leaves population ownership and task state untouched',() => {
  const f = fixture(), before = structuredClone(f.root); expect(f.run(() => false)).toBe(false);
  expect(f.creep.memory.population!.owner).toBe(f.oldOwner); expect(f.root).toEqual(before);
});
