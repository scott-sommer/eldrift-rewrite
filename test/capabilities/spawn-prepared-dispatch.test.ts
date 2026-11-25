import { expect, test } from 'vitest';
import { createSpawnCoordinator } from '../../src/features/population/spawn-coordinator';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import type { SpawnAssignment, UnaffordablePolicy } from '../../src/capabilities/spawning/request';
function fixture(policy: UnaffordablePolicy = 'skip') {
  const root = {},state = createMemoryPort(() => root), queue = createSpawnQueue(state,'W0N1');
  for (const [index,id] of ['first','second'].entries()) queue.submit({ id,name: id,owner: 'home',room: 'W0N1',priority: index,readyAt: 1,expiresAt: 10,body: ['move'] });
  const observation = () => ({ rooms: ['W0N1'],slots: [{ id: 'spawn',room: 'W0N1',busy: false }],energy: { W0N1: 300 },names: new Set<string>() });
  return { root,state,queue,make: (invoke: (assignment: SpawnAssignment) => number,prepare: (assignment: SpawnAssignment) => number) => createSpawnCoordinator(state,{ clock: () => 1,invoke },observation,policy,prepare) };
}
test('wait stops the room after preflight refusal without invoking a native effect',() => {
  const f = fixture('wait'); let effects = 0;
  const receipts = f.make(() => { effects++; return 0; },() => -6)(); expect(receipts).toMatchObject([{ request: 'first',status: 'rejected',code: -6 }]); expect(effects).toBe(0);
});
test.each(['rejected','uncertain'])('an actual %s invocation seals its slot even if observation still reports it free',mode => {
  const f = fixture(); let effects = 0;
  const run = f.make(() => { effects++; if (mode === 'uncertain') throw new Error('unknown effect'); return -10; },() => 0);
  expect(run()).toMatchObject([{ request: 'first',status: mode }]); expect(effects).toBe(1); expect(run()).toEqual([]);
});
test('preflight uncertainty seals its slot and persistent coordinator seal prevents recreation/reentry',() => {
  const f = fixture(); let effects = 0;
  const make = () => f.make(() => { effects++; return 0; },() => { throw new Error('uncertain preparation'); });
  expect(make()()).toMatchObject([{ request: 'first',status: 'uncertain' }]); expect(make()()).toEqual([]); expect(effects).toBe(0);
});
test('reentry during an accepted call observes the durable seal',() => {
  const f = fixture(); let nested: unknown;
  const run = f.make(() => { nested = run(); return 0; },() => 0);
  expect(run()).toMatchObject([{ request: 'first',status: 'accepted' }]); expect(nested).toEqual([]);
});
